import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import jwt from 'jsonwebtoken';
import { BookingStatus } from '@prisma/client';
import { BookingStateMachine } from '../src/utils/booking-state-machine';
import { MapsService } from '../src/services/maps.service';
import { PricingService } from '../src/services/pricing.service';

vi.mock('../src/services/maps.service', () => ({
  MapsService: { getRoute: vi.fn() },
}));

vi.mock('../src/services/pricing.service', () => ({
  PricingService: { calculatePrice: vi.fn() },
}));

describe('Phase 4 — End-to-End Hardening & Concurrency Tests', () => {
  const customerId = 'cust-phase4';
  const driverId1 = 'driver-1';
  const driverId2 = 'driver-2';
  let customerToken: string;
  let driver1Token: string;
  let driver2Token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    customerToken = jwt.sign({ userId: customerId, role: 'CUSTOMER' }, process.env.JWT_SECRET || 'fallback_secret');
    driver1Token = jwt.sign({ userId: driverId1, role: 'DRIVER' }, process.env.JWT_SECRET || 'fallback_secret');
    driver2Token = jwt.sign({ userId: driverId2, role: 'DRIVER' }, process.env.JWT_SECRET || 'fallback_secret');
  });

  describe('1. Active Booking Hardening', () => {
    it('rejects new booking request if customer already has an active booking', async () => {
      prismaMock.booking.findFirst.mockResolvedValue({
        id: 'active-booking-1',
        customerId,
        status: BookingStatus.ACCEPTED,
      } as any);

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickup: { address: 'A', latitude: 36.07, longitude: 4.76 },
          destination: { address: 'B', latitude: 36.08, longitude: 4.77 },
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/active ride booking in progress/i);
    });
  });

  describe('2. State Machine Transitions', () => {
    it('allows valid sequence: PENDING -> ACCEPTED -> DRIVER_ARRIVING -> ARRIVED -> IN_PROGRESS -> COMPLETED', () => {
      expect(BookingStateMachine.isTransitionAllowed(BookingStatus.PENDING, BookingStatus.ACCEPTED)).toBe(true);
      expect(BookingStateMachine.isTransitionAllowed(BookingStatus.ACCEPTED, BookingStatus.DRIVER_ARRIVING)).toBe(true);
      expect(BookingStateMachine.isTransitionAllowed(BookingStatus.DRIVER_ARRIVING, BookingStatus.ARRIVED)).toBe(true);
      expect(BookingStateMachine.isTransitionAllowed(BookingStatus.ARRIVED, BookingStatus.IN_PROGRESS)).toBe(true);
      expect(BookingStateMachine.isTransitionAllowed(BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED)).toBe(true);
    });

    it('rejects illegal transitions with 400', () => {
      expect(() => BookingStateMachine.validateTransition(BookingStatus.PENDING, BookingStatus.COMPLETED)).toThrow();
      expect(() => BookingStateMachine.validateTransition(BookingStatus.COMPLETED, BookingStatus.IN_PROGRESS)).toThrow();
      expect(() => BookingStateMachine.validateTransition(BookingStatus.CANCELLED, BookingStatus.ACCEPTED)).toThrow();
    });

    it('treats COMPLETED, REJECTED, CANCELLED as terminal states', () => {
      expect(BookingStateMachine.isTerminal(BookingStatus.COMPLETED)).toBe(true);
      expect(BookingStateMachine.isTerminal(BookingStatus.REJECTED)).toBe(true);
      expect(BookingStateMachine.isTerminal(BookingStatus.CANCELLED)).toBe(true);
    });
  });

  describe('3. Driver Acceptance Race Condition Protection', () => {
    it('returns 409 Conflict if driver 2 attempts to accept a booking already claimed by driver 1', async () => {
      const validBookingId = '123e4567-e89b-12d3-a456-426614174000';

      prismaMock.user.findUnique.mockResolvedValue({
        id: driverId1,
        phone: '0550000000',
        name: 'Driver 1',
      } as any);

      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.PENDING,
        driverId: null,
      } as any);

      // Driver 1 update succeeds
      prismaMock.booking.update.mockResolvedValueOnce({
        id: validBookingId,
        status: BookingStatus.ACCEPTED,
        driverId: driverId1,
      } as any);

      const res1 = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/accept`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send();

      expect(res1.status).toBe(200);

      // Driver 2 update fails with P2025 concurrency error
      prismaMock.booking.update.mockRejectedValueOnce({ code: 'P2025' });

      const res2 = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/accept`)
        .set('Authorization', `Bearer ${driver2Token}`)
        .send();

      expect(res2.status).toBe(409);
      expect(res2.body.message).toMatch(/no longer available/i);
    });
  });

  describe('4. Rating Flow Restrictions', () => {
    it('rejects rating submission for a non-COMPLETED ride with 400/409', async () => {
      const validBookingId = '123e4567-e89b-12d3-a456-426614174000';

      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        customerId,
        status: BookingStatus.IN_PROGRESS,
      } as any);

      const response = await request(app)
        .post(`/api/bookings/${validBookingId}/rating`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ score: 5, comment: 'Great ride' });

      expect([400, 409]).toContain(response.status);
    });
  });
});
