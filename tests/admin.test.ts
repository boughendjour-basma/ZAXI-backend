import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import jwt from 'jsonwebtoken';
import { Role, BookingStatus } from '@prisma/client';

const DRIVER_ID = '123e4567-e89b-42d3-a456-426614174002';
const CUSTOMER_ID = '123e4567-e89b-42d3-a456-426614174001';
const BOOKING_ID = '123e4567-e89b-42d3-a456-426614174000';

const driverToken = jwt.sign(
  { userId: DRIVER_ID, role: Role.DRIVER, phone: '+213666777888' },
  process.env.JWT_SECRET || 'fallback_secret'
);

const customerToken = jwt.sign(
  { userId: CUSTOMER_ID, role: Role.CUSTOMER, phone: '+213555123456' },
  process.env.JWT_SECRET || 'fallback_secret'
);

describe('Step 13 — Driver Management & Platform Administration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. Authorization ─────────────────────────────────────────────────────
  describe('Driver Management Authorization', () => {
    it('allows DRIVER to access /api/driver/statistics', async () => {
      prismaMock.user.count.mockResolvedValue(10);
      prismaMock.booking.count.mockResolvedValue(50);
      prismaMock.rating.findMany.mockResolvedValue([{ score: 5 }] as any);
      prismaMock.payment.aggregate.mockResolvedValue({ _sum: { amount: 10000 } } as any);
      prismaMock.booking.aggregate.mockResolvedValue({ _avg: { distanceKm: 15.5 } } as any);

      const res = await request(app)
        .get('/api/driver/statistics')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.totalRides).toBe(50);
      expect(res.body.data.totalRevenue).toBe(10000);
    });

    it('denies CUSTOMER access to /api/driver/statistics with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/driver/statistics')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('denies unauthenticated request to /api/driver/statistics with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/driver/statistics');
      expect(res.status).toBe(401);
    });
  });

  // ─── 2. Customer Management ───────────────────────────────────────────────
  describe('Customer Management', () => {
    it('GET /api/driver/customers lists customers with pagination', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        {
          id: CUSTOMER_ID,
          name: 'Ahmed Doe',
          phone: '+213555123456',
          email: 'ahmed@example.com',
          role: Role.CUSTOMER,
          isActive: true,
          createdAt: new Date(),
          lastLoginAt: null,
          _count: { customerBookings: 5 },
        },
      ] as any);
      prismaMock.user.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/driver/customers?page=1&limit=10')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.customers).toHaveLength(1);
      expect(res.body.data.customers[0].totalTrips).toBe(5);
    });

    it('denies CUSTOMER access to /api/driver/customers with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/driver/customers')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── 3. Booking Monitoring ────────────────────────────────────────────────
  describe('Booking Monitoring', () => {
    it('GET /api/driver/bookings-management retrieves bookings with filters', async () => {
      prismaMock.booking.findMany.mockResolvedValue([
        {
          id: BOOKING_ID,
          status: BookingStatus.COMPLETED,
          pickupAddress: 'BBA Center',
          destinationAddress: 'Sétif',
          estimatedPrice: 3000,
          distanceKm: 30,
          createdAt: new Date(),
          customer: { id: CUSTOMER_ID, name: 'Customer', phone: '+213555123456' },
          driver: { id: DRIVER_ID, name: 'Driver', phone: '+213666777888' },
        },
      ] as any);
      prismaMock.booking.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/driver/bookings-management?status=COMPLETED&page=1&limit=10')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.bookings[0].status).toBe('COMPLETED');
    });
  });
});
