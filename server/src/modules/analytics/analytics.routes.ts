import mongoose from 'mongoose';
import { Router } from 'express';
import { z } from 'zod';
import { requireDatabase } from '../../middleware/require-database.js';
import { requireAuth, requireRoles } from '../../middleware/require-auth.js';
import { AppError } from '../../utils/app-error.js';
import { AppointmentModel } from '../appointments/appointment.model.js';
import { PatientModel } from '../patients/patient.model.js';
import { DepartmentModel } from '../public-directory/department.model.js';
import { DoctorModel } from '../public-directory/doctor.model.js';
import { AuditLogModel } from '../audit-logs/audit-log.model.js';

export const analyticsRouter = Router();
analyticsRouter.use(requireDatabase, requireAuth, requireRoles('SUPER_ADMIN', 'ADMIN'));

analyticsRouter.get('/activity', async (req, res) => {
  const parsed = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).strict().safeParse(req.query);
  if (!parsed.success) throw new AppError(422, 'VALIDATION_ERROR', 'Choose a valid activity page.');
  const { page } = parsed.data;
  const filter = { hospitalId: new mongoose.Types.ObjectId(req.authUser!.hospitalId) };
  const limit = 10;
  const [items, total] = await Promise.all([
    AuditLogModel.find(filter).select('action resourceType timestamp').sort({ timestamp: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLogModel.countDocuments(filter),
  ]);
  res.json({ data: { items: items.map((item) => ({ id: item._id.toString(), action: item.action, resourceType: item.resourceType, timestamp: item.timestamp })), page, limit, total } });
});

analyticsRouter.get('/dashboard', async (req, res) => {
  const parsed = z.coerce.number().int().min(7).max(90).safeParse(req.query.days ?? '30');
  if (!parsed.success) throw new AppError(422, 'VALIDATION_ERROR', 'Choose a dashboard range between 7 and 90 days.');
  const days = parsed.data;
  const hospitalId = new mongoose.Types.ObjectId(req.authUser!.hospitalId);
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setUTCHours(0, 0, 0, 0);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (days - 1));
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  const [totalPatients, totalDoctors, activeDepartments, todayAppointments, pendingAppointments, trend, departmentDoctors, upcoming] = await Promise.all([
    PatientModel.countDocuments({ hospitalId, status: 'ACTIVE' }),
    DoctorModel.countDocuments({ hospitalId, status: 'ACTIVE' }),
    DepartmentModel.countDocuments({ hospitalId, status: 'ACTIVE' }),
    AppointmentModel.countDocuments({ hospitalId, startsAt: { $gte: todayStart, $lt: tomorrowStart }, status: { $nin: ['CANCELLED', 'NO_SHOW'] } }),
    AppointmentModel.countDocuments({ hospitalId, status: 'PENDING', startsAt: { $gte: now } }),
    AppointmentModel.aggregate<{ date: string; count: number }>([
      { $match: { hospitalId, startsAt: { $gte: rangeStart, $lt: tomorrowStart }, status: { $nin: ['CANCELLED', 'NO_SHOW'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$startsAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $project: { _id: 0, date: '$_id', count: 1 } }, { $sort: { date: 1 } },
    ]),
    DoctorModel.aggregate<{ _id: mongoose.Types.ObjectId; doctors: number }>([
      { $match: { hospitalId, status: 'ACTIVE', departmentId: { $exists: true } } },
      { $group: { _id: '$departmentId', doctors: { $sum: 1 } } },
    ]),
    AppointmentModel.find({ hospitalId, startsAt: { $gte: now }, status: { $nin: ['CANCELLED', 'NO_SHOW'] } })
      .populate('patientId', 'patientNumber firstName lastName')
      .populate('doctorId', 'displayName specialty')
      .sort({ startsAt: 1 }).limit(6).lean(),
  ]);
  const departments = departmentDoctors.length
    ? await DepartmentModel.find({ hospitalId, _id: { $in: departmentDoctors.map(({ _id }) => _id) }, status: 'ACTIVE' }).select('name').lean()
    : [];
  const departmentName = new Map(departments.map(({ _id, name }) => [_id.toString(), name]));
  const departmentStats = departmentDoctors.map(({ _id, doctors }) => ({ name: departmentName.get(_id.toString()) ?? 'Other', doctors })).sort((a, b) => b.doctors - a.doctors).slice(0, 8);
  const appointmentTrend = Array.from({ length: days }, (_, index) => {
    const date = new Date(rangeStart);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: trend.find((item) => item.date === key)?.count ?? 0 };
  });
  res.json({ data: {
    range: { days, from: rangeStart.toISOString(), to: tomorrowStart.toISOString() },
    metrics: { totalPatients, totalDoctors, activeDepartments, todayAppointments, pendingAppointments },
    appointmentTrend,
    departmentStats,
    upcomingAppointments: upcoming.map(({ _id, patientId, doctorId, startsAt, endsAt, timeZone, status }) => ({ id: _id.toString(), patient: patientId, doctor: doctorId, startsAt, endsAt, timeZone, status })),
  } });
});
