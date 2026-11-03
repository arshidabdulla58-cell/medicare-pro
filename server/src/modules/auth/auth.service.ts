import { randomBytes, createHash, randomUUID } from 'node:crypto';
import mongoose, { type HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AuditLogModel } from '../audit-logs/audit-log.model.js';
import { PatientModel } from '../patients/patient.model.js';
import { UserModel, type UserRecord } from '../users/user.model.js';
import { RefreshTokenModel } from './refresh-token.model.js';
import type { AuthUserDto } from './auth.types.js';
import { AppError } from '../../utils/app-error.js';

const TOKEN_BYTES = 48;
const RESET_TOKEN_BYTES = 32;
const RESET_TTL_MS = 30 * 60_000;
const ACCESS_ISSUER = 'medicare-pro';
const ACCESS_AUDIENCE = 'medicare-pro-web';
const dummyPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

function hospitalObjectId() {
  return new mongoose.Types.ObjectId(env.HOSPITAL_ID);
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function toUserDto(user: HydratedDocument<UserRecord>): AuthUserDto {
  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as AuthUserDto['role'],
  };
}

function createAccessToken(user: HydratedDocument<UserRecord>) {
  return jwt.sign(
    { role: user.role, tokenVersion: user.tokenVersion },
    env.JWT_ACCESS_SECRET,
    { subject: user._id.toString(), issuer: ACCESS_ISSUER, audience: ACCESS_AUDIENCE, expiresIn: '15m' },
  );
}

async function createRefreshRecord(userId: mongoose.Types.ObjectId, familyId: string, session: mongoose.ClientSession) {
  const rawToken = randomBytes(TOKEN_BYTES).toString('base64url');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60_000);
  const [record] = await RefreshTokenModel.create([{
    hospitalId: hospitalObjectId(),
    userId,
    familyId,
    tokenHash: tokenHash(rawToken),
    expiresAt,
  }], { session });
  if (!record) throw new Error('Refresh session could not be created.');
  return { rawToken, record };
}

async function audit(action: string, actorId?: mongoose.Types.ObjectId, resourceId?: mongoose.Types.ObjectId, requestId?: string, session?: mongoose.ClientSession) {
  await AuditLogModel.create([{
    hospitalId: hospitalObjectId(),
    ...(actorId ? { actorId } : {}),
    action,
    resourceType: 'AUTH_SESSION',
    ...(resourceId ? { resourceId } : {}),
    ...(requestId ? { requestId } : {}),
  }], session ? { session } : undefined);
}

export function publicUser(user: HydratedDocument<UserRecord>) {
  return toUserDto(user);
}

export async function registerPatient(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | undefined;
  password: string;
}, requestId?: string) {
  const session = await mongoose.startSession();
  try {
    let user: HydratedDocument<UserRecord> | undefined;
    let rawRefreshToken = '';
    await session.withTransaction(async () => {
      const passwordHash = await bcrypt.hash(input.password, 12);
      const patientNumber = `PT-${randomBytes(6).toString('hex').toUpperCase()}`;
      const [createdUser] = await UserModel.create([{
        hospitalId: hospitalObjectId(),
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        role: 'PATIENT',
        ...(input.phone ? { phone: input.phone } : {}),
      }], { session });
      if (!createdUser) throw new Error('User account could not be created.');
      const [patient] = await PatientModel.create([{
        hospitalId: hospitalObjectId(),
        userId: createdUser._id,
        patientNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        ...(input.phone ? { phone: input.phone } : {}),
      }], { session });
      if (!patient) throw new Error('Patient profile could not be created.');
      createdUser.patientId = patient._id;
      await createdUser.save({ session });

      const refresh = await createRefreshRecord(createdUser._id, randomUUID(), session);
      rawRefreshToken = refresh.rawToken;
      await audit('PATIENT_REGISTERED', createdUser._id, createdUser._id, requestId, session);
      user = createdUser;
    });
    if (!user) throw new Error('Patient registration did not complete.');
    return { user: toUserDto(user), accessToken: createAccessToken(user), refreshToken: rawRefreshToken };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      throw new AppError(409, 'ACCOUNT_EXISTS', 'An account with that email address already exists.');
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function login(email: string, password: string, requestId?: string) {
  const user = await UserModel.findOne({ hospitalId: hospitalObjectId(), email }).select('+passwordHash');
  const compareHash = user?.passwordHash ?? dummyPasswordHash;
  const passwordMatches = await bcrypt.compare(password, compareHash);
  const isLocked = Boolean(user?.lockUntil && user.lockUntil.getTime() > Date.now());

  if (!user || user.status !== 'ACTIVE' || isLocked || !passwordMatches) {
    if (user && user.status === 'ACTIVE' && !isLocked && !passwordMatches) {
      const failedLoginCount = user.failedLoginCount + 1;
      user.failedLoginCount = failedLoginCount;
      if (failedLoginCount >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60_000);
        user.failedLoginCount = 0;
      }
      await user.save();
    }
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  user.failedLoginCount = 0;
  user.lockUntil = null;
  await user.save();
  const session = await mongoose.startSession();
  let rawRefreshToken = '';
  try {
    await session.withTransaction(async () => {
      const refresh = await createRefreshRecord(user._id, randomUUID(), session);
      rawRefreshToken = refresh.rawToken;
      await audit('USER_SIGNED_IN', user._id, user._id, requestId, session);
    });
  } finally {
    await session.endSession();
  }
  return { user: toUserDto(user), accessToken: createAccessToken(user), refreshToken: rawRefreshToken };
}

export async function rotateRefreshToken(rawToken: string, requestId?: string) {
  const session = await mongoose.startSession();
  type RotationResult = { kind: 'ok'; user: HydratedDocument<UserRecord>; refreshToken: string } | { kind: 'invalid' };
  try {
    const result = await session.withTransaction(async (): Promise<RotationResult> => {
      const current = await RefreshTokenModel.findOne({
        hospitalId: hospitalObjectId(),
        tokenHash: tokenHash(rawToken),
      }).session(session);
      if (!current) return { kind: 'invalid' };

      const now = new Date();
      if (current.revokedAt || current.expiresAt <= now) {
        await RefreshTokenModel.updateMany({ hospitalId: hospitalObjectId(), familyId: current.familyId, revokedAt: null }, { $set: { revokedAt: now } }, { session });
        await audit('REFRESH_REUSE_DETECTED', current.userId, current.userId, requestId, session);
        return { kind: 'invalid' };
      }

      const user = await UserModel.findOne({ _id: current.userId, hospitalId: hospitalObjectId(), status: 'ACTIVE' });
      if (!user) {
        await RefreshTokenModel.updateMany({ hospitalId: hospitalObjectId(), familyId: current.familyId, revokedAt: null }, { $set: { revokedAt: now } }, { session });
        return { kind: 'invalid' };
      }

      const replacement = await createRefreshRecord(user._id, current.familyId, session);
      const changed = await RefreshTokenModel.updateOne(
        { _id: current._id, revokedAt: null, expiresAt: { $gt: now } },
        { $set: { revokedAt: now, replacedBy: replacement.record._id } },
        { session },
      );
      if (changed.modifiedCount !== 1) {
        await RefreshTokenModel.deleteOne({ _id: replacement.record._id }, { session });
        await RefreshTokenModel.updateMany({ hospitalId: hospitalObjectId(), familyId: current.familyId, revokedAt: null }, { $set: { revokedAt: now } }, { session });
        await audit('REFRESH_REUSE_DETECTED', current.userId, current.userId, requestId, session);
        return { kind: 'invalid' };
      }

      await audit('REFRESH_ROTATED', user._id, user._id, requestId, session);
      return { kind: 'ok', user, refreshToken: replacement.rawToken };
    });
    if (!result || result.kind !== 'ok') throw new AppError(401, 'INVALID_REFRESH_SESSION', 'Your session has ended. Sign in again.');
    return { user: toUserDto(result.user), accessToken: createAccessToken(result.user), refreshToken: result.refreshToken };
  } finally {
    await session.endSession();
  }
}

export async function logout(rawToken?: string, requestId?: string) {
  if (!rawToken) return;
  const current = await RefreshTokenModel.findOne({ hospitalId: hospitalObjectId(), tokenHash: tokenHash(rawToken) });
  if (!current || current.revokedAt) return;
  await RefreshTokenModel.updateMany(
    { hospitalId: hospitalObjectId(), familyId: current.familyId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  await audit('USER_SIGNED_OUT', current.userId, current.userId, requestId);
}

export async function requestPasswordReset(email: string) {
  if (!env.SMTP_URL || !env.EMAIL_FROM) {
    throw new AppError(503, 'PASSWORD_RESET_UNAVAILABLE', 'Password reset email is not configured on this server.');
  }

  const user = await UserModel.findOne({ hospitalId: hospitalObjectId(), email, status: 'ACTIVE' })
    .select('+passwordResetTokenHash +passwordResetExpiresAt');
  let link: string | undefined;
  if (user) {
    const rawToken = randomBytes(RESET_TOKEN_BYTES).toString('base64url');
    user.passwordResetTokenHash = tokenHash(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + RESET_TTL_MS);
    await user.save();
    link = `${env.CLIENT_ORIGIN}/reset-password?token=${encodeURIComponent(rawToken)}`;
  }

  const smtpUrl = new URL(env.SMTP_URL);
  const transporter = nodemailer.createTransport({
    host: smtpUrl.hostname,
    port: Number(smtpUrl.port || (smtpUrl.protocol === 'smtps:' ? 465 : 587)),
    secure: smtpUrl.protocol === 'smtps:',
    ...(smtpUrl.protocol === 'smtp:' ? { requireTLS: true } : {}),
    tls: { minVersion: 'TLSv1.2' },
    ...(smtpUrl.username ? { auth: { user: decodeURIComponent(smtpUrl.username), pass: decodeURIComponent(smtpUrl.password) } } : {}),
  });
  const text = link
    ? `A password reset was requested for your MediCare Pro account. Use this one-time link within 30 minutes: ${link}\n\nIf you did not request this, ignore this message.`
    : 'A password reset was requested for this address. If it belongs to an active MediCare Pro account, a separate reset link will follow. If you did not request this, ignore this message.';
  try {
    await transporter.sendMail({ from: env.EMAIL_FROM, to: email, subject: 'MediCare Pro password reset', text });
  } catch {
    logger.warn('Password reset email delivery failed');
    throw new AppError(503, 'EMAIL_DELIVERY_UNAVAILABLE', 'Password reset email could not be delivered. Please try again later.');
  }
}

export async function resetPassword(rawToken: string, newPassword: string, requestId?: string) {
  const session = await mongoose.startSession();
  try {
    let outcome = false;
    await session.withTransaction(async () => {
      const user = await UserModel.findOne({
        hospitalId: hospitalObjectId(),
        status: 'ACTIVE',
        passwordResetTokenHash: tokenHash(rawToken),
        passwordResetExpiresAt: { $gt: new Date() },
      }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt').session(session);
      if (!user) return;

      user.passwordHash = await bcrypt.hash(newPassword, 12);
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      user.tokenVersion += 1;
      user.failedLoginCount = 0;
      user.lockUntil = null;
      await user.save({ session });
      await RefreshTokenModel.updateMany({ hospitalId: hospitalObjectId(), userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } }, { session });
      await audit('PASSWORD_RESET_COMPLETED', user._id, user._id, requestId, session);
      outcome = true;
    });
    if (!outcome) throw new AppError(400, 'INVALID_RESET_TOKEN', 'This password reset link is invalid or has expired.');
  } finally {
    await session.endSession();
  }
}

export async function bootstrapSuperAdmin(input: { firstName: string; lastName: string; email: string; password: string }) {
  const existing = await UserModel.exists({ hospitalId: hospitalObjectId(), role: 'SUPER_ADMIN' });
  if (existing) throw new AppError(409, 'SUPER_ADMIN_EXISTS', 'A super-admin account already exists for this hospital.');
  const user = await UserModel.create({
    hospitalId: hospitalObjectId(),
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    passwordHash: await bcrypt.hash(input.password, 12),
    role: 'SUPER_ADMIN',
  });
  await audit('SUPER_ADMIN_BOOTSTRAPPED', user._id, user._id);
  return toUserDto(user);
}
