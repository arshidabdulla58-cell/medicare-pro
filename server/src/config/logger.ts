import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: ['password', 'passwordHash', 'token', 'tokenHash', 'authorization', 'cookie'], censor: '[REDACTED]' },
});
