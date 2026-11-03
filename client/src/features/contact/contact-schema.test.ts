import { describe, expect, it } from 'vitest';
import { contactSchema } from './contact-schema';

describe('contactSchema', () => {
  it('accepts a complete general enquiry', () => {
    expect(contactSchema.safeParse({
      name: 'Jordan Lee',
      email: 'jordan@example.com',
      phone: '',
      topic: 'GENERAL',
      message: 'Please tell me how to contact the care team.',
    }).success).toBe(true);
  });

  it('rejects short messages and malformed email addresses', () => {
    const result = contactSchema.safeParse({ name: 'Jo', email: 'invalid', topic: 'GENERAL', message: 'Help' });
    expect(result.success).toBe(false);
  });
});
