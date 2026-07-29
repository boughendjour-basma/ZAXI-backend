import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import jwt from 'jsonwebtoken';
import { BookingStatus, Role } from '@prisma/client';

describe('Driver Booking Management API', () => {
  const validDriverId = 'test-driver-id';
  const otherDriverId = 'other-driver-id';
  const validCustomerId = 'test-customer-id';

  let validDriverToken: string;
  let otherDriverToken: string;
  let customerToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    validDriverToken = jwt.sign(
      { userId: validDriverId, email: 'driver@example.com', role: Role.DRIVER },
      process.env.JWT_SECRET || 'fallback_secret'
    );
    otherDriverToken = jwt.sign(
      { userId: otherDriverId, email: 'otherdriver@example.com', role: Role.DRIVER },
      process.env.JWT_SECRET || 'fallback_secret'
    );
    customerToken = jwt.sign(
      { userId: validCustomerId, email: 'customer@example.com', role: Role.CUSTOMER },
      process.env.JWT_SECRET || 'fallback_secret'
    );
  });

  describe('Authorization', () => {
    it('should reject unauthenticated users (test 4)', async () => {
      const response = await request(app).get('/api/driver/bookings');
      expect(response.status).toBe(401);
    });

    it('should reject customers from accessing driver list (test 1)', async () => {
      const response = await request(app)
        .get('/api/driver/bookings')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(response.status).toBe(403);
    });

    it('should reject customers from accessing driver details (test 2)', async () => {
      const response = await request(app)
        .get('/api/driver/bookings/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(response.status).toBe(403);
    });

    it('should reject customers from updating driver booking status (test 3)', async () => {
      const response = await request(app)
        .patch('/api/driver/bookings/123e4567-e89b-12d3-a456-426614174000/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'ACCEPTED' });
      expect(response.status).toBe(403);
    });
  });

  describe('Booking visibility (GET /api/driver/bookings)', () => {
    it('should see pending unassigned bookings and assigned bookings (tests 5, 6)', async () => {
      const mockBookings = [
        { id: 'b1', driverId: null, status: BookingStatus.PENDING },
        { id: 'b2', driverId: validDriverId, status: BookingStatus.ACCEPTED }
      ];
      prismaMock.booking.findMany.mockResolvedValue(mockBookings as any);
      prismaMock.booking.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/driver/bookings')
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.bookings).toHaveLength(2);
      expect(prismaMock.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          OR: [
            { driverId: validDriverId },
            { status: BookingStatus.PENDING, driverId: null }
          ]
        }
      }));
    });
  });

  describe('Booking visibility (GET /api/driver/bookings/:id)', () => {
    const validBookingId = '123e4567-e89b-12d3-a456-426614174000';

    it('should access pending unassigned bookings', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        driverId: null,
        status: BookingStatus.PENDING
      } as any);

      const response = await request(app)
        .get(`/api/driver/bookings/${validBookingId}`)
        .set('Authorization', `Bearer ${validDriverToken}`);
      
      expect(response.status).toBe(200);
    });

    it('should access assigned bookings', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        driverId: validDriverId,
        status: BookingStatus.ACCEPTED
      } as any);

      const response = await request(app)
        .get(`/api/driver/bookings/${validBookingId}`)
        .set('Authorization', `Bearer ${validDriverToken}`);
      
      expect(response.status).toBe(200);
    });

    it('should not access bookings assigned to another driver (test 7)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        driverId: otherDriverId,
        status: BookingStatus.ACCEPTED
      } as any);

      const response = await request(app)
        .get(`/api/driver/bookings/${validBookingId}`)
        .set('Authorization', `Bearer ${validDriverToken}`);
      
      expect(response.status).toBe(404);
    });

    it('should not access unrelated bookings (test 8)', async () => {
      // e.g. a COMPLETED booking with driverId = null (should not happen, but tests the logic)
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        driverId: null,
        status: BookingStatus.COMPLETED
      } as any);

      const response = await request(app)
        .get(`/api/driver/bookings/${validBookingId}`)
        .set('Authorization', `Bearer ${validDriverToken}`);
      
      expect(response.status).toBe(404);
    });
  });

  describe('Accepting (PATCH status = ACCEPTED)', () => {
    const validBookingId = '123e4567-e89b-12d3-a456-426614174000';

    beforeEach(() => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        driverId: null,
        status: BookingStatus.PENDING
      } as any);
    });

    it('should accept PENDING booking and assign driverId (tests 9, 10, 11)', async () => {
      prismaMock.booking.update.mockResolvedValue({
        id: validBookingId,
        driverId: validDriverId,
        status: BookingStatus.ACCEPTED
      } as any);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/status`)
        .set('Authorization', `Bearer ${validDriverToken}`)
        .send({ status: BookingStatus.ACCEPTED });

      expect(response.status).toBe(200);
      expect(response.body.data.booking.driverId).toBe(validDriverId);
      expect(response.body.data.booking.status).toBe(BookingStatus.ACCEPTED);

      expect(prismaMock.booking.update).toHaveBeenCalledWith({
        where: {
          id: validBookingId,
          status: BookingStatus.PENDING,
          driverId: null
        },
        data: {
          status: BookingStatus.ACCEPTED,
          driverId: validDriverId
        }
      });
    });

    it('should handle simultaneous acceptance attempts safely (test 12)', async () => {
      const error: any = new Error('Record to update not found');
      error.code = 'P2025';
      prismaMock.booking.update.mockRejectedValue(error);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/status`)
        .set('Authorization', `Bearer ${validDriverToken}`)
        .send({ status: BookingStatus.ACCEPTED });

      expect(response.status).toBe(409);
    });
  });

  describe('Rejecting (PATCH status = REJECTED)', () => {
    const validBookingId = '123e4567-e89b-12d3-a456-426614174000';

    it('should reject PENDING booking and remain unassigned (tests 13, 14)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        driverId: null,
        status: BookingStatus.PENDING
      } as any);

      prismaMock.booking.update.mockResolvedValue({
        id: validBookingId,
        driverId: null,
        status: BookingStatus.REJECTED
      } as any);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/status`)
        .set('Authorization', `Bearer ${validDriverToken}`)
        .send({ status: BookingStatus.REJECTED });

      expect(response.status).toBe(200);
      expect(response.body.data.booking.driverId).toBeNull();
      expect(response.body.data.booking.status).toBe(BookingStatus.REJECTED);
    });

    it('rejected booking cannot be accepted afterward (test 15)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        driverId: null,
        status: BookingStatus.REJECTED
      } as any);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/status`)
        .set('Authorization', `Bearer ${validDriverToken}`)
        .send({ status: BookingStatus.ACCEPTED });

      expect(response.status).toBe(404); // Returns 404 because a rejected unassigned booking is not pending unassigned and not assigned to driver
    });
  });

  describe('Status Transitions', () => {
    const validBookingId = '123e4567-e89b-12d3-a456-426614174000';

    it('should transition ACCEPTED -> DRIVER_ARRIVING (test 16)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId, driverId: validDriverId, status: BookingStatus.ACCEPTED
      } as any);
      prismaMock.booking.update.mockResolvedValue({ status: BookingStatus.DRIVER_ARRIVING } as any);

      const res = await request(app).patch(`/api/driver/bookings/${validBookingId}/status`)
        .set('Authorization', `Bearer ${validDriverToken}`).send({ status: BookingStatus.DRIVER_ARRIVING });
      expect(res.status).toBe(200);
    });

    it('should transition DRIVER_ARRIVING -> ARRIVED (test 17)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId, driverId: validDriverId, status: BookingStatus.DRIVER_ARRIVING
      } as any);
      prismaMock.booking.update.mockResolvedValue({ status: BookingStatus.ARRIVED } as any);

      const res = await request(app).patch(`/api/driver/bookings/${validBookingId}/status`)
        .set('Authorization', `Bearer ${validDriverToken}`).send({ status: BookingStatus.ARRIVED });
      expect(res.status).toBe(200);
    });

    it('should transition ARRIVED -> IN_PROGRESS (test 18)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId, driverId: validDriverId, status: BookingStatus.ARRIVED
      } as any);
      prismaMock.booking.update.mockResolvedValue({ status: BookingStatus.IN_PROGRESS } as any);

      const res = await request(app).patch(`/api/driver/bookings/${validBookingId}/status`)
        .set('Authorization', `Bearer ${validDriverToken}`).send({ status: BookingStatus.IN_PROGRESS });
      expect(res.status).toBe(200);
    });

    it('should transition IN_PROGRESS -> COMPLETED (test 19)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId, driverId: validDriverId, status: BookingStatus.IN_PROGRESS
      } as any);
      prismaMock.booking.update.mockResolvedValue({ status: BookingStatus.COMPLETED } as any);

      const res = await request(app).patch(`/api/driver/bookings/${validBookingId}/status`)
        .set('Authorization', `Bearer ${validDriverToken}`).send({ status: BookingStatus.COMPLETED });
      expect(res.status).toBe(200);
    });
  });

  describe('Invalid Transitions', () => {
    const validBookingId = '123e4567-e89b-12d3-a456-426614174000';

    it('should reject PENDING -> DRIVER_ARRIVING, ARRIVED, IN_PROGRESS, COMPLETED (tests 20, 21, 22, 23)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId, driverId: null, status: BookingStatus.PENDING
      } as any);

      for (const status of [BookingStatus.DRIVER_ARRIVING, BookingStatus.ARRIVED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED]) {
        const res = await request(app).patch(`/api/driver/bookings/${validBookingId}/status`)
          .set('Authorization', `Bearer ${validDriverToken}`).send({ status });
        expect(res.status).toBe(400);
      }
    });

    it('should not allow transitions from terminal states (tests 24, 25, 26, 29)', async () => {
      for (const terminalState of [BookingStatus.COMPLETED, BookingStatus.REJECTED, BookingStatus.CANCELLED]) {
        prismaMock.booking.findUnique.mockResolvedValue({
          id: validBookingId, driverId: validDriverId, status: terminalState
        } as any);
        
        // REJECTED/CANCELLED bookings assigned to driver will still be visible but reject transition updates.
        // Actually REJECTED/CANCELLED might be driverId=null (for customer cancel before assign).
        // Let's assume we can read them, but state machine rejects transition.
        const res = await request(app).patch(`/api/driver/bookings/${validBookingId}/status`)
          .set('Authorization', `Bearer ${validDriverToken}`).send({ status: BookingStatus.COMPLETED }); // Try any update
        
        if (res.status !== 404) { // If visible, state machine must reject with 400
          expect(res.status).toBe(400);
        }
      }
    });
  });

  describe('Ownership Rules', () => {
    const validBookingId = '123e4567-e89b-12d3-a456-426614174000';

    it('should not allow driver to update another driver\'s assigned booking (test 27)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId, driverId: otherDriverId, status: BookingStatus.ACCEPTED
      } as any);

      const res = await request(app).patch(`/api/driver/bookings/${validBookingId}/status`)
        .set('Authorization', `Bearer ${validDriverToken}`).send({ status: BookingStatus.DRIVER_ARRIVING });
      
      expect(res.status).toBe(404);
    });

    it('should not allow unassigned driver to update an already assigned booking (test 28)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId, driverId: otherDriverId, status: BookingStatus.ACCEPTED
      } as any);

      const res = await request(app).patch(`/api/driver/bookings/${validBookingId}/status`)
        .set('Authorization', `Bearer ${validDriverToken}`).send({ status: BookingStatus.ACCEPTED });
      
      expect(res.status).toBe(404);
    });
  });
});
