import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { AppointmentModel } from '../appointments/appointment.model.js';
import { DepartmentModel } from '../public-directory/department.model.js';
import { DoctorModel } from '../public-directory/doctor.model.js';
import { PatientModel } from '../patients/patient.model.js';
import { UserModel } from '../users/user.model.js';
import { AuditLogModel } from '../audit-logs/audit-log.model.js';

describe('admin dashboard analytics', () => {
  let replicaSet: MongoMemoryReplSet;
  let token: string;
  let hospitalId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({ binary: { version: '8.2.6' }, replSet: { count: 1 } });
    await mongoose.connect(replicaSet.getUri());
    await Promise.all([UserModel.init(), PatientModel.init(), DoctorModel.init(), DepartmentModel.init(), AppointmentModel.init()]);
  }, 120_000);

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    hospitalId = new mongoose.Types.ObjectId(env.HOSPITAL_ID);
    const user = await UserModel.create({ hospitalId, email: 'admin@example.test', firstName: 'Ari', lastName: 'Admin', passwordHash: 'test-hash-only', role: 'ADMIN', status: 'ACTIVE' });
    token = jwt.sign({ role: 'ADMIN', tokenVersion: 0 }, env.JWT_ACCESS_SECRET, { subject: user.id, issuer: 'medicare-pro', audience: 'medicare-pro-web', expiresIn: '15m' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replicaSet?.stop();
  });

  it('returns hospital-scoped live totals, trends, and upcoming visits', async () => {
    const department = await DepartmentModel.create({ hospitalId, name: 'Cardiology', slug: 'cardiology', summary: 'Heart and vascular care', status: 'ACTIVE' });
    const doctor = await DoctorModel.create({ hospitalId, departmentId: department._id, displayName: 'Jordan Doctor', specialty: 'Cardiology', qualification: 'MD', experienceYears: 8, status: 'ACTIVE' });
    const patient = await PatientModel.create({ hospitalId, patientNumber: 'PT-DASH01', firstName: 'Casey', lastName: 'Patient', status: 'ACTIVE' });
    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const startsAt = new Date(tomorrow.getTime() + 10 * 60 * 60_000);
    await AppointmentModel.create({ hospitalId, patientId: patient._id, doctorId: doctor._id, startsAt, endsAt: new Date(startsAt.getTime() + 30 * 60_000), timeZone: 'UTC', status: 'CONFIRMED', createdById: new mongoose.Types.ObjectId() });
    const yesterday = new Date(tomorrow);
    yesterday.setUTCDate(yesterday.getUTCDate() - 2);
    const pastStart = new Date(yesterday.getTime() + 10 * 60 * 60_000);
    await AppointmentModel.create({ hospitalId, patientId: patient._id, doctorId: doctor._id, startsAt: pastStart, endsAt: new Date(pastStart.getTime() + 30 * 60_000), timeZone: 'UTC', status: 'COMPLETED', createdById: new mongoose.Types.ObjectId() });
    const otherHospitalId = new mongoose.Types.ObjectId();
    await PatientModel.create({ hospitalId: otherHospitalId, patientNumber: 'PT-OTHER01', firstName: 'Other', lastName: 'Hospital', status: 'ACTIVE' });

    const response = await request(app).get('/api/v1/analytics/dashboard?days=7').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.metrics).toMatchObject({ totalPatients: 1, totalDoctors: 1, activeDepartments: 1, pendingAppointments: 0 });
    expect(response.body.data.appointmentTrend).toHaveLength(7);
    expect(response.body.data.appointmentTrend.reduce((sum: number, entry: { count: number }) => sum + entry.count, 0)).toBe(1);
    expect(response.body.data.departmentStats).toEqual([{ name: 'Cardiology', doctors: 1 }]);
    expect(response.body.data.upcomingAppointments).toHaveLength(1);
    expect(response.body.data.upcomingAppointments[0].patient.patientNumber).toBe('PT-DASH01');
  });

  it('paginates activity without exposing other hospitals or audit metadata', async () => {
    await AuditLogModel.insertMany(Array.from({ length: 11 }, (_, index) => ({ hospitalId, action: 'APPOINTMENT_BOOKED', resourceType: 'APPOINTMENT', timestamp: new Date(Date.now() - index * 1000), metadata: { private: 'hidden' } })));
    await AuditLogModel.create({ hospitalId: new mongoose.Types.ObjectId(), action: 'OTHER_HOSPITAL', resourceType: 'PATIENT' });
    const first = await request(app).get('/api/v1/analytics/activity').set('Authorization', `Bearer ${token}`);
    const second = await request(app).get('/api/v1/analytics/activity?page=2').set('Authorization', `Bearer ${token}`);
    expect(first.status).toBe(200);
    expect(first.body.data.total).toBe(11);
    expect(first.body.data.items).toHaveLength(10);
    expect(second.body.data.items).toHaveLength(1);
    expect(first.body.data.items[0]).not.toHaveProperty('metadata');
    expect(JSON.stringify(first.body)).not.toContain('OTHER_HOSPITAL');
    const invalid = await request(app).get('/api/v1/analytics/activity?page=-1').set('Authorization', `Bearer ${token}`);
    expect(invalid.status).toBe(422);
  });

  it('rejects dashboard access for receptionist roles and invalid ranges', async () => {
    const receptionist = await UserModel.create({ hospitalId, email: 'reception@example.test', firstName: 'Rae', lastName: 'Reception', passwordHash: 'test-hash-only', role: 'RECEPTIONIST', status: 'ACTIVE' });
    const receptionistToken = jwt.sign({ role: 'RECEPTIONIST', tokenVersion: 0 }, env.JWT_ACCESS_SECRET, { subject: receptionist.id, issuer: 'medicare-pro', audience: 'medicare-pro-web', expiresIn: '15m' });
    const denied = await request(app).get('/api/v1/analytics/dashboard').set('Authorization', `Bearer ${receptionistToken}`);
    const invalidRange = await request(app).get('/api/v1/analytics/dashboard?days=120').set('Authorization', `Bearer ${token}`);
    expect(denied.status).toBe(403);
    const deniedActivity = await request(app).get('/api/v1/analytics/activity').set('Authorization', `Bearer ${receptionistToken}`);
    expect(deniedActivity.status).toBe(403);
    expect(invalidRange.status).toBe(422);
  });
});
