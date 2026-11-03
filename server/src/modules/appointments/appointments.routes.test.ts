import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { DoctorModel } from '../public-directory/doctor.model.js';
import { PatientModel } from '../patients/patient.model.js';
import { UserModel } from '../users/user.model.js';
import { AppointmentModel, AppointmentSlotModel } from './appointment.model.js';

describe('appointment booking workflow', () => {
  let replicaSet: MongoMemoryReplSet;
  let token: string;
  let patientToken: string;
  let patientId: string;
  let doctorId: string;

  beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({ binary: { version: '8.2.6' }, replSet: { count: 1 } });
    await mongoose.connect(replicaSet.getUri());
    await Promise.all([UserModel.init(), PatientModel.init(), DoctorModel.init(), AppointmentModel.init(), AppointmentSlotModel.init()]);
  }, 120_000);

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    await AppointmentSlotModel.syncIndexes();
    const hospitalId = new mongoose.Types.ObjectId(env.HOSPITAL_ID);
    const user = await UserModel.create({ hospitalId, email: 'reception@example.test', firstName: 'Rae', lastName: 'Reception', passwordHash: 'test-hash-only', role: 'RECEPTIONIST', status: 'ACTIVE' });
    token = jwt.sign({ role: 'RECEPTIONIST', tokenVersion: 0 }, env.JWT_ACCESS_SECRET, { subject: user.id, issuer: 'medicare-pro', audience: 'medicare-pro-web', expiresIn: '15m' });
    const patientUser = await UserModel.create({ hospitalId, email: 'casey@example.test', firstName: 'Casey', lastName: 'Patient', passwordHash: 'test-hash-only', role: 'PATIENT', status: 'ACTIVE' });
    patientToken = jwt.sign({ role: 'PATIENT', tokenVersion: 0 }, env.JWT_ACCESS_SECRET, { subject: patientUser.id, issuer: 'medicare-pro', audience: 'medicare-pro-web', expiresIn: '15m' });
    const patient = await PatientModel.create({ hospitalId, userId: patientUser._id, patientNumber: 'PT-TEST01', firstName: 'Casey', lastName: 'Patient' });
    const doctor = await DoctorModel.create({ hospitalId, displayName: 'Jordan Doctor', specialty: 'Cardiology', qualification: 'MD', experienceYears: 8, availabilityTimeZone: 'UTC', weeklyAvailability: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: '00:00', endTime: '23:59' })), isPublic: true, status: 'ACTIVE' });
    patientId = patient.id;
    doctorId = doctor.id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replicaSet.stop();
  });

  it('persists patient notifications and restricts read actions to their owner', async () => {
    await request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${token}`).send({ patientId, doctorId, startsAt: futureSlot(0), timeZone: 'UTC' }).expect(201);
    const inbox = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${patientToken}`).expect(200);
    expect(inbox.body.data.unread).toBe(1);
    const id = inbox.body.data.items[0]._id;
    await request(app).post(`/api/v1/notifications/${id}/read`).set('Authorization', `Bearer ${token}`).expect(404);
    await request(app).post(`/api/v1/notifications/${id}/read`).set('Authorization', `Bearer ${patientToken}`).expect(200);
    const read = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${patientToken}`).expect(200);
    expect(read.body.data.unread).toBe(0);
    const staff = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`).expect(200);
    expect(staff.body.data.total).toBe(0);
  });

  it('allows only one concurrent booking for a doctor and exact slot', async () => {
    const startsAt = futureSlot(0);
    const submit = () => request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${token}`).send({ patientId, doctorId, startsAt, timeZone: 'UTC' });
    const responses = await Promise.all([submit(), submit()]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await AppointmentModel.countDocuments()).toBe(1);
    expect(await AppointmentSlotModel.countDocuments()).toBe(1);
  });

  it('accepts local half-hour slots in quarter-hour-offset time zones', async () => {
    const timeZone = 'Asia/Kathmandu';
    await DoctorModel.updateOne({ _id: doctorId }, { $set: { availabilityTimeZone: timeZone } });
    const response = await request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${token}`).send({ patientId, doctorId, startsAt: futureSlotInZone(timeZone), timeZone });
    expect(response.status).toBe(201);
    expect(await AppointmentModel.findById(response.body.data.id).then((item) => item?.timeZone)).toBe(timeZone);
  });

  it('returns scheduled open slots and removes a slot after it is reserved', async () => {
    const query = () => request(app).get(`/api/v1/appointments/availability?doctorId=${doctorId}&days=1`).set('Authorization', `Bearer ${token}`);
    const available = await query();
    expect(available.status).toBe(200);
    expect(available.body.data.slots.length).toBeGreaterThan(0);
    const [slot] = available.body.data.slots as Array<{ startsAt: string; timeZone: string }>;
    if (!slot) throw new Error('Expected at least one configured availability slot.');
    const booked = await request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${token}`).send({ patientId, doctorId, startsAt: slot.startsAt, timeZone: slot.timeZone });
    expect(booked.status).toBe(201);

    const remaining = await query();
    expect(remaining.body.data.slots.some((candidate: { startsAt: string }) => candidate.startsAt === slot.startsAt)).toBe(false);
  });

  it('releases a slot atomically when cancelled so it can be booked again', async () => {
    const startsAt = futureSlot(1);
    const first = await request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${token}`).send({ patientId, doctorId, startsAt, timeZone: 'UTC' });
    expect(first.status).toBe(201);

    const cancelled = await request(app).patch(`/api/v1/appointments/${first.body.data.id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'CANCELLED' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('CANCELLED');

    const second = await request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${token}`).send({ patientId, doctorId, startsAt, timeZone: 'UTC' });
    expect(second.status).toBe(201);
    expect(await AppointmentSlotModel.countDocuments()).toBe(1);
  });

  it('limits patient appointment lists and cancellation to the linked patient profile', async () => {
    const hospitalId = new mongoose.Types.ObjectId(env.HOSPITAL_ID);
    const otherPatient = await PatientModel.create({ hospitalId, patientNumber: 'PT-TEST02', firstName: 'Taylor', lastName: 'Other' });
    const owned = await request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${token}`).send({ patientId, doctorId, startsAt: futureSlot(2), timeZone: 'UTC' });
    const unrelated = await request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${token}`).send({ patientId: otherPatient.id, doctorId, startsAt: futureSlot(3), timeZone: 'UTC' });
    expect(owned.status).toBe(201);
    expect(unrelated.status).toBe(201);

    const list = await request(app).get('/api/v1/appointments').set('Authorization', `Bearer ${patientToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].patient.patientNumber).toBe('PT-TEST01');

    const denied = await request(app).patch(`/api/v1/appointments/${unrelated.body.data.id}/status`).set('Authorization', `Bearer ${patientToken}`).send({ status: 'CANCELLED' });
    expect(denied.status).toBe(404);
    expect(denied.body.error.code).toBe('NOT_FOUND');
  });
});

function futureSlot(offset: number): string {
  const halfHour = 30 * 60_000;
  const first = Math.ceil((Date.now() + 60 * 60_000) / halfHour) * halfHour;
  return new Date(first + offset * halfHour).toISOString();
}

function futureSlotInZone(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en', { timeZone, minute: '2-digit' });
  const step = 15 * 60_000;
  let instant = Math.ceil((Date.now() + 60 * 60_000) / step) * step;
  while (Number(formatter.format(new Date(instant))) % 30 !== 0) instant += step;
  return new Date(instant).toISOString();
}
