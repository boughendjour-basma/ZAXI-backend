import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { MapsService } from '../src/services/maps.service';
import { PricingService } from '../src/services/pricing.service';
import { PricingType } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../src/services/maps.service', () => ({
  MapsService: {
    getRoute: vi.fn(),
  },
}));

vi.mock('../src/services/pricing.service', () => ({
  PricingService: {
    calculatePrice: vi.fn(),
  },
}));

describe('Estimate API Endpoint', () => {
  const validPickup = { latitude: 36.7525, longitude: 3.04197 };
  const validDestination = { latitude: 36.7725, longitude: 3.06197 };
  let validToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    validToken = jwt.sign({ userId: 'test-user-id', email: 'test@example.com', role: 'CUSTOMER' }, process.env.JWT_SECRET || 'fallback_secret');
  });

  it('should return a successful estimate with pricingType', async () => {
    const mockMapsResponse = { distanceKm: 5.5, durationMinutes: 15 };
    const mockPricingResponse = { pricingType: PricingType.DISTANCE, distanceKm: 5.5, ratePerKm: 40, estimatedPrice: 220, cityFlatFareUsed: null, outsideRatePerKmUsed: 40 };

    vi.mocked(MapsService.getRoute).mockResolvedValue(mockMapsResponse);
    vi.mocked(PricingService.calculatePrice).mockResolvedValue(mockPricingResponse);

    const response = await request(app)
      .post('/api/bookings/estimate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
        destination: validDestination,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      pricingType: 'DISTANCE',
      distanceKm: 5.5,
      durationMinutes: 15,
      ratePerKm: 40,
      estimatedPrice: 220,
    });
    expect(MapsService.getRoute).toHaveBeenCalledWith(validPickup, validDestination);
    expect(PricingService.calculatePrice).toHaveBeenCalledWith(
      validPickup,
      validDestination,
      5.5,
      undefined,
      undefined
    );
  });

  it('should reject invalid pickup coordinates', async () => {
    const response = await request(app)
      .post('/api/bookings/estimate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: { latitude: 91, longitude: 3.04197 }, // Invalid latitude
        destination: validDestination,
      });

    expect(response.status).toBe(400);
  });

  it('should reject invalid destination coordinates', async () => {
    const response = await request(app)
      .post('/api/bookings/estimate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
        destination: { latitude: 36.7725, longitude: 181 }, // Invalid longitude
      });

    expect(response.status).toBe(400);
  });

  it('should reject missing pickup', async () => {
    const response = await request(app)
      .post('/api/bookings/estimate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        destination: validDestination,
      });

    expect(response.status).toBe(400);
  });

  it('should reject missing destination', async () => {
    const response = await request(app)
      .post('/api/bookings/estimate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
      });

    expect(response.status).toBe(400);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/bookings/estimate')
      .send({
        pickup: validPickup,
        destination: validDestination,
      });

    expect(response.status).toBe(401);
  });

  it('should safely propagate MapsService errors', async () => {
    const mockError: any = new Error('No route found');
    mockError.statusCode = 404;
    vi.mocked(MapsService.getRoute).mockRejectedValue(mockError);

    const response = await request(app)
      .post('/api/bookings/estimate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
        destination: validDestination,
      });

    expect(response.status).toBe(404);
  });

  it('should handle PricingService errors correctly', async () => {
    const mockMapsResponse = { distanceKm: 5.5, durationMinutes: 15 };
    vi.mocked(MapsService.getRoute).mockResolvedValue(mockMapsResponse);
    
    const mockError: any = new Error('Invalid distance');
    mockError.statusCode = 400;
    vi.mocked(PricingService.calculatePrice).mockRejectedValue(mockError);

    const response = await request(app)
      .post('/api/bookings/estimate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
        destination: validDestination,
      });

    expect(response.status).toBe(400);
  });

  it('should ignore client-provided distance, duration, rate, and price', async () => {
    const mockMapsResponse = { distanceKm: 5.5, durationMinutes: 15 };
    const mockPricingResponse = { pricingType: PricingType.CITY, distanceKm: 5.5, ratePerKm: null, estimatedPrice: 150, cityFlatFareUsed: 150, outsideRatePerKmUsed: null };

    vi.mocked(MapsService.getRoute).mockResolvedValue(mockMapsResponse);
    vi.mocked(PricingService.calculatePrice).mockResolvedValue(mockPricingResponse);

    const response = await request(app)
      .post('/api/bookings/estimate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
        destination: validDestination,
        distanceKm: 100, // Should be ignored
        durationMinutes: 100, // Should be ignored
        ratePerKm: 100, // Should be ignored
        estimatedPrice: 9999, // Should be ignored
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      pricingType: 'CITY',
      distanceKm: 5.5,
      durationMinutes: 15,
      ratePerKm: null,
      estimatedPrice: 150,
    });
  });
});
