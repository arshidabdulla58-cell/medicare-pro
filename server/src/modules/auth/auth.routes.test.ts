import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';

describe('auth input handling', () => {
  it('rejects malformed login data without querying the user collection', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'not-an-email', password: '' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('not-an-email');
  });

  it('accepts the loopback IPv4 origin used by the in-app browser in development', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://127.0.0.1:5173')
      .send({ email: 'not-an-email', password: '' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:5173');
  });

  it('rejects state-changing auth requests from an untrusted origin', async () => {
    const response = await request(app).post('/api/v1/auth/refresh');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('UNTRUSTED_ORIGIN');
  });
});
