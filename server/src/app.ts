import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { isTrustedOrigin } from './config/trusted-origin.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes/index.js';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';

export const app = express();

app.disable('x-powered-by');
if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: (origin, callback) => callback(null, origin ? isTrustedOrigin(origin) : false), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    autoLogging: { ignore: (request) => request.url?.startsWith('/api/v1/health/') ?? false },
  }),
);
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/v1', apiRouter);
app.use('/api', (_request, response) => { response.status(404).json({ error: { code: 'NOT_FOUND', message: 'API endpoint not found.' } }); });
if (env.NODE_ENV === 'production') {
  const clientDirectory = fileURLToPath(new URL('../../client/dist/', import.meta.url));
  app.use(express.static(clientDirectory));
  app.get('/{*path}', (request, response, next) => {
    if (request.path.startsWith('/socket.io') || !request.accepts('html')) return next();
    response.sendFile('index.html', { root: clientDirectory });
  });
}
app.use(errorHandler);
