import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { AppError } from '../utils/app-error.js';

export const requireDatabase: RequestHandler = (_request, _response, next) => {
  if (mongoose.connection.readyState !== 1) {
    next(new AppError(503, 'DATABASE_UNAVAILABLE', 'The service is temporarily unavailable while the database reconnects.'));
    return;
  }
  next();
};
