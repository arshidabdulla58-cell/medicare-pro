import { z } from 'zod';

const password = z.string().min(12, 'Use at least 12 characters.').max(128, 'Password is too long.')
  .refine((value) => new TextEncoder().encode(value).byteLength <= 72, 'Password must be 72 bytes or fewer.');

export const loginFormSchema = z.object({ email: z.email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.') });
export const registerFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.').max(60),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(60),
  email: z.email('Enter a valid email address.'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password,
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
export const emailFormSchema = z.object({ email: z.email('Enter a valid email address.') });
export const resetFormSchema = z.object({ password, confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type EmailFormValues = z.infer<typeof emailFormSchema>;
export type ResetFormValues = z.infer<typeof resetFormSchema>;
