import { describe, expect, it } from 'vitest';
import { loginFormSchema, registerFormSchema } from './auth-schemas';

describe('auth form validation', () => {
  it('accepts a well-formed patient registration and requires matching passwords', () => {
    const base = { firstName: 'Ava', lastName: 'Park', email: 'ava@example.com', phone: '', password: 'a-long-enough-password-123' };
    expect(registerFormSchema.safeParse({ ...base, confirmPassword: base.password }).success).toBe(true);
    expect(registerFormSchema.safeParse({ ...base, confirmPassword: 'different-password-456' }).success).toBe(false);
  });

  it('rejects malformed login details', () => {
    expect(loginFormSchema.safeParse({ email: 'bad-email', password: '' }).success).toBe(false);
  });
});
