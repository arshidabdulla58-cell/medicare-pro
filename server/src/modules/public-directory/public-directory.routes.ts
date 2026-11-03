import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import mongoose from 'mongoose';
import { ContactMessageModel } from './contact-message.model.js';
import { DepartmentModel } from './department.model.js';
import { DoctorModel } from './doctor.model.js';
import { env } from '../../config/env.js';
import { requireDatabase } from '../../middleware/require-database.js';
import { AppError } from '../../utils/app-error.js';

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(254),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  topic: z.enum(['GENERAL', 'APPOINTMENT', 'FEEDBACK']),
  message: z.string().trim().min(10).max(2000),
}).strict();

const contactLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false });

export const publicDirectoryRouter = Router();

publicDirectoryRouter.get('/departments', requireDatabase, async (_request, response) => {
  const hospitalId = new mongoose.Types.ObjectId(env.HOSPITAL_ID);
  const departments = await DepartmentModel.find({ hospitalId, isPublic: true, status: 'ACTIVE' })
    .sort({ sortOrder: 1, name: 1 })
    .select('name slug summary iconKey')
    .limit(100)
    .lean();

  response.json({ data: departments.map((department) => ({ ...department, id: department._id.toString(), _id: undefined })) });
});

publicDirectoryRouter.get('/doctors', requireDatabase, async (_request, response) => {
  const hospitalId = new mongoose.Types.ObjectId(env.HOSPITAL_ID);
  const doctors = await DoctorModel.find({ hospitalId, isPublic: true, status: 'ACTIVE' })
    .sort({ displayName: 1 })
    .select('displayName specialty departmentId qualification experienceYears biography')
    .populate({
      path: 'departmentId',
      match: { hospitalId, isPublic: true, status: 'ACTIVE' },
      select: 'name',
    })
    .limit(100)
    .lean();

  response.json({ data: doctors.map((doctor) => {
    const department = doctor.departmentId as unknown as { name?: string } | null;
    return {
      id: doctor._id.toString(),
      displayName: doctor.displayName,
      specialty: doctor.specialty,
      ...(department?.name ? { departmentName: department.name } : {}),
      qualification: doctor.qualification,
      experienceYears: doctor.experienceYears,
      ...(doctor.biography ? { biography: doctor.biography } : {}),
    };
  }) });
});

publicDirectoryRouter.post('/contact', contactLimiter, async (request, response) => {
  const parsed = contactSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Review the highlighted fields and try again.',
        issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
      },
      requestId: request.id,
    });
    return;
  }

  const reference = `MC-${randomBytes(5).toString('hex').toUpperCase()}`;
  if (mongoose.connection.readyState !== 1) throw new AppError(503, 'DATABASE_UNAVAILABLE', 'The service is temporarily unavailable while the database reconnects.');
  await ContactMessageModel.create({ ...parsed.data, hospitalId: new mongoose.Types.ObjectId(env.HOSPITAL_ID), reference });
  response.status(201).json({ data: { reference } });
});
