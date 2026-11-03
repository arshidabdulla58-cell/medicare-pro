import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  MONGODB_URI: z.string().min(1),
  HOSPITAL_ID: z.string().regex(/^[a-fA-F0-9]{24}$/),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(14),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SMTP_URL: z.string().url().refine((value) => value.startsWith('smtp://') || value.startsWith('smtps://')).optional(),
  EMAIL_FROM: z.email().optional(),
}).superRefine((values, context) => {
  if (values.COOKIE_SAME_SITE === 'none' && values.NODE_ENV !== 'production') {
    context.addIssue({ code: 'custom', path: ['COOKIE_SAME_SITE'], message: 'SameSite=None cookies require production HTTPS.' });
  }
  if (Boolean(values.SMTP_URL) !== Boolean(values.EMAIL_FROM)) {
    context.addIssue({ code: 'custom', path: ['SMTP_URL'], message: 'Configure SMTP_URL and EMAIL_FROM together.' });
  }
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid server environment configuration:', z.treeifyError(parsed.error));
  throw new Error('Server environment validation failed');
}

export const env = parsed.data;
