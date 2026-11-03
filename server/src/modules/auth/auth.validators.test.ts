import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth.validators.js';

describe('auth validators', () => {
  it('normalizes email and rejects weak passwords', () => {
    const result = registerSchema.safeParse({
      firstName: 'Ava',
      lastName: 'Park',
      email: 'AVA@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('does not allow public registration to select a staff role', () => {
    const result = registerSchema.safeParse({
      firstName: 'Ava',
      lastName: 'Park',
      email: 'ava@example.com',
      password: 'a-long-enough-password-123',
      role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('requires both a valid email and a password on login', () => {
    expect(loginSchema.safeParse({ email: 'not-email', password: 'x' }).success).toBe(false);
  });
});
