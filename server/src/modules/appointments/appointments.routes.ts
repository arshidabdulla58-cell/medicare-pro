import mongoose from 'mongoose';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireDatabase } from '../../middleware/require-database.js';
import { AppError } from '../../utils/app-error.js';
import { AuditLogModel } from '../audit-logs/audit-log.model.js';
import { DoctorModel } from '../public-directory/doctor.model.js';
import { PatientModel } from '../patients/patient.model.js';
import { AppointmentModel, AppointmentSlotModel, type AppointmentRecord } from './appointment.model.js';
import { enumerateAvailableSlots, isWithinAvailability } from './availability.js';
import { saveAppointmentNotification, publishNotification } from '../notifications/notifications.js';

export const appointmentsRouter = Router();
const bookingInput = z.object({ patientId: z.string().regex(/^[a-f\d]{24}$/i).optional(), doctorId: z.string().regex(/^[a-f\d]{24}$/i), startsAt: z.iso.datetime(), timeZone: z.string().trim().min(1).max(64), reason: z.string().trim().max(500).optional() }).strict();
const statusInput = z.object({ status: z.enum(['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']) }).strict();
const terminal = new Set(['COMPLETED', 'CANCELLED', 'NO_SHOW']);
const transitions: Record<string, string[]> = { PENDING: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'], CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'], CHECKED_IN: ['IN_PROGRESS', 'CANCELLED'], IN_PROGRESS: ['COMPLETED'] };

appointmentsRouter.use(requireDatabase, requireAuth);

appointmentsRouter.get('/availability', async (req, res) => {
  if (!mongoose.isValidObjectId(req.query.doctorId)) throw new AppError(422, 'VALIDATION_ERROR', 'Choose a valid doctor.');
  const days = Number(req.query.days ?? 14);
  if (!Number.isInteger(days) || days < 1 || days > 31) throw new AppError(422, 'VALIDATION_ERROR', 'Availability can be requested for 1 to 31 days.');
  const hospitalId = new mongoose.Types.ObjectId(req.authUser!.hospitalId);
  const doctorFilter = { _id: req.query.doctorId, hospitalId, status: 'ACTIVE' as const, ...(req.authUser!.role === 'PATIENT' ? { isPublic: true } : {}) };
  const doctor = await DoctorModel.findOne(doctorFilter).select('availabilityTimeZone weeklyAvailability').lean();
  if (!doctor) throw new AppError(404, 'DOCTOR_NOT_FOUND', 'Doctor not found.');
  const timeZone = doctor.availabilityTimeZone ?? 'UTC';
  const from = new Date();
  const to = new Date(from.getTime() + days * 24 * 60 * 60_000);
  const reservations = await AppointmentSlotModel.find({ hospitalId, doctorId: doctor._id, startsAt: { $gte: from, $lt: to } }).select('startsAt').lean();
  const reservedTimes = new Set(reservations.map((slot) => slot.startsAt.getTime()));
  const slots = enumerateAvailableSlots(from, days, timeZone, doctor.weeklyAvailability ?? [], reservedTimes).map((startsAt) => ({ startsAt: startsAt.toISOString(), endsAt: new Date(startsAt.getTime() + 30 * 60_000).toISOString(), timeZone }));
  res.json({ data: { doctor: { id: doctor._id.toString(), timeZone }, slots } });
});

appointmentsRouter.get('/', async (req, res) => {
  if (!['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST', 'PATIENT'].includes(req.authUser!.role)) throw new AppError(403, 'PERMISSION_DENIED', 'You do not have permission to view these appointments.');
  const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 25));
  const hospitalId = new mongoose.Types.ObjectId(req.authUser!.hospitalId);
  const statusResult = req.query.status === undefined ? undefined : z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).safeParse(req.query.status);
  if (statusResult && !statusResult.success) throw new AppError(422, 'VALIDATION_ERROR', 'Choose a valid appointment status filter.');
  const status = statusResult?.success ? statusResult.data as AppointmentRecord['status'] : undefined;
  const patientFilter = req.authUser!.role === 'PATIENT' ? await patientIdForUser(req.authUser!.id, hospitalId) : undefined;
  const filter = { hospitalId, ...(patientFilter ? { patientId: patientFilter } : {}), ...(status ? { status } : {}) };
  const [items, total] = await Promise.all([
    AppointmentModel.find(filter).populate('patientId', 'patientNumber firstName lastName').populate('doctorId', 'displayName specialty').sort({ startsAt: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    AppointmentModel.countDocuments(filter),
  ]);
  res.json({ data: { items: items.map(({ _id, patientId, doctorId, ...item }) => ({ id: _id.toString(), patient: patientId, doctor: doctorId, ...item })), page, limit, total } });
});

appointmentsRouter.post('/', async (req, res) => {
  const parsed = bookingInput.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'VALIDATION_ERROR', 'Review the appointment details and try again.');
  const data = parsed.data;
  const startAt = new Date(data.startsAt);
  let localMinute: number;
  try {
    localMinute = Number(new Intl.DateTimeFormat('en', { timeZone: data.timeZone, minute: '2-digit' }).format(startAt));
  } catch {
    throw new AppError(422, 'INVALID_TIME_ZONE', 'Choose a valid time zone for this appointment.');
  }
  if (!Number.isFinite(startAt.getTime()) || startAt.getTime() <= Date.now() || startAt.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000 || startAt.getUTCSeconds() !== 0 || startAt.getUTCMilliseconds() !== 0 || localMinute % 30 !== 0) {
    throw new AppError(422, 'INVALID_APPOINTMENT_TIME', 'Choose a future 30-minute appointment slot within the next year.');
  }
  const hospitalId = new mongoose.Types.ObjectId(req.authUser!.hospitalId);
  const doctorId = new mongoose.Types.ObjectId(data.doctorId);
  const doctor = await DoctorModel.findOne({ _id: doctorId, hospitalId, status: 'ACTIVE' }).select('_id availabilityTimeZone weeklyAvailability').lean();
  if (!doctor) throw new AppError(422, 'INVALID_DOCTOR', 'Select an active doctor in this hospital.');
  const timeZone = doctor.availabilityTimeZone ?? 'UTC';
  if (data.timeZone !== timeZone || !isWithinAvailability(startAt, timeZone, doctor.weeklyAvailability ?? [])) throw new AppError(409, 'DOCTOR_NOT_AVAILABLE', 'That time is outside the doctor’s configured availability. Choose an available slot.');
  let patientId: mongoose.Types.ObjectId;
  if (req.authUser!.role === 'PATIENT') {
    patientId = await patientIdForUser(req.authUser!.id, hospitalId);
  } else {
    if (!['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'].includes(req.authUser!.role)) throw new AppError(403, 'PERMISSION_DENIED', 'You cannot book appointments.');
    if (!data.patientId) throw new AppError(422, 'PATIENT_REQUIRED', 'Choose the patient for this appointment.');
    patientId = new mongoose.Types.ObjectId(data.patientId);
  }
  if (!await PatientModel.exists({ _id: patientId, hospitalId, status: 'ACTIVE' })) throw new AppError(422, 'INVALID_PATIENT', 'Select an active patient in this hospital.');

  const appointmentId = new mongoose.Types.ObjectId();
  let notificationRoom: string | undefined;
  const appointment = { _id: appointmentId, hospitalId, patientId, doctorId, startsAt: startAt, endsAt: new Date(startAt.getTime() + 30 * 60_000), timeZone, status: 'PENDING' as const, ...(data.reason ? { reason: data.reason } : {}), createdById: new mongoose.Types.ObjectId(req.authUser!.id) };
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await AppointmentSlotModel.create([{ hospitalId, doctorId, startsAt: startAt, appointmentId }], { session });
      await AppointmentModel.create([appointment], { session });
      notificationRoom = await saveAppointmentNotification(hospitalId, patientId, appointmentId, 'PENDING', session);
      await AuditLogModel.create([{ hospitalId, actorId: new mongoose.Types.ObjectId(req.authUser!.id), action: 'APPOINTMENT_BOOKED', resourceType: 'APPOINTMENT', resourceId: appointmentId, ...(req.id !== undefined ? { requestId: String(req.id) } : {}) }], { session });
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) throw new AppError(409, 'APPOINTMENT_SLOT_TAKEN', 'That doctor already has an appointment at this time. Choose another slot.');
    throw error;
  } finally {
    await session.endSession();
  }
  publishNotification(notificationRoom);
  res.status(201).json({ data: { id: appointmentId.toString(), patientId: patientId.toString(), doctorId: doctorId.toString(), startsAt: startAt.toISOString(), endsAt: appointment.endsAt.toISOString(), timeZone, status: appointment.status } });
});

appointmentsRouter.patch('/:id/status', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'NOT_FOUND', 'Appointment not found.');
  const parsed = statusInput.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'VALIDATION_ERROR', 'Choose a valid appointment status.');
  const hospitalId = new mongoose.Types.ObjectId(req.authUser!.hospitalId);
  const filter = { _id: req.params.id, hospitalId, ...(req.authUser!.role === 'PATIENT' ? { patientId: await patientIdForUser(req.authUser!.id, hospitalId) } : {}) };
  if (!['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST', 'PATIENT'].includes(req.authUser!.role)) throw new AppError(403, 'PERMISSION_DENIED', 'You cannot change this appointment.');
  if (req.authUser!.role === 'PATIENT' && parsed.data.status !== 'CANCELLED') throw new AppError(403, 'PERMISSION_DENIED', 'Patients may only cancel their own appointments.');
  const session = await mongoose.startSession();
  let updated: { id: string; status: string } | undefined;
  let notificationRoom: string | undefined;
  try {
    await session.withTransaction(async () => {
      const appointment = await AppointmentModel.findOne(filter).session(session);
      if (!appointment) throw new AppError(404, 'NOT_FOUND', 'Appointment not found.');
      if (terminal.has(appointment.status) || !transitions[appointment.status]?.includes(parsed.data.status)) throw new AppError(409, 'INVALID_STATUS_TRANSITION', `Cannot change an appointment from ${appointment.status} to ${parsed.data.status}.`);
      appointment.status = parsed.data.status;
      await appointment.save({ session });
      notificationRoom = await saveAppointmentNotification(hospitalId, appointment.patientId, appointment._id, appointment.status, session);
      if (parsed.data.status === 'CANCELLED') await AppointmentSlotModel.deleteOne({ appointmentId: appointment._id, hospitalId }).session(session);
      await AuditLogModel.create([{ hospitalId, actorId: new mongoose.Types.ObjectId(req.authUser!.id), action: `APPOINTMENT_${parsed.data.status}`, resourceType: 'APPOINTMENT', resourceId: appointment._id, ...(req.id !== undefined ? { requestId: String(req.id) } : {}) }], { session });
      updated = { id: appointment.id, status: appointment.status };
    });
  } finally {
    await session.endSession();
  }
  if (!updated) throw new AppError(500, 'APPOINTMENT_UPDATE_FAILED', 'The appointment could not be updated.');
  res.json({ data: updated });
  publishNotification(notificationRoom);
});

async function patientIdForUser(userId: string, hospitalId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId> {
  const patient = await PatientModel.findOne({ hospitalId, userId: new mongoose.Types.ObjectId(userId), status: 'ACTIVE' }).select('_id').lean();
  if (!patient) throw new AppError(403, 'PATIENT_PROFILE_REQUIRED', 'Your account needs a linked patient profile before booking. Contact reception for help.');
  return patient._id;
}
