import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters.').max(80),
  email: z.email('Enter a valid email address.').max(254),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  topic: z.enum(['GENERAL', 'APPOINTMENT', 'FEEDBACK']),
  message: z.string().trim().min(10, 'Please add a little more detail.').max(2000),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
