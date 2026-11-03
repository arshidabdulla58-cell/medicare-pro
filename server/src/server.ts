import { createServer } from 'node:http';
import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { attachNotifications } from './modules/notifications/notifications.js';

const server = createServer(app);
attachNotifications(server);
let shuttingDown = false;

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'MediCare Pro API listening');
  void maintainDatabaseConnection();
});

async function maintainDatabaseConnection(): Promise<void> {
  while (!shuttingDown) {
    try {
      await connectDatabase();
      logger.info('MongoDB connection established');
      return;
    } catch (error) {
      logger.warn({ reason: error instanceof Error ? error.message : 'Unknown connection error' }, 'MongoDB unavailable; retrying connection in 15 seconds');
      await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
  }
}

async function shutdown(signal: string): Promise<void> {
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down API');
  server.close(async (error) => {
    if (error) logger.error({ err: error }, 'HTTP server close failed');
    await disconnectDatabase();
    process.exit(error ? 1 : 0);
  });
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
