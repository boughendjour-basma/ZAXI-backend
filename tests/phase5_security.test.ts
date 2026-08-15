import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import jwt from 'jsonwebtoken';
import { BookingStatus, Role } from '@prisma/client';
import { verifyPasswordResetToken, generatePasswordResetToken } from '../src/utils/jwt';

describe('Phase 5 — Production Security & Authorization Hardening', () => {
  const customer1Id = '123e4567-e89b-12d3-a456-426614174001';
  const customer2Id = '123e4567-e89b-12d3-a456-426614174002';
  const driverId = '123e4567-e89b-12d3-a456-426614174003';

  let customer1Token: string;
  let customer2Token: string;
  let driverToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    customer1Token = jwt.sign({ userId: customer1Id, role: Role.CUSTOMER }, process.env.JWT_SECRET || 'fallback_secret');
    customer2Token = jwt.sign({ userId: customer2Id, role: Role.CUSTOMER }, process.env.JWT_SECRET || 'fallback_secret');
    driverToken = jwt.sign({ userId: driverId, role: Role.DRIVER }, process.env.JWT_SECRET || 'fallback_secret');
  });

  describe('1. IDOR Customer Booking Isolation', () => {
    it('prevents Customer 2 from viewing Customer 1\'s booking details (returns 404)', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174000';

      prismaMock.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId: customer1Id,
        status: BookingStatus.PENDING,
      } as any);

      const response = await request(app)
        .get(`/api/customers/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/not found/i);
    });

    it('prevents Customer 2 from cancelling Customer 1\'s booking (returns 404)', async () => {
      const bookingId = '123e4567-e89b-12d3-a456-426614174000';

      prismaMock.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId: customer1Id,
        status: BookingStatus.PENDING,
      } as any);

      const response = await request(app)
        .patch(`/api/customers/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/not found/i);
    });
  });

  describe('2. Role Access Controls', () => {
    it('prevents CUSTOMER from accessing driver pricing configuration (returns 403)', async () => {
      const response = await request(app)
        .get('/api/driver/pricing')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(response.status).toBe(403);
    });

    it('allows DRIVER to access driver pricing configuration', async () => {
      prismaMock.pricingSettings.findUnique.mockResolvedValue({
        id: 1,
        cityFlatFare: 150,
        outsideRatePerKm: 40,
        updatedAt: new Date(),
      } as any);

      const response = await request(app)
        .get('/api/driver/pricing')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('3. Password Reset Token Type Enforcement', () => {
    it('rejects using a standard access token for password reset with 401', () => {
      expect(() => verifyPasswordResetToken(customer1Token)).toThrow();
    });

    it('validates a proper password reset token', () => {
      const resetToken = generatePasswordResetToken(customer1Id, '+213555000001');
      const payload = verifyPasswordResetToken(resetToken);
      expect(payload.userId).toBe(customer1Id);
      expect(payload.type).toBe('password_reset');
    });
  });

  describe('4. Security Headers & Sensitive Data Safeguards', () => {
    it('returns Helmet HTTP security headers on API responses', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });
});
