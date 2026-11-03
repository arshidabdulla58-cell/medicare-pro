import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { AppError } from '../../utils/app-error.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireDatabase } from '../../middleware/require-database.js';
import { requireTrustedOrigin } from '../../middleware/require-trusted-origin.js';
import { env } from '../../config/env.js';
import { UserModel } from '../users/user.model.js';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from './auth.validators.js';
import { login, logout, publicUser, registerPatient, requestPasswordReset, resetPassword, rotateRefreshToken } from './auth.service.js';

const REFRESH_COOKIE = 'medicare_refresh';
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const resetLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false });

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.COOKIE_SAME_SITE,
  path: '/api/v1/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60_000,
} as const;

function setRefreshCookie(response: Response, token: string) {
  response.cookie(REFRESH_COOKIE, token, cookieOptions);
}

function invalidPayload(response: Response, issues: Array<{ path: PropertyKey[]; message: string }>) {
  response.status(422).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Review the highlighted fields and try again.',
      issues: issues.map((issue) => ({ path: issue.path.map(String), message: issue.message })),
    },
  });
}

function requestId(request: Request) {
  return request.id === undefined ? undefined : String(request.id);
}

function assertDatabaseAvailable() {
  if (mongoose.connection.readyState !== 1) throw new AppError(503, 'DATABASE_UNAVAILABLE', 'The service is temporarily unavailable while the database reconnects.');
}

export const authRouter = Router();

authRouter.post('/register', authLimiter, requireTrustedOrigin, async (request, response) => {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) return invalidPayload(response, parsed.error.issues);
  assertDatabaseAvailable();
  const result = await registerPatient(parsed.data, requestId(request));
  setRefreshCookie(response, result.refreshToken);
  response.status(201).json({ data: { user: result.user, accessToken: result.accessToken } });
});

authRouter.post('/login', authLimiter, requireTrustedOrigin, async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) return invalidPayload(response, parsed.error.issues);
  assertDatabaseAvailable();
  const result = await login(parsed.data.email, parsed.data.password, requestId(request));
  setRefreshCookie(response, result.refreshToken);
  response.json({ data: { user: result.user, accessToken: result.accessToken } });
});

authRouter.post('/refresh', authLimiter, requireTrustedOrigin, async (request, response) => {
  const rawToken = request.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!rawToken) throw new AppError(401, 'INVALID_REFRESH_SESSION', 'Your session has ended. Sign in again.');
  assertDatabaseAvailable();
  const result = await rotateRefreshToken(rawToken, requestId(request));
  setRefreshCookie(response, result.refreshToken);
  response.json({ data: { user: result.user, accessToken: result.accessToken } });
});

authRouter.post('/logout', authLimiter, requireTrustedOrigin, requireDatabase, async (request, response) => {
  await logout(request.cookies?.[REFRESH_COOKIE] as string | undefined, requestId(request));
  response.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: cookieOptions.secure, sameSite: cookieOptions.sameSite, path: cookieOptions.path });
  response.status(204).end();
});

authRouter.get('/me', requireDatabase, requireAuth, async (request, response) => {
  const user = await UserModel.findOne({ _id: request.authUser?.id, hospitalId: env.HOSPITAL_ID, status: 'ACTIVE' });
  if (!user) throw new AppError(401, 'INVALID_SESSION', 'Your session has expired. Sign in again.');
  response.json({ data: { user: publicUser(user) } });
});

authRouter.post('/forgot-password', resetLimiter, async (request, response) => {
  const parsed = forgotPasswordSchema.safeParse(request.body);
  if (!parsed.success) return invalidPayload(response, parsed.error.issues);
  assertDatabaseAvailable();
  await requestPasswordReset(parsed.data.email);
  response.status(202).json({ data: { message: 'If the address is registered, password reset instructions will be sent.' } });
});

authRouter.post('/reset-password', resetLimiter, requireTrustedOrigin, async (request, response) => {
  const parsed = resetPasswordSchema.safeParse(request.body);
  if (!parsed.success) return invalidPayload(response, parsed.error.issues);
  assertDatabaseAvailable();
  await resetPassword(parsed.data.token, parsed.data.password, requestId(request));
  response.json({ data: { message: 'Your password has been updated. Sign in with your new password.' } });
});
