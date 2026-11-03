import { z } from 'zod';

const passwordSchema = z.string()
  .min(12, 'Use at least 12 characters.')
  .max(128, 'Password is too long.')
  .refine((password) => new TextEncoder().encode(password).byteLength <= 72, 'Password must be 72 bytes or fewer.');

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.email().trim().toLowerCase().max(254),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: passwordSchema,
}).strict();

export const loginSchema = z.object({ email: z.email().trim().toLowerCase().max(254), password: z.string().min(1).max(128) }).strict();
export const forgotPasswordSchema = z.object({ email: z.email().trim().toLowerCase().max(254) }).strict();
export const resetPasswordSchema = z.object({ token: z.string().min(40).max(128), password: passwordSchema }).strict();
