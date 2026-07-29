import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const customerToken = jwt.sign(
  { userId: '123e4567-e89b-42d3-a456-426614174001', role: Role.CUSTOMER, phone: '+213555123456' },
  process.env.JWT_SECRET || 'fallback_secret'
);

describe('Step 13 — Security & System Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes HTTP Security Headers (Helmet)', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns 401 for requests missing Authorization header', async () => {
    const res = await request(app).get('/api/customers/me');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/authentication required/i);
  });

  it('returns 401 for malformed JWT token', async () => {
    const res = await request(app)
      .get('/api/customers/me')
      .set('Authorization', 'Bearer invalid.token.structure');

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it('enforces role isolation: customer cannot access driver pricing endpoints', async () => {
    const res = await request(app)
      .get('/api/driver/pricing')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/forbidden/i);
  });

  it('enforces request validation on invalid payloads with 400', async () => {
    const res = await request(app)
      .post('/api/bookings/estimate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ invalidField: true });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });
});
