import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';

describe('public contact endpoint', () => {
  it('rejects invalid enquiry data without persisting it or echoing field values', async () => {
    const response = await request(app).post('/api/v1/public/contact').send({
      name: 'J',
      email: 'not-an-email',
      topic: 'GENERAL',
      message: 'Short',
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('not-an-email');
  });
});
