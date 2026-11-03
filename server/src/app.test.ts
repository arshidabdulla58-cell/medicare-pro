import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './app.js';

describe('API health', () => {
  it('reports liveness without exposing configuration', async () => {
    const response = await request(app).get('/api/v1/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'alive' } });
    expect(response.body).not.toHaveProperty('env');
  });

  it('reports not ready when MongoDB is disconnected', async () => {
    const response = await request(app).get('/api/v1/health/ready');

    expect(response.status).toBe(503);
    expect(response.body.data.status).toBe('unavailable');
  });
});

describe('protected operational routes', () => {
  it('fails closed with an explicit unavailable response when MongoDB is down', async () => {
    const patients = await request(app).get('/api/v1/patients');
    const departments = await request(app).post('/api/v1/departments').send({ name: 'Cardiology' });

    expect(patients.status).toBe(503);
    expect(departments.status).toBe(503);
    expect(patients.body.error.code).toBe('DATABASE_UNAVAILABLE');
  });
});
