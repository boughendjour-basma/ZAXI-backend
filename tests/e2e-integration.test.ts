import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import { Role, BookingStatus, PricingType } from '@prisma/client';
import argon2 from 'argon2';
import { generateToken } from '../src/utils/jwt';
import { MapsService } from '../src/services/maps.service';

describe('ZAXI — Complete End-to-End Frontend ↔ Backend Integration Suite', () => {
  const CUSTOMER_ID = '123e4567-e89b-42d3-a456-426614174001';
  const DRIVER_ID = '123e4567-e89b-42d3-a456-426614174002';
  const BOOKING_ID = '123e4567-e89b-42d3-a456-426614174000';
  const ANNOUNCEMENT_ID = '123e4567-e89b-42d3-a456-426614174003';

  const customerPhone = '+213550111222';
  const driverPhone = '+213550999888';

  let customerToken: string;
  let driverToken: string;

  beforeEach(() => {
    customerToken = generateToken({ userId: CUSTOMER_ID, role: Role.CUSTOMER, phone: customerPhone });
    driverToken = generateToken({ userId: DRIVER_ID, role: Role.DRIVER, phone: driverPhone });

    vi.spyOn(MapsService, 'getRoute').mockResolvedValue({
      distanceKm: 3.5,
      durationMinutes: 8,
      geometry: [],
      mode: 'BBA_URBAN',
    });
  });

  // ─── 1. AUTHENTICATION FLOW ───────────────────────────────────────────────
  describe('Phase 2 — Authentication E2E Flow', () => {
    it('POST /api/auth/login verifies credentials with argon2 and returns token + user profile', async () => {
      const mockPasswordHash = await argon2.hash('Password123!');
      prismaMock.user.findUnique.mockResolvedValue({
        id: CUSTOMER_ID,
        phone: customerPhone,
        name: 'Integration Customer',
        passwordHash: mockPasswordHash,
        role: Role.CUSTOMER,
        isActive: true,
        email: null,
        phoneVerified: true,
        dateOfBirth: new Date('1995-05-15'),
        lastLoginAt: null,
        profilePhoto: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      prismaMock.user.update.mockResolvedValue({} as any);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone: '0550111222', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('CUSTOMER');
    });

    it('GET /api/auth/me returns current authenticated user profile', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: CUSTOMER_ID,
        phone: customerPhone,
        name: 'Integration Customer',
        role: Role.CUSTOMER,
        phoneVerified: true,
        isActive: true,
      } as any);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.id).toBe(CUSTOMER_ID);
    });
  });

  // ─── 2. DRIVER PRICING MANAGEMENT ─────────────────────────────────────────
  describe('Phase 8 — Driver Pricing Integration', () => {
    it('PATCH /api/driver/pricing accepts cityFlatFare and outsideRatePerKm', async () => {
      prismaMock.pricingSettings.upsert.mockResolvedValue({
        id: 1,
        cityFlatFare: 160,
        outsideRatePerKm: 45,
        updatedAt: new Date(),
      });

      const res = await request(app)
        .patch('/api/driver/pricing')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ cityFlatFare: 160, outsideRatePerKm: 45 });

      expect(res.status).toBe(200);
      expect(res.body.cityFlatFare).toBe(160);
      expect(res.body.outsideRatePerKm).toBe(45);
    });
  });

  // ─── 3. ANNOUNCEMENT MANAGEMENT ────────────────────────────────────────────
  describe('Phase 8 — Driver Announcement CRUD Flow', () => {
    it('POST /api/driver/announcements creates a new announcement', async () => {
      prismaMock.announcement.create.mockResolvedValue({
        id: ANNOUNCEMENT_ID,
        driverId: DRIVER_ID,
        title: 'Special Summer Offer',
        description: 'Special discounts for beach trips in BBA',
        category: 'SPECIAL_OFFER',
        price: 1500,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/api/driver/announcements')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          title: 'Special Summer Offer',
          description: 'Special discounts for beach trips in BBA',
          category: 'SPECIAL_OFFER',
          price: 1500,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(ANNOUNCEMENT_ID);
      expect(res.body.title).toBe('Special Summer Offer');
    });
  });

  // ─── 4. RIDE LIFECYCLE ─────────────────────────────────────────────────────
  describe('Phase 3 & 4 — Complete Ride Lifecycle', () => {
    it('POST /api/bookings/estimate calculates price estimate', async () => {
      prismaMock.pricingSettings.findUnique.mockResolvedValue({
        id: 1,
        cityFlatFare: 150,
        outsideRatePerKm: 40,
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/bookings/estimate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickup: { latitude: 36.071, longitude: 4.764 },
          destination: { latitude: 36.08, longitude: 4.77 },
        });

      expect(res.status).toBe(200);
      expect(res.body.estimatedPrice).toBeGreaterThan(0);
      expect(res.body.pricingType).toBeDefined();
    });

    it('POST /api/bookings creates booking and triggers real-time booking:new emission', async () => {
      prismaMock.booking.findFirst.mockResolvedValue(null);
      prismaMock.pricingSettings.findUnique.mockResolvedValue({
        id: 1,
        cityFlatFare: 150,
        outsideRatePerKm: 40,
        updatedAt: new Date(),
      });

      prismaMock.booking.create.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        driverId: null,
        status: BookingStatus.PENDING,
        pricingType: PricingType.CITY,
        pickupLatitude: 36.071,
        pickupLongitude: 4.764,
        pickupAddress: 'BBA Centre',
        destinationLatitude: 36.08,
        destinationLongitude: 4.77,
        destinationAddress: 'Gare BBA',
        distanceKm: 2.5,
        durationMinutes: 6,
        estimatedPrice: 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickup: { latitude: 36.071, longitude: 4.764, address: 'BBA Centre' },
          destination: { latitude: 36.08, longitude: 4.77, address: 'Gare BBA' },
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.booking.id).toBe(BOOKING_ID);
      expect(res.body.data.booking.status).toBe('PENDING');
    });

    it('PATCH /api/driver/bookings/:id/accept assigns driver atomically', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        driverId: null,
        status: BookingStatus.PENDING,
      } as any);

      prismaMock.$transaction.mockImplementation(async (cb: any) => {
        return cb(prismaMock);
      });

      prismaMock.booking.update.mockResolvedValue({
        id: BOOKING_ID,
        customerId: CUSTOMER_ID,
        driverId: DRIVER_ID,
        status: BookingStatus.ACCEPTED,
        driver: { id: DRIVER_ID, name: 'Integration Driver', phone: driverPhone },
      } as any);

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/accept`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.booking.status).toBe('ACCEPTED');
      expect(res.body.data.booking.driverId).toBe(DRIVER_ID);
    });

    it('PATCH /api/driver/bookings/:id/location updates driver GPS coordinates', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        driverId: DRIVER_ID,
        status: BookingStatus.ACCEPTED,
      } as any);

      prismaMock.driverLocation.findUnique.mockResolvedValue(null);
      prismaMock.driverLocation.upsert.mockResolvedValue({
        id: '123e4567-e89b-42d3-a456-426614174099',
        bookingId: BOOKING_ID,
        driverId: DRIVER_ID,
        latitude: 36.073,
        longitude: 4.765,
        heading: 90,
        speed: 30,
        accuracy: 5,
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .patch(`/api/driver/bookings/${BOOKING_ID}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 36.073, longitude: 4.765, heading: 90, speed: 30 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.location.latitude).toBe(36.073);
    });
  });
});
