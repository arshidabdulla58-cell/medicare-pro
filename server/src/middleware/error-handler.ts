import type { ErrorRequestHandler } from 'express';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/app-error.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const requestId = request.id;
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: { code: error.code, message: error.message }, requestId });
    return;
  }
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
    response.status(409).json({ error: { code: 'RESOURCE_CONFLICT', message: 'This account or resource already exists.' }, requestId });
    return;
  }
  logger.error({ err: error, requestId }, 'Unhandled request error');
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    requestId,
  });
};
