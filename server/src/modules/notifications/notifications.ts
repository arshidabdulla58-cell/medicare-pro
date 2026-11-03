import mongoose, { Schema } from 'mongoose';
import { Router } from 'express';
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { isTrustedOrigin } from '../../config/trusted-origin.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireDatabase } from '../../middleware/require-database.js';
import { AppError } from '../../utils/app-error.js';
import { UserModel } from '../users/user.model.js';
import { PatientModel } from '../patients/patient.model.js';

const schema = new Schema({ hospitalId: { type: Schema.Types.ObjectId, required: true }, userId: { type: Schema.Types.ObjectId, required: true }, appointmentId: { type: Schema.Types.ObjectId, required: true }, message: { type: String, required: true }, readAt: { type: Date, default: null } }, { timestamps: true });
schema.index({ hospitalId: 1, userId: 1, createdAt: -1 });
export const NotificationModel = mongoose.model('Notification', schema);
let io: Server | undefined;
export function attachNotifications(server: HttpServer) {
  io = new Server(server, { cors: { origin: (origin, callback) => callback(null, Boolean(origin && isTrustedOrigin(origin))), credentials: true } });
  io.use(async (socket, next) => {
    try {
      const claims = jwt.verify(socket.handshake.auth.token, env.JWT_ACCESS_SECRET, { issuer: 'medicare-pro', audience: 'medicare-pro-web' });
      if (typeof claims === 'string' || !claims.exp) throw new Error('Invalid token');
      const user = await UserModel.findOne({ _id: claims.sub, hospitalId: env.HOSPITAL_ID, status: 'ACTIVE', tokenVersion: claims.tokenVersion }).lean();
      if (!user) throw new Error('Invalid account');
      socket.data.room = `${user.hospitalId}:${user._id}`;
      socket.data.exp = claims.exp;
      next();
    } catch { next(new Error('Authentication required')); }
  });
  io.on('connection', (socket) => {
    void socket.join(socket.data.room);
    const timer = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.exp * 1000 - Date.now()));
    socket.on('disconnect', () => clearTimeout(timer));
  });
}
export async function saveAppointmentNotification(hospitalId: mongoose.Types.ObjectId, patientId: mongoose.Types.ObjectId, appointmentId: mongoose.Types.ObjectId, status: string, session: mongoose.ClientSession) {
  const patient = await PatientModel.findOne({ _id: patientId, hospitalId }).select('userId').session(session).lean();
  if (!patient?.userId) return undefined;
  await NotificationModel.create([{ hospitalId, userId: patient.userId, appointmentId, message: status === 'PENDING' ? 'An appointment has been booked for you. View your appointments for details.' : `Your appointment status is now ${status.toLowerCase().replaceAll('_', ' ')}.` }], { session });
  return `${hospitalId}:${patient.userId}`;
}
export function publishNotification(room: string | undefined) { if (room) io?.to(room).emit('notification.created'); }
export const notificationsRouter = Router();
notificationsRouter.use(requireDatabase, requireAuth);
notificationsRouter.get('/', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw new AppError(422, 'VALIDATION_ERROR', 'Invalid page.');
  const filter = { hospitalId: req.authUser!.hospitalId, userId: req.authUser!.id };
  const [items, unread, total] = await Promise.all([NotificationModel.find(filter).select('message readAt createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 10).limit(10).lean(), NotificationModel.countDocuments({ ...filter, readAt: null }), NotificationModel.countDocuments(filter)]);
  res.json({ data: { items, unread, total, page } });
});
notificationsRouter.post('/:id/read', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'NOT_FOUND', 'Notification not found.');
  const filter = { _id: req.params.id, hospitalId: req.authUser!.hospitalId, userId: req.authUser!.id };
  if (!await NotificationModel.exists(filter)) throw new AppError(404, 'NOT_FOUND', 'Notification not found.');
  await NotificationModel.updateOne({ ...filter, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ data: { success: true } });
});
