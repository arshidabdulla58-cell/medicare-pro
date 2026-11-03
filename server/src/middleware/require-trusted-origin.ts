import type { RequestHandler } from 'express';
import { isTrustedOrigin } from '../config/trusted-origin.js';
import { AppError } from '../utils/app-error.js';

export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  if (!isTrustedOrigin(request.get('origin'))) {
    next(new AppError(403, 'UNTRUSTED_ORIGIN', 'This request origin is not allowed.'));
    return;
  }
  next();
};
