import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import jwt from 'jsonwebtoken';
import { BookingStatus, Role } from '@prisma/client';
import { SocketService } from '../src/sockets/socket.service';
import { MapsService } from '../src/services/maps.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const DRIVER_ID     = '123e4567-e89b-42d3-a456-426614174001';
const CUSTOMER_ID   = '123e4567-e89b-42d3-a456-426614174002';
const OTHER_USER_ID = '123e4567-e89b-42d3-a456-426614174003';
const BOOKING_ID    = '123e4567-e89b-42d3-a456-426614174000';

function makeAcceptedBooking(overrides: Record<string, any> = {}) {
  return {
    id: BOOKING_ID,
    status: BookingStatus.ACCEPTED,
    customerId: CUSTOMER_ID,
    driverId: DRIVER_ID,
    pickupLatitude: '36.7500000',
    pickupLongitude: '3.0400000',
    destinationLatitude: '36.8000000',
    destinationLongitude: '3.0600000',
    pickupAddress: 'BBA City Centre',
    destinationAddress: 'Airport',
    estimatedPrice: 2000,
    distanceKm: '15.00',
    durationMinutes: 25,
    ...overrides,
  };
}

function makeLocation(overrides: Record<string, any> = {}) {
  return {
    id: 'loc-uuid-001',
    bookingId: BOOKING_ID,
    driverId: DRIVER_ID,
    latitude: 36.75,
    longitude: 3.04,
    heading: 90,
    speed: 45,
    accuracy: 5,
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Driver Location Tracking & Real-Time ETA API', () => {
  let driverToken: string;
  let customerToken: string;
  let otherToken: string;

  beforeEach(() => {
    vi.clearAllMocks();

    driverToken = jwt.sign(
      { userId: DRIVER_ID, email: 'driver@zaxi.dz', role: Role.DRIVER },
      process.env.JWT_SECRET || 'fallback_secret'
    );
    customerToken = jwt.sign(
      { userId: CUSTOMER_ID, email: 'customer@zaxi.dz', role: Role.CUSTOMER },
      process.env.JWT_SECRET || 'fallback_secret'
    );
    otherToken = jwt.sign(
      { userId: OTHER_USER_ID, email: 'other@zaxi.dz', role: Role.CUSTOMER },
      process.env.JWT_SECRET || 'fallback_secret'
    );
  });

  // ─── 1. Valid Location Update ──────────────────────────────────────────────
  describe('PATCH /api/driver/bookings/:id/location — Valid Update', () => {
    it('should accept a valid location update from the assigned driver', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(null);
      prismaMock.driverLocation.upsert.mockResolvedValue(makeLocation() as any);

      const emitSpy = vi.spyOn(SocketService, 'emitDriverLocationUpdate');

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04, heading: 90, speed: 45, accuracy: 5 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.location.latitude).toBe(36.75);
      expect(emitSpy).toHaveBeenCalledWith(
        BOOKING_ID,
        expect.objectContaining({ bookingId: BOOKING_ID, latitude: 36.75, longitude: 3.04 })
      );
    });

    it('should accept location update for IN_PROGRESS booking', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(
        makeAcceptedBooking({ status: BookingStatus.IN_PROGRESS }) as any
      );
      prismaMock.driverLocation.findUnique.mockResolvedValue(null);
      prismaMock.driverLocation.upsert.mockResolvedValue(makeLocation() as any);

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04 });

      expect(res.status).toBe(200);
    });

    it('should accept location update with only required fields (lat/lng)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(null);
      prismaMock.driverLocation.upsert.mockResolvedValue(
        makeLocation({ heading: null, speed: null, accuracy: null }) as any
      );

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04 });

      expect(res.status).toBe(200);
    });

    it('should upsert (not create duplicate) on repeated location updates', async () => {
      const existing = makeLocation({ latitude: 36.70, longitude: 3.00 });
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(existing as any);
      prismaMock.driverLocation.upsert.mockResolvedValue(makeLocation() as any);

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.76, longitude: 3.05 }); // > 20m away from 36.70, 3.00

      expect(res.status).toBe(200);
      expect(prismaMock.driverLocation.upsert).toHaveBeenCalledTimes(1);
    });
  });

  // ─── 2. Authorization Tests ────────────────────────────────────────────────
  describe('PATCH /api/driver/bookings/:id/location — Authorization', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .send({ latitude: 36.75, longitude: 3.04 });

      expect(res.status).toBe(401);
    });

    it('should return 403 when a customer tries to push a location update', async () => {
      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ latitude: 36.75, longitude: 3.04 });

      expect(res.status).toBe(403);
    });

    it('should return 404 when driver updates a booking that does not belong to them', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(
        makeAcceptedBooking({ driverId: OTHER_USER_ID }) as any
      );

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04 });

      expect(res.status).toBe(404);
    });

    it('should return 404 when booking does not exist', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04 });

      expect(res.status).toBe(404);
    });
  });

  // ─── 3. Coordinate Validation ──────────────────────────────────────────────
  describe('PATCH /api/driver/bookings/:id/location — Invalid Coordinates', () => {
    it('should reject latitude > 90', async () => {
      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 91, longitude: 3.04 });

      expect(res.status).toBe(400);
    });

    it('should reject latitude < -90', async () => {
      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: -91, longitude: 3.04 });

      expect(res.status).toBe(400);
    });

    it('should reject longitude > 180', async () => {
      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 181 });

      expect(res.status).toBe(400);
    });

    it('should reject longitude < -180', async () => {
      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: -181 });

      expect(res.status).toBe(400);
    });

    it('should reject negative speed', async () => {
      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04, speed: -5 });

      expect(res.status).toBe(400);
    });

    it('should reject negative accuracy', async () => {
      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04, accuracy: -1 });

      expect(res.status).toBe(400);
    });

    it('should reject heading > 360', async () => {
      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04, heading: 361 });

      expect(res.status).toBe(400);
    });

    it('should reject missing latitude', async () => {
      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ longitude: 3.04 });

      expect(res.status).toBe(400);
    });

    it('should reject invalid UUID', async () => {
      const res = await request(app)
        .patch('/api/driver/bookings/not-a-uuid/location')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04 });

      expect(res.status).toBe(400);
    });
  });

  // ─── 4. Terminal State Rejection ──────────────────────────────────────────
  describe('PATCH /api/driver/bookings/:id/location — Terminal States', () => {
    it('should return 410 Gone when booking is COMPLETED', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(
        makeAcceptedBooking({ status: BookingStatus.COMPLETED }) as any
      );

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04 });

      expect(res.status).toBe(410);
    });

    it('should return 410 Gone when booking is CANCELLED', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(
        makeAcceptedBooking({ status: BookingStatus.CANCELLED }) as any
      );

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04 });

      expect(res.status).toBe(410);
    });

    it('should return 400 when booking is PENDING (not yet active)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(
        makeAcceptedBooking({ status: BookingStatus.PENDING, driverId: DRIVER_ID }) as any
      );

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04 });

      expect(res.status).toBe(400);
    });
  });

  // ─── 5. Movement Threshold (< 20m skipped) ────────────────────────────────
  describe('PATCH /api/driver/bookings/:id/location — Movement Threshold', () => {
    it('should skip DB write and socket emit when moved < 20m, heading < 15° and < 5s elapsed', async () => {
      // Same coordinate — 0 meters distance
      const existing = makeLocation({
        latitude: 36.75,
        longitude: 3.04,
        heading: 90,
        updatedAt: new Date(Date.now() - 2000), // 2s ago
      });

      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(existing as any);

      const emitSpy = vi.spyOn(SocketService, 'emitDriverLocationUpdate');

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75000, longitude: 3.04000, heading: 91 }); // ~0m movement, 1° heading

      expect(res.status).toBe(200);
      expect(prismaMock.driverLocation.upsert).not.toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should proceed with update when moved > 20m', async () => {
      // 36.751 is ~111m north of 36.75 — clearly > 20m
      const existing = makeLocation({
        latitude: 36.75,
        longitude: 3.04,
        heading: 90,
        updatedAt: new Date(Date.now() - 2000),
      });

      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(existing as any);
      prismaMock.driverLocation.upsert.mockResolvedValue(makeLocation({ latitude: 36.751 }) as any);

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.751, longitude: 3.04, heading: 90 });

      expect(res.status).toBe(200);
      expect(prismaMock.driverLocation.upsert).toHaveBeenCalledTimes(1);
    });
  });

  // ─── 6. Socket.IO Emission ────────────────────────────────────────────────
  describe('Socket.IO Event Emission', () => {
    it('should emit driver:location:update with correct payload including lastSeen', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(null);
      const now = new Date();
      prismaMock.driverLocation.upsert.mockResolvedValue(makeLocation({ updatedAt: now }) as any);

      const emitSpy = vi.spyOn(SocketService, 'emitDriverLocationUpdate');

      await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04, heading: 90, speed: 45, accuracy: 5 });

      expect(emitSpy).toHaveBeenCalledWith(
        BOOKING_ID,
        expect.objectContaining({
          bookingId: BOOKING_ID,
          latitude: 36.75,
          longitude: 3.04,
          heading: 90,
          speed: 45,
          accuracy: 5,
          updatedAt: expect.any(String),
          lastSeen: expect.any(String),
        })
      );
    });
  });

  // ─── 7. Customer Retrieves Location ──────────────────────────────────────
  describe('GET /api/bookings/:id/location — Customer Retrieval', () => {
    it('should allow the booking customer to retrieve live location', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(makeLocation() as any);
      vi.spyOn(MapsService, 'calculateETA').mockResolvedValue({ distanceKm: 2.3, durationMinutes: 6 });

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.location.latitude).toBe(36.75);
      expect(res.body.data.trackingStatus).toBe('LIVE');
      expect(res.body.data.eta).toEqual({ distanceKm: 2.3, durationMinutes: 6 });
    });

    it('should allow the assigned driver to retrieve their own location', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(makeLocation() as any);
      vi.spyOn(MapsService, 'calculateETA').mockResolvedValue({ distanceKm: 2.3, durationMinutes: 6 });

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 401 for unauthenticated location retrieval', async () => {
      const res = await request(app).get(`/api/bookings/${BOOKING_ID}/location`);
      expect(res.status).toBe(401);
    });

    it('should return 404 when unrelated customer tries to access another booking location', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 when booking does not exist', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 410 Gone when booking is COMPLETED', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(
        makeAcceptedBooking({ status: BookingStatus.COMPLETED }) as any
      );

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(410);
    });

    it('should return 410 Gone when booking is CANCELLED', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(
        makeAcceptedBooking({ status: BookingStatus.CANCELLED }) as any
      );

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(410);
    });

    it('should return INITIALIZING status when no location exists yet', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.trackingStatus).toBe('INITIALIZING');
      expect(res.body.data.location).toBeNull();
    });
  });

  // ─── 8. Stale Location Detection ─────────────────────────────────────────
  describe('GET /api/bookings/:id/location — Stale Location Heartbeat', () => {
    it('should mark location as STALE_LOCATION when updated more than 30s ago', async () => {
      const staleTime = new Date(Date.now() - 35000); // 35 seconds ago
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(
        makeLocation({ updatedAt: staleTime }) as any
      );
      vi.spyOn(MapsService, 'calculateETA').mockResolvedValue({ distanceKm: 1, durationMinutes: 3 });

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.trackingStatus).toBe('STALE_LOCATION');
      expect(res.body.data.isStale).toBe(true);
    });

    it('should mark location as LIVE when updated within 30s', async () => {
      const recentTime = new Date(Date.now() - 5000); // 5s ago
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(
        makeLocation({ updatedAt: recentTime }) as any
      );
      vi.spyOn(MapsService, 'calculateETA').mockResolvedValue({ distanceKm: 1, durationMinutes: 3 });

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.trackingStatus).toBe('LIVE');
      expect(res.body.data.isStale).toBe(false);
    });
  });

  // ─── 9. Phase-Aware ETA ──────────────────────────────────────────────────
  describe('GET /api/bookings/:id/location — Phase-Aware ETA', () => {
    it('should compute ETA from driver to PICKUP when status is ACCEPTED', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(
        makeAcceptedBooking({ status: BookingStatus.ACCEPTED }) as any
      );
      prismaMock.driverLocation.findUnique.mockResolvedValue(makeLocation() as any);

      const etaSpy = vi.spyOn(MapsService, 'calculateETA').mockResolvedValue({
        distanceKm: 2.3,
        durationMinutes: 6,
      });

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      // Should be calling ETA with pickup coords (36.75, 3.04)
      expect(etaSpy).toHaveBeenCalledWith(
        { latitude: 36.75, longitude: 3.04 }, // driver location
        expect.objectContaining({ latitude: 36.75, longitude: 3.04 }) // pickup (same in fixture)
      );
    });

    it('should compute ETA from driver to DESTINATION when status is IN_PROGRESS', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(
        makeAcceptedBooking({ status: BookingStatus.IN_PROGRESS }) as any
      );
      prismaMock.driverLocation.findUnique.mockResolvedValue(makeLocation() as any);

      const etaSpy = vi.spyOn(MapsService, 'calculateETA').mockResolvedValue({
        distanceKm: 12.5,
        durationMinutes: 20,
      });

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      // Should be calling ETA with destination coords (36.80, 3.06)
      expect(etaSpy).toHaveBeenCalledWith(
        { latitude: 36.75, longitude: 3.04 }, // driver location
        expect.objectContaining({ latitude: 36.8, longitude: 3.06 }) // destination
      );
    });

    it('should return null eta gracefully when ETA calculation fails', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(makeLocation() as any);
      vi.spyOn(MapsService, 'calculateETA').mockRejectedValue(new Error('ETA unavailable'));

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.eta).toBeNull();
    });
  });

  // ─── 10. lastSeen Timestamp ───────────────────────────────────────────────
  describe('GET /api/bookings/:id/location — lastSeen Timestamp', () => {
    it('should include lastSeen timestamp in the location response', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(makeLocation() as any);
      vi.spyOn(MapsService, 'calculateETA').mockResolvedValue({ distanceKm: 1, durationMinutes: 2 });

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.location.lastSeen).toBeDefined();
      expect(typeof res.body.data.location.lastSeen).toBe('string');
    });
  });

  // ─── 11. Accuracy Field Stored Correctly ─────────────────────────────────
  describe('Accuracy field', () => {
    it('should store and return the accuracy field from location update', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(makeAcceptedBooking() as any);
      prismaMock.driverLocation.findUnique.mockResolvedValue(null);
      prismaMock.driverLocation.upsert.mockResolvedValue(makeLocation({ accuracy: 8 }) as any);

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.75, longitude: 3.04, accuracy: 8 });

      expect(res.status).toBe(200);
      expect(prismaMock.driverLocation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ accuracy: 8 }),
          update: expect.objectContaining({ accuracy: 8 }),
        })
      );
    });
  });
});
