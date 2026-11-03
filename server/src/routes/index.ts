import { Router } from 'express';
import { databaseReady } from '../services/readiness.js';
import { publicDirectoryRouter } from '../modules/public-directory/public-directory.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { operationsRouter } from '../modules/operations/operations.routes.js';
import { appointmentsRouter } from '../modules/appointments/appointments.routes.js';
import { analyticsRouter } from '../modules/analytics/analytics.routes.js';
import { notificationsRouter } from '../modules/notifications/notifications.js';

export const apiRouter = Router();

apiRouter.get('/health/live', (_request, response) => {
  response.status(200).json({ data: { status: 'alive' } });
});

apiRouter.get('/health/ready', async (_request, response) => {
  const ready = await databaseReady();
  response.status(ready ? 200 : 503).json({ data: { status: ready ? 'ready' : 'unavailable' } });
});

apiRouter.use('/public', publicDirectoryRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/', operationsRouter);
apiRouter.use('/appointments', appointmentsRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/notifications', notificationsRouter);
