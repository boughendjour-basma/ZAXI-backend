import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import jwt from 'jsonwebtoken';
import { BookingStatus, Role } from '@prisma/client';
import { SocketService } from '../src/sockets/socket.service';

describe('Driver Booking Management & Ride Lifecycle API', () => {
  const validDriverId = '123e4567-e89b-42d3-a456-426614174001';
  const validCustomerId = '123e4567-e89b-42d3-a456-426614174002';
  const validBookingId = '123e4567-e89b-42d3-a456-426614174000';

  let validDriverToken: string;
  let customerToken: string;

  beforeEach(() => {
    vi.clearAllMocks();

    validDriverToken = jwt.sign(
      { userId: validDriverId, email: 'driver@example.com', role: Role.DRIVER },
      process.env.JWT_SECRET || 'fallback_secret'
    );

    customerToken = jwt.sign(
      { userId: validCustomerId, email: 'customer@example.com', role: Role.CUSTOMER },
      process.env.JWT_SECRET || 'fallback_secret'
    );
  });

  // ─── 1. Authorization Tests ────────────────────────────────────────────────
  describe('Authorization', () => {
    it('should allow driver to access driver bookings listing', async () => {
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/driver/bookings')
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject unauthenticated requests with 401', async () => {
      const response = await request(app).get('/api/driver/bookings');
      expect(response.status).toBe(401);
    });

    it('should reject customer from viewing driver bookings with 403', async () => {
      const response = await request(app)
        .get('/api/driver/bookings')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject customer from accepting bookings with 403', async () => {
      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/accept`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject customer from rejecting bookings with 403', async () => {
      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/reject`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject customer from starting rides with 403', async () => {
      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/start`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject customer from completing rides with 403', async () => {
      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/complete`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });
  });

  // ─── 2. Listing & Pagination Tests ─────────────────────────────────────────
  describe('Listing & Filtering', () => {
    it('should return pending bookings for driver with customer details', async () => {
      const mockBookings = [
        {
          id: validBookingId,
          status: BookingStatus.PENDING,
          pickupLatitude: 36.75,
          pickupLongitude: 3.04,
          destinationAddress: 'Airport',
          estimatedPrice: 2000,
          distanceKm: 15,
          customer: { name: 'Ahmed', phone: '+213555123456' },
        },
      ];

      prismaMock.booking.findMany.mockResolvedValue(mockBookings as any);
      prismaMock.booking.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/driver/bookings?status=PENDING&page=1&limit=10')
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.bookings).toHaveLength(1);
      expect(response.body.bookings[0].customer.name).toBe('Ahmed');
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should support pagination options', async () => {
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(25);

      const response = await request(app)
        .get('/api/driver/bookings?page=2&limit=5')
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 25,
        totalPages: 5,
      });
    });

    it('should filter by status correctly', async () => {
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/driver/bookings?status=ACCEPTED')
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(200);
      expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: BookingStatus.ACCEPTED,
          }),
        })
      );
    });
  });

  // ─── 3. Validation Tests ───────────────────────────────────────────────────
  describe('Input Validation', () => {
    it('should reject invalid UUID parameters with 400', async () => {
      const response = await request(app)
        .patch('/api/driver/bookings/invalid-uuid-format/accept')
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(400);
    });

    it('should reject invalid status filter with 400', async () => {
      const response = await request(app)
        .get('/api/driver/bookings?status=INVALID_STATUS')
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(400);
    });

    it('should reject negative pagination values with 400', async () => {
      const response = await request(app)
        .get('/api/driver/bookings?page=-1&limit=10')
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(400);
    });
  });

  // ─── 4. Valid Status Transitions ────────────────────────────────────────────
  describe('Valid Ride Lifecycle Transitions', () => {
    it('should accept a PENDING booking (PENDING -> ACCEPTED)', async () => {
      const emitSpy = vi.spyOn(SocketService, 'emitBookingAccepted');

      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.PENDING,
        driverId: null,
      } as any);

      prismaMock.booking.update.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.ACCEPTED,
        driverId: validDriverId,
      } as any);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/accept`)
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.booking.status).toBe(BookingStatus.ACCEPTED);
      expect(emitSpy).toHaveBeenCalledWith({
        bookingId: validBookingId,
        status: BookingStatus.ACCEPTED,
      });
    });

    it('should reject a PENDING booking (PENDING -> CANCELLED)', async () => {
      const emitSpy = vi.spyOn(SocketService, 'emitBookingCancelled');

      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.PENDING,
        driverId: null,
      } as any);

      prismaMock.booking.update.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.CANCELLED,
      } as any);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/reject`)
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.booking.status).toBe(BookingStatus.CANCELLED);
      expect(emitSpy).toHaveBeenCalledWith({
        bookingId: validBookingId,
        status: BookingStatus.CANCELLED,
      });
    });

    it('should start an ACCEPTED ride (ACCEPTED -> IN_PROGRESS)', async () => {
      const emitSpy = vi.spyOn(SocketService, 'emitBookingStarted');

      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.ACCEPTED,
        driverId: validDriverId,
      } as any);

      prismaMock.booking.update.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.IN_PROGRESS,
        driverId: validDriverId,
      } as any);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/start`)
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.booking.status).toBe(BookingStatus.IN_PROGRESS);
      expect(emitSpy).toHaveBeenCalledWith({
        bookingId: validBookingId,
        status: BookingStatus.IN_PROGRESS,
      });
    });

    it('should complete an IN_PROGRESS ride (IN_PROGRESS -> COMPLETED)', async () => {
      const emitSpy = vi.spyOn(SocketService, 'emitBookingCompleted');

      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.IN_PROGRESS,
        driverId: validDriverId,
      } as any);

      prismaMock.booking.update.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.COMPLETED,
        driverId: validDriverId,
      } as any);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/complete`)
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.booking.status).toBe(BookingStatus.COMPLETED);
      expect(emitSpy).toHaveBeenCalledWith({
        bookingId: validBookingId,
        status: BookingStatus.COMPLETED,
      });
    });
  });

  // ─── 5. Forbidden Transitions Tests ─────────────────────────────────────────
  describe('Forbidden Transitions', () => {
    it('should reject COMPLETED -> ACCEPTED transition', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.COMPLETED,
        driverId: validDriverId,
      } as any);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/accept`)
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject CANCELLED -> START (IN_PROGRESS) transition', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.CANCELLED,
        driverId: null,
      } as any);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/start`)
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject PENDING -> COMPLETED transition', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.PENDING,
        driverId: null,
      } as any);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/complete`)
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject ACCEPTED -> COMPLETED transition', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.ACCEPTED,
        driverId: validDriverId,
      } as any);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/complete`)
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ─── 6. Concurrency & Race Condition Tests ─────────────────────────────────
  describe('Concurrency & Race Condition Handling', () => {
    it('should return 409 Conflict when a booking is accepted simultaneously by another action', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: validBookingId,
        status: BookingStatus.PENDING,
        driverId: null,
      } as any);

      // Simulate atomic update failure due to concurrent modification
      const p2025Error: any = new Error('Record to update not found');
      p2025Error.code = 'P2025';
      prismaMock.booking.update.mockRejectedValue(p2025Error);

      const response = await request(app)
        .patch(`/api/driver/bookings/${validBookingId}/accept`)
        .set('Authorization', `Bearer ${validDriverToken}`);

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/conflict|available|pending/i);
    });
  });
});
