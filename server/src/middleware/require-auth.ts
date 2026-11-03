import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { UserModel } from '../modules/users/user.model.js';
import type { Role } from '../modules/auth/auth.types.js';

type AccessClaims = JwtPayload & { role: Role; tokenVersion: number };

export const requireAuth: RequestHandler = async (request, _response, next) => {
  const [scheme, token] = (request.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.'));
    return;
  }

  let claims: AccessClaims;
  try {
    claims = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'medicare-pro', audience: 'medicare-pro-web' }) as AccessClaims;
  } catch {
    next(new AppError(401, 'INVALID_SESSION', 'Your session has expired. Sign in again.'));
    return;
  }

  const user = await UserModel.findOne({ _id: claims.sub, hospitalId: env.HOSPITAL_ID, status: 'ACTIVE' })
    .select('firstName lastName role tokenVersion hospitalId')
    .lean();
  if (!user || user.tokenVersion !== claims.tokenVersion) {
    next(new AppError(401, 'INVALID_SESSION', 'Your session has expired. Sign in again.'));
    return;
  }

  request.authUser = {
    id: user._id.toString(),
    hospitalId: user.hospitalId.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as Role,
  };
  next();
};

export function requireRoles(...roles: Role[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.authUser) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.'));
      return;
    }
    if (!roles.includes(request.authUser.role)) {
      next(new AppError(403, 'PERMISSION_DENIED', 'You do not have permission to perform this action.'));
      return;
    }
    next();
  };
}
