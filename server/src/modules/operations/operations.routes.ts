import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { Router } from 'express';
import type { Request } from 'express';
import { requireDatabase } from '../../middleware/require-database.js';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../../middleware/require-auth.js';
import { AppError } from '../../utils/app-error.js';
import { AuditLogModel } from '../audit-logs/audit-log.model.js';
import { PatientModel } from '../patients/patient.model.js';
import { DepartmentModel } from '../public-directory/department.model.js';
import { DoctorModel } from '../public-directory/doctor.model.js';
import { isValidTimeZone } from '../appointments/availability.js';

export const operationsRouter = Router();
const admins = requireRoles('SUPER_ADMIN', 'ADMIN');
const patientStaff = requireRoles('SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'PATIENT');
const departmentInput = z.object({ name: z.string().trim().min(2).max(100), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100), summary: z.string().trim().min(10).max(320), iconKey: z.enum(['heart', 'pulse', 'stethoscope']), sortOrder: z.number().int().min(0).max(10000), isPublic: z.boolean(), status: z.enum(['ACTIVE', 'INACTIVE']) }).strict();
const weeklyAvailabilityInput = z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).strict().refine((window) => window.startTime < window.endTime, 'End time must be after start time.')).max(7).refine((windows) => new Set(windows.map((window) => window.dayOfWeek)).size === windows.length, 'Each weekday can have only one availability window.');
const doctorInput = z.object({ displayName: z.string().trim().min(2).max(100), specialty: z.string().trim().min(2).max(100), departmentId: z.string().regex(/^[a-f\d]{24}$/i).optional(), qualification: z.string().trim().min(2).max(160), experienceYears: z.number().int().min(0).max(80), biography: z.string().trim().max(600).optional(), availabilityTimeZone: z.string().trim().min(1).max(64).optional(), weeklyAvailability: weeklyAvailabilityInput.optional(), isPublic: z.boolean(), status: z.enum(['ACTIVE', 'INACTIVE']) }).strict();
const patientInput = z.object({ firstName: z.string().trim().min(1).max(60), lastName: z.string().trim().min(1).max(60), phone: z.string().trim().max(30).optional(), email: z.email().max(254).optional(), dateOfBirth: z.iso.datetime().optional(), gender: z.enum(['FEMALE', 'MALE', 'NON_BINARY', 'UNDISCLOSED']).optional(), bloodGroup: z.enum(['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN']).optional(), allergies: z.array(z.string().trim().min(1).max(100)).max(30).optional(), emergencyContact: z.object({ name: z.string().trim().min(1).max(120), relationship: z.string().trim().min(1).max(60), phone: z.string().trim().min(5).max(30) }).strict().optional(), status: z.enum(['ACTIVE', 'INACTIVE']).optional() }).strict();
const patientAdministrativeUpdate = z.object({ firstName: patientInput.shape.firstName.optional(), lastName: patientInput.shape.lastName.optional(), phone: patientInput.shape.phone }).strict().refine((input) => Object.keys(input).length > 0);

function body<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new AppError(422, 'VALIDATION_ERROR', 'Review the provided fields and try again.');
  return result.data;
}
async function audit(request: Request, action: string, type: string, id: mongoose.Types.ObjectId) {
  if (!request.authUser) return;
  await AuditLogModel.create({ hospitalId: new mongoose.Types.ObjectId(request.authUser.hospitalId), actorId: new mongoose.Types.ObjectId(request.authUser.id), action, resourceType: type, resourceId: id, ...(request.id !== undefined ? { requestId: String(request.id) } : {}) });
}
function paging(query: Record<string, unknown>) {
  const page = Math.max(1, Math.min(100000, Number(query.page) || 1));
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
  return { page, limit, skip: (page - 1) * limit };
}

operationsRouter.use(requireDatabase, requireAuth);
operationsRouter.get('/departments', requireRoles('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN'), async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const filter = { hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId), ...(req.query.status === 'INACTIVE' ? { status: 'INACTIVE' as const } : {}) };
  const [items, total] = await Promise.all([DepartmentModel.find(filter).sort({ sortOrder: 1, name: 1 }).skip(skip).limit(limit).lean(), DepartmentModel.countDocuments(filter)]);
  res.json({ data: { items: items.map(({ _id, ...item }) => ({ id: _id.toString(), ...item })), page, limit, total } });
});
operationsRouter.post('/departments', admins, async (req, res) => {
  const data = body(departmentInput, req.body);
  const item = await new DepartmentModel({ ...data, hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId) }).save();
  await audit(req, 'DEPARTMENT_CREATED', 'DEPARTMENT', item._id);
  res.status(201).json({ data: { id: item.id, name: item.name, slug: item.slug } });
});
operationsRouter.patch('/departments/:id', admins, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'NOT_FOUND', 'Department not found.');
  const item = await DepartmentModel.findOneAndUpdate({ _id: req.params.id, hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId) }, body(departmentInput.partial(), req.body), { new: true, runValidators: true });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Department not found.');
  await audit(req, 'DEPARTMENT_UPDATED', 'DEPARTMENT', item._id);
  res.json({ data: { id: item.id, name: item.name, slug: item.slug, status: item.status, isPublic: item.isPublic } });
});

operationsRouter.get('/doctors', requireRoles('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE', 'PATIENT'), async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : '';
  const filter = { hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId), ...(req.authUser!.role === 'PATIENT' ? { isPublic: true, status: 'ACTIVE' as const } : req.query.status === 'INACTIVE' ? { status: 'INACTIVE' as const } : {}), ...(search ? { displayName: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' as const } } : {}) };
  const [items, total] = await Promise.all([DoctorModel.find(filter).sort({ displayName: 1 }).skip(skip).limit(limit).lean(), DoctorModel.countDocuments(filter)]);
  res.json({ data: { items: items.map(({ _id, ...item }) => ({ id: _id.toString(), ...item })), page, limit, total } });
});
operationsRouter.post('/doctors', admins, async (req, res) => {
  const data = body(doctorInput, req.body);
  if (!isValidTimeZone(data.availabilityTimeZone ?? 'UTC')) throw new AppError(422, 'INVALID_TIME_ZONE', 'Choose a valid doctor availability time zone.');
  if (data.departmentId && !await DepartmentModel.exists({ _id: data.departmentId, hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId) })) throw new AppError(422, 'INVALID_DEPARTMENT', 'Select a department in this hospital.');
  const item = await new DoctorModel({ ...data, availabilityTimeZone: data.availabilityTimeZone ?? 'UTC', ...(data.departmentId ? { departmentId: new mongoose.Types.ObjectId(data.departmentId) } : {}), hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId) }).save();
  await audit(req, 'DOCTOR_PROFILE_CREATED', 'DOCTOR', item._id);
  res.status(201).json({ data: { id: item.id, displayName: item.displayName } });
});
operationsRouter.patch('/doctors/:id', admins, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'NOT_FOUND', 'Doctor not found.');
  const data = body(doctorInput.partial(), req.body);
  if (data.availabilityTimeZone && !isValidTimeZone(data.availabilityTimeZone)) throw new AppError(422, 'INVALID_TIME_ZONE', 'Choose a valid doctor availability time zone.');
  if (data.departmentId && !await DepartmentModel.exists({ _id: data.departmentId, hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId) })) throw new AppError(422, 'INVALID_DEPARTMENT', 'Select a department in this hospital.');
  const { departmentId, ...update } = data;
  const item = await DoctorModel.findOneAndUpdate({ _id: req.params.id, hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId) }, { ...update, ...(departmentId ? { departmentId: new mongoose.Types.ObjectId(departmentId) } : {}) }, { new: true, runValidators: true });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Doctor not found.');
  await audit(req, 'DOCTOR_PROFILE_UPDATED', 'DOCTOR', item._id);
  res.json({ data: { id: item.id, displayName: item.displayName, status: item.status } });
});

operationsRouter.get('/patients', patientStaff, async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : '';
  const filter = { hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId), ...(req.query.status === 'INACTIVE' ? { status: 'INACTIVE' as const } : {}), ...(req.authUser!.role === 'PATIENT' ? { userId: new mongoose.Types.ObjectId(req.authUser!.id) } : {}), ...(search && req.authUser!.role !== 'PATIENT' ? { $or: ['firstName', 'lastName', 'patientNumber'].map((key) => ({ [key]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' as const } })) } : {}) };
  const [items, total] = await Promise.all([PatientModel.find(filter).select('patientNumber firstName lastName phone status createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), PatientModel.countDocuments(filter)]);
  res.json({ data: { items: items.map(({ _id, ...item }) => ({ id: _id.toString(), ...item })), page, limit, total } });
});
operationsRouter.post('/patients', requireRoles('SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'), async (req, res) => {
  const data = body(patientInput, req.body);
  const patientNumber = `PT-${randomBytes(6).toString('hex').toUpperCase()}`;
  const { dateOfBirth, ...patientData } = data;
  const item = await new PatientModel({ ...patientData, ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}), hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId), patientNumber }).save();
  await audit(req, 'PATIENT_REGISTERED_BY_STAFF', 'PATIENT', item._id);
  res.status(201).json({ data: { id: item.id, patientNumber: item.patientNumber, firstName: item.firstName, lastName: item.lastName } });
});
operationsRouter.get('/patients/:id', patientStaff, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'NOT_FOUND', 'Patient not found.');
  const filter = { _id: req.params.id, hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId), ...(req.authUser!.role === 'PATIENT' ? { userId: new mongoose.Types.ObjectId(req.authUser!.id) } : {}) };
  const item = await PatientModel.findOne(filter).select('-__v').lean();
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Patient not found.');
  await audit(req, 'PATIENT_PROFILE_VIEWED', 'PATIENT', item._id);
  const { _id, ...patient } = item;
  res.json({ data: { id: _id.toString(), ...patient } });
});
operationsRouter.patch('/patients/:id', requireRoles('SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'NOT_FOUND', 'Patient not found.');
  const data = body(patientAdministrativeUpdate, req.body);
  const item = await PatientModel.findOneAndUpdate({ _id: req.params.id, hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId) }, data, { new: true, runValidators: true }).select('patientNumber firstName lastName status').lean();
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Patient not found.');
  await audit(req, 'PATIENT_PROFILE_UPDATED', 'PATIENT', item._id);
  res.json({ data: { id: item._id.toString(), patientNumber: item.patientNumber, firstName: item.firstName, lastName: item.lastName, status: item.status } });
});
