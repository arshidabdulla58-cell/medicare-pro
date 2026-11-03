import { z } from 'zod';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { bootstrapSuperAdmin } from '../modules/auth/auth.service.js';

const inputSchema = z.object({
  BOOTSTRAP_ADMIN_FIRST_NAME: z.string().trim().min(1).max(60),
  BOOTSTRAP_ADMIN_LAST_NAME: z.string().trim().min(1).max(60),
  BOOTSTRAP_ADMIN_EMAIL: z.email().trim().toLowerCase(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12).max(128),
});

const parsed = inputSchema.safeParse(process.env);
if (!parsed.success) throw new Error('Set all BOOTSTRAP_ADMIN_* values in the untracked server/.env file.');

await connectDatabase();
try {
  const admin = await bootstrapSuperAdmin({
    firstName: parsed.data.BOOTSTRAP_ADMIN_FIRST_NAME,
    lastName: parsed.data.BOOTSTRAP_ADMIN_LAST_NAME,
    email: parsed.data.BOOTSTRAP_ADMIN_EMAIL,
    password: parsed.data.BOOTSTRAP_ADMIN_PASSWORD,
  });
  console.info(`Created initial super-admin account ${admin.email}. Remove the BOOTSTRAP_ADMIN_* values from server/.env.`);
} finally {
  await disconnectDatabase();
}
