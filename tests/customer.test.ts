import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import jwt from 'jsonwebtoken';
import { Role, BookingStatus } from '@prisma/client';

const CUSTOMER_ID = '123e4567-e89b-42d3-a456-426614174001';
const OTHER_CUSTOMER_ID = '123e4567-e89b-42d3-a456-426614174099';
const DRIVER_ID = '123e4567-e89b-42d3-a456-426614174002';
const BOOKING_ID = '123e4567-e89b-42d3-a456-426614174000';
const FAVORITE_ID = '123e4567-e89b-42d3-a456-426614174088';
const NOTIFICATION_ID = '123e4567-e89b-42d3-a456-426614174077';

const customerToken = jwt.sign(
  { userId: CUSTOMER_ID, role: Role.CUSTOMER, phone: '+213555123456' },
  process.env.JWT_SECRET || 'fallback_secret'
);

const otherCustomerToken = jwt.sign(
  { userId: OTHER_CUSTOMER_ID, role: Role.CUSTOMER, phone: '+213999999999' },
  process.env.JWT_SECRET || 'fallback_secret'
);

const driverToken = jwt.sign(
  { userId: DRIVER_ID, role: Role.DRIVER, phone: '+213666777888' },
  process.env.JWT_SECRET || 'fallback_secret'
);

describe('Step 12 — Customer App Backend Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. Customer Booking Management & Privacy ──────────────────────────────
  describe('Customer Booking Management', () => {
    it('GET /api/customers/bookings should return paginated customer bookings', async () => {
      prismaMock.booking.findMany.mockResolvedValue([
        {
          id: BOOKING_ID,
          status: BookingStatus.PENDING,
          pickupAddress: 'Algiers Center',
          destinationAddress: 'Airport',
          estimatedPrice: 1500,
          distanceKm: 20,
          scheduledAt: null,
          createdAt: new Date(),
          driverId: null,
          driver: null,
        },
      ] as any);
      prismaMock.booking.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/customers/bookings?page=1&limit=10')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('GET /api/customers/bookings/:id should hide driver phone if PENDING', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        status: BookingStatus.PENDING,
        pickupAddress: 'A',
        destinationAddress: 'B',
        pickupLatitude: 36.7,
        pickupLongitude: 3.0,
        destinationLatitude: 36.8,
        destinationLongitude: 3.1,
        estimatedPrice: 1000,
        distanceKm: 10,
        durationMinutes: 15,
        pricingType: 'DISTANCE',
        scheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        driverId: DRIVER_ID,
        driver: { id: DRIVER_ID, name: 'Karim', phone: '+213666777888', profilePhoto: null },
      } as any);

      const res = await request(app)
        .get(`/api/customers/bookings/${BOOKING_ID}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.driver).toBeDefined();
      expect(res.body.data.booking.driver.phone).toBeUndefined();
    });

    it('GET /api/customers/bookings/:id should return 404 for another user booking', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        status: BookingStatus.PENDING,
      } as any);

      const res = await request(app)
        .get(`/api/customers/bookings/${BOOKING_ID}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── 2. Customer Cancellation ──────────────────────────────────────────────
  describe('Customer Cancel Ride', () => {
    it('PATCH /api/customers/bookings/:id/cancel allows cancelling PENDING booking', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        status: BookingStatus.PENDING,
      } as any);
      prismaMock.booking.update.mockResolvedValue({
        id: BOOKING_ID,
        status: BookingStatus.CANCELLED,
      } as any);

      const res = await request(app)
        .patch(`/api/customers/bookings/${BOOKING_ID}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('CANCELLED');
    });

    it('PATCH /api/customers/bookings/:id/cancel allows cancelling ACCEPTED booking', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        status: BookingStatus.ACCEPTED,
      } as any);
      prismaMock.booking.update.mockResolvedValue({
        id: BOOKING_ID,
        status: BookingStatus.CANCELLED,
      } as any);

      const res = await request(app)
        .patch(`/api/customers/bookings/${BOOKING_ID}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('CANCELLED');
    });

    it('PATCH /api/customers/bookings/:id/cancel rejects cancelling IN_PROGRESS booking', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        status: BookingStatus.IN_PROGRESS,
      } as any);

      const res = await request(app)
        .patch(`/api/customers/bookings/${BOOKING_ID}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(409);
    });

    it('PATCH /api/customers/bookings/:id/cancel rejects cancelling COMPLETED booking', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        status: BookingStatus.COMPLETED,
      } as any);

      const res = await request(app)
        .patch(`/api/customers/bookings/${BOOKING_ID}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(409);
    });
  });

  // ─── 3. Favorite Locations ─────────────────────────────────────────────────
  describe('Favorite Locations System', () => {
    it('POST /api/customers/favorites creates a favorite location', async () => {
      prismaMock.favoriteLocation.create.mockResolvedValue({
        id: FAVORITE_ID,
        userId: CUSTOMER_ID,
        name: 'Home',
        address: 'Downtown Street 5',
        latitude: 36.75,
        longitude: 3.05,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/api/customers/favorites')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Home',
          address: 'Downtown Street 5',
          latitude: 36.75,
          longitude: 3.05,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.favorite.name).toBe('Home');
    });

    it('GET /api/customers/favorites lists user favorites', async () => {
      prismaMock.favoriteLocation.findMany.mockResolvedValue([
        {
          id: FAVORITE_ID,
          userId: CUSTOMER_ID,
          name: 'Home',
          address: 'Downtown Street 5',
          latitude: 36.75,
          longitude: 3.05,
        },
      ] as any);

      const res = await request(app)
        .get('/api/customers/favorites')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.favorites).toHaveLength(1);
    });

    it('PATCH /api/customers/favorites/:id updates favorite location', async () => {
      prismaMock.favoriteLocation.findUnique.mockResolvedValue({
        id: FAVORITE_ID,
        userId: CUSTOMER_ID,
      } as any);
      prismaMock.favoriteLocation.update.mockResolvedValue({
        id: FAVORITE_ID,
        userId: CUSTOMER_ID,
        name: 'Work',
      } as any);

      const res = await request(app)
        .patch(`/api/customers/favorites/${FAVORITE_ID}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Work' });

      expect(res.status).toBe(200);
      expect(res.body.data.favorite.name).toBe('Work');
    });

    it('DELETE /api/customers/favorites/:id removes favorite location', async () => {
      prismaMock.favoriteLocation.findUnique.mockResolvedValue({
        id: FAVORITE_ID,
        userId: CUSTOMER_ID,
      } as any);
      prismaMock.favoriteLocation.delete.mockResolvedValue({} as any);

      const res = await request(app)
        .delete(`/api/customers/favorites/${FAVORITE_ID}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
    });

    it('Blocks user isolation for favorite locations', async () => {
      prismaMock.favoriteLocation.findUnique.mockResolvedValue({
        id: FAVORITE_ID,
        userId: CUSTOMER_ID,
      } as any);

      const res = await request(app)
        .delete(`/api/customers/favorites/${FAVORITE_ID}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── 4. Ride Rating System ────────────────────────────────────────────────
  describe('Ride Rating System', () => {
    it('POST /api/bookings/:id/rating submits a rating for completed ride', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        driverId: DRIVER_ID,
        status: BookingStatus.COMPLETED,
        rating: null,
      } as any);

      prismaMock.rating.create.mockResolvedValue({
        id: 'rating-1',
        bookingId: BOOKING_ID,
        customerId: CUSTOMER_ID,
        driverId: DRIVER_ID,
        score: 5,
        comment: 'Great service!',
        createdAt: new Date(),
      } as any);

      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/rating`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ score: 5, comment: 'Great service!' });

      expect(res.status).toBe(201);
      expect(res.body.data.rating.score).toBe(5);
    });

    it('Rejects rating for non-completed ride with 409', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        driverId: DRIVER_ID,
        status: BookingStatus.IN_PROGRESS,
        rating: null,
      } as any);

      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/rating`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ score: 5 });

      expect(res.status).toBe(409);
    });

    it('Rejects duplicate rating with 409', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        driverId: DRIVER_ID,
        status: BookingStatus.COMPLETED,
        rating: { id: 'rating-1', score: 4 },
      } as any);

      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/rating`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ score: 5 });

      expect(res.status).toBe(409);
    });

    it('Rejects invalid score range', async () => {
      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/rating`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ score: 6 });

      expect(res.status).toBe(400);
    });
  });

  // ─── 5. Driver Rating Calculation ─────────────────────────────────────────
  describe('Driver Rating Calculation', () => {
    it('GET /api/driver/profile calculates ratingAverage, totalRatings, totalTrips correctly', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: DRIVER_ID,
        name: 'Driver Ahmed',
        phone: '+213666777888',
        role: Role.DRIVER,
        profilePhoto: null,
        isActive: true,
      } as any);

      prismaMock.rating.findMany.mockResolvedValue([
        { score: 5 },
        { score: 4 },
        { score: 5 },
      ] as any);

      prismaMock.booking.count.mockResolvedValue(245);

      const res = await request(app)
        .get('/api/driver/profile')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ratingAverage).toBe(4.7);
      expect(res.body.totalRatings).toBe(3);
      expect(res.body.totalTrips).toBe(245);
    });
  });

  // ─── 6. Notifications History ─────────────────────────────────────────────
  describe('Customer Notifications History', () => {
    it('GET /api/customers/notifications lists customer notifications', async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: NOTIFICATION_ID,
          userId: CUSTOMER_ID,
          type: 'booking:accepted',
          title: 'Booking accepted',
          message: 'Your driver is on the way',
          read: false,
          createdAt: new Date(),
        },
      ] as any);
      prismaMock.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/customers/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notifications).toHaveLength(1);
      expect(res.body.data.unreadCount).toBe(1);
    });

    it('PATCH /api/customers/notifications/:id/read marks notification as read', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        id: NOTIFICATION_ID,
        userId: CUSTOMER_ID,
        read: false,
      } as any);
      prismaMock.notification.update.mockResolvedValue({
        id: NOTIFICATION_ID,
        userId: CUSTOMER_ID,
        read: true,
      } as any);

      const res = await request(app)
        .patch(`/api/customers/notifications/${NOTIFICATION_ID}/read`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notification.read).toBe(true);
    });

    it('Blocks unauthorized access to notification mark read', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        id: NOTIFICATION_ID,
        userId: CUSTOMER_ID,
        read: false,
      } as any);

      const res = await request(app)
        .patch(`/api/customers/notifications/${NOTIFICATION_ID}/read`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── 7. Profile Management ───────────────────────────────────────────────
  describe('Customer Profile Management', () => {
    it('GET /api/customers/me returns customer profile stats', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: CUSTOMER_ID,
        name: 'Customer One',
        phone: '+213555123456',
        role: Role.CUSTOMER,
        profilePhoto: null,
      } as any);
      prismaMock.booking.count.mockResolvedValue(12);
      prismaMock.rating.count.mockResolvedValue(5);

      const res = await request(app)
        .get('/api/customers/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.totalTrips).toBe(12);
      expect(res.body.data.user.ratingGiven).toBe(5);
    });
  });
});
