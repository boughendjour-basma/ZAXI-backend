import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import jwt from 'jsonwebtoken';
import { prismaMock } from './setup';
import { MapsService } from '../src/services/maps.service';

describe('Driver Pricing Settings API Endpoint (/api/driver/pricing)', () => {
  let driverToken: string;
  let customerToken: string;

  const bbaCenter = { latitude: 36.0732, longitude: 4.7610 };
  const bbaDowntown = { latitude: 36.0686, longitude: 4.7622 };
  const elAchir = { latitude: 36.0638, longitude: 4.6275 };

  beforeEach(() => {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    driverToken = jwt.sign({ userId: 'driver-id', email: 'driver@zaxi.dz', role: 'DRIVER' }, secret);
    customerToken = jwt.sign({ userId: 'customer-id', email: 'customer@example.com', role: 'CUSTOMER' }, secret);

    // Default PricingSettings mock record
    prismaMock.pricingSettings.findUnique.mockResolvedValue({
      id: 1,
      cityFlatFare: 150,
      outsideRatePerKm: 40,
      updatedAt: new Date(),
    });
  });

  // ── GET /api/driver/pricing ─────────────────────────────────────────

  describe('GET /api/driver/pricing', () => {
    it('should allow DRIVER to retrieve pricing settings', async () => {
      const response = await request(app)
        .get('/api/driver/pricing')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        cityFlatFare: 150,
        outsideRatePerKm: 40,
      });
    });

    it('should reject CUSTOMER access with 403 Forbidden', async () => {
      const response = await request(app)
        .get('/api/driver/pricing')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const response = await request(app).get('/api/driver/pricing');
      expect(response.status).toBe(401);
    });
  });

  // ── PATCH /api/driver/pricing ───────────────────────────────────────

  describe('PATCH /api/driver/pricing', () => {
    it('should allow DRIVER to update cityFlatFare and outsideRatePerKm', async () => {
      prismaMock.pricingSettings.upsert.mockResolvedValue({
        id: 1,
        cityFlatFare: 180,
        outsideRatePerKm: 45,
        updatedAt: new Date(),
      });

      const response = await request(app)
        .patch('/api/driver/pricing')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          cityFlatFare: 180,
          outsideRatePerKm: 45,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        cityFlatFare: 180,
        outsideRatePerKm: 45,
      });
    });

    it('should reject CUSTOMER update attempt with 403 Forbidden', async () => {
      const response = await request(app)
        .patch('/api/driver/pricing')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ cityFlatFare: 200 });

      expect(response.status).toBe(403);
    });

    it('should reject invalid values (zero) with 400 Bad Request', async () => {
      const response = await request(app)
        .patch('/api/driver/pricing')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ cityFlatFare: 0 });

      expect(response.status).toBe(400);
    });

    it('should reject negative values with 400 Bad Request', async () => {
      const response = await request(app)
        .patch('/api/driver/pricing')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ outsideRatePerKm: -10 });

      expect(response.status).toBe(400);
    });

    it('should reject decimal values with 400 Bad Request', async () => {
      const response = await request(app)
        .patch('/api/driver/pricing')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ cityFlatFare: 150.5 });

      expect(response.status).toBe(400);
    });

    it('should reject empty body with 400 Bad Request', async () => {
      const response = await request(app)
        .patch('/api/driver/pricing')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  // ── Immediate Effect on Estimates & Bookings ────────────────────────

  describe('Immediate Effect of Driver Pricing Updates', () => {
    it('should immediately use updated pricing for ride estimates', async () => {
      // Simulate driver updating cityFlatFare to 220
      prismaMock.pricingSettings.findUnique.mockResolvedValue({
        id: 1,
        cityFlatFare: 220,
        outsideRatePerKm: 40,
        updatedAt: new Date(),
      });

      // Mock MapsService route calculation
      MapsService.getRoute = async () => ({ distanceKm: 4.5, durationMinutes: 10 });

      const response = await request(app)
        .post('/api/bookings/estimate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickup: bbaCenter,
          destination: bbaDowntown,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        pricingType: 'CITY',
        distanceKm: 4.5,
        durationMinutes: 10,
        ratePerKm: null,
        estimatedPrice: 220, // Reflected updated city flat fare immediately!
      });
    });

    it('should immediately use updated pricing for outside trips in estimate', async () => {
      // Simulate driver updating outsideRatePerKm to 50
      prismaMock.pricingSettings.findUnique.mockResolvedValue({
        id: 1,
        cityFlatFare: 150,
        outsideRatePerKm: 50,
        updatedAt: new Date(),
      });

      MapsService.getRoute = async () => ({ distanceKm: 10.0, durationMinutes: 18 });

      const response = await request(app)
        .post('/api/bookings/estimate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickup: bbaCenter,
          destination: { latitude: 36.1900, longitude: 5.4100 },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        pricingType: 'DISTANCE',
        distanceKm: 10.0,
        durationMinutes: 18,
        ratePerKm: 50,
        estimatedPrice: 500, // 10.0 * 50 = 500
      });
    });
  });
});
