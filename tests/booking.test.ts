import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { MapsService } from '../src/services/maps.service';
import { PricingService } from '../src/services/pricing.service';
import { prismaMock } from './setup';
import jwt from 'jsonwebtoken';
import { BookingStatus } from '@prisma/client';

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

describe('Booking Creation API Endpoint', () => {
  const validPickup = { address: 'A', latitude: 36.7525, longitude: 3.04197 };
  const validDestination = { address: 'B', latitude: 36.7725, longitude: 3.06197 };
  const validCustomerId = 'test-customer-id';
  let validToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    validToken = jwt.sign(
      { userId: validCustomerId, email: 'test@example.com', role: 'CUSTOMER' },
      process.env.JWT_SECRET || 'fallback_secret'
    );
    prismaMock.booking.findFirst.mockResolvedValue(null as any);
  });

  it('should create a booking successfully (tests 1, 2, 3, 4, 5, 6, 7)', async () => {
    const mockMapsResponse = { distanceKm: 5.5, durationMinutes: 15 };
    const mockPricingResponse = { pricingType: 'DISTANCE', distanceKm: 5.5, ratePerKm: 40, estimatedPrice: 220 };

    vi.mocked(MapsService.getRoute).mockResolvedValue(mockMapsResponse);
    vi.mocked(PricingService.calculatePrice).mockResolvedValue(mockPricingResponse as any);

    const createdBooking = {
      id: 'booking-id',
      customerId: validCustomerId,
      driverId: null,
      status: BookingStatus.PENDING,
      pricingType: 'DISTANCE',
      pickupAddress: validPickup.address,
      pickupLatitude: validPickup.latitude,
      pickupLongitude: validPickup.longitude,
      destinationAddress: validDestination.address,
      destinationLatitude: validDestination.latitude,
      destinationLongitude: validDestination.longitude,
      distanceKm: 5.5,
      durationMinutes: 15,
      estimatedPrice: 220,
      scheduledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.booking.create.mockResolvedValue(createdBooking as any);

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
        destination: validDestination,
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.data.booking.id).toBe('booking-id');
    
    // Assert Maps and Pricing were called correctly
    const pickupCoords = { latitude: validPickup.latitude, longitude: validPickup.longitude };
    const destCoords = { latitude: validDestination.latitude, longitude: validDestination.longitude };

    expect(MapsService.getRoute).toHaveBeenCalledWith(pickupCoords, destCoords);
    expect(PricingService.calculatePrice).toHaveBeenCalledWith(pickupCoords, destCoords, 5.5);

    // Assert Prisma was called with correct data including pricingType
    expect(prismaMock.booking.create).toHaveBeenCalledWith({
      data: {
        customerId: validCustomerId,
        status: BookingStatus.PENDING,
        pricingType: 'DISTANCE',
        pickupAddress: validPickup.address,
        pickupLatitude: validPickup.latitude,
        pickupLongitude: validPickup.longitude,
        destinationAddress: validDestination.address,
        destinationLatitude: validDestination.latitude,
        destinationLongitude: validDestination.longitude,
        distanceKm: 5.5,
        durationMinutes: 15,
        estimatedPrice: 220,
        scheduledAt: null,
      },
    });
  });

  it('should reject client-provided forbidden fields (tests 8, 9, 10, 11, 12, 13)', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
        destination: validDestination,
        customerId: 'fake-id',
        driverId: 'fake-driver',
        distanceKm: 100,
        durationMinutes: 200,
        estimatedPrice: 9999,
        status: 'ACCEPTED'
      });

    // strict() validation in zod should reject this entirely
    expect(response.status).toBe(400);
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it('should reject invalid pickup coordinates (test 14)', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: { ...validPickup, latitude: 91 },
        destination: validDestination,
      });

    expect(response.status).toBe(400);
  });

  it('should reject invalid destination coordinates (test 15)', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
        destination: { ...validDestination, longitude: 181 },
      });

    expect(response.status).toBe(400);
  });

  it('should reject empty addresses (test 16)', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: { ...validPickup, address: '' },
        destination: validDestination,
      });

    expect(response.status).toBe(400);
  });

  it('should reject invalid scheduledAt (test 17)', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
        destination: validDestination,
        scheduledAt: 'not-a-date'
      });

    expect(response.status).toBe(400);
  });

  it('should reject past scheduledAt (test 18)', async () => {
    const pastDate = new Date(Date.now() - 10000).toISOString();
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
        destination: validDestination,
        scheduledAt: pastDate
      });

    expect(response.status).toBe(400);
  });

  it('should not create booking if MapsService fails (test 19)', async () => {
    const mockError: any = new Error('No route');
    mockError.statusCode = 404;
    vi.mocked(MapsService.getRoute).mockRejectedValue(mockError);

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
        destination: validDestination,
      });

    expect(response.status).toBe(404);
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it('should not create booking if PricingService fails (test 20)', async () => {
    vi.mocked(MapsService.getRoute).mockResolvedValue({ distanceKm: 5.5, durationMinutes: 15 });
    
    const mockError: any = new Error('Pricing error');
    mockError.statusCode = 400;
    vi.mocked(PricingService.calculatePrice).mockImplementation(() => {
      throw mockError;
    });

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        pickup: validPickup,
        destination: validDestination,
      });

    expect(response.status).toBe(400);
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it('should require authentication (test 21)', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .send({
        pickup: validPickup,
        destination: validDestination,
      });

    expect(response.status).toBe(401);
  });
});

describe('Customer Booking Management API', () => {
  const validCustomerId = 'test-customer-id';
  const otherCustomerId = 'other-customer-id';
  let validToken: string;
  let otherToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    validToken = jwt.sign(
      { userId: validCustomerId, email: 'test@example.com', role: 'CUSTOMER' },
      process.env.JWT_SECRET || 'fallback_secret'
    );
    otherToken = jwt.sign(
      { userId: otherCustomerId, email: 'other@example.com', role: 'CUSTOMER' },
      process.env.JWT_SECRET || 'fallback_secret'
    );
  });

  describe('GET /api/bookings/my', () => {
    it('should retrieve own bookings with pagination and order (tests 1, 2, 3)', async () => {
      const mockBookings = [
        { id: 'booking-2', customerId: validCustomerId },
        { id: 'booking-1', customerId: validCustomerId },
      ];
      
      prismaMock.booking.findMany.mockResolvedValue(mockBookings as any);
      prismaMock.booking.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/bookings/my?page=1&limit=10')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.bookings).toHaveLength(2);
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });

      expect(prismaMock.booking.findMany).toHaveBeenCalledWith({
        where: { customerId: validCustomerId },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });

    it('should filter by status (test 4)', async () => {
      prismaMock.booking.findMany.mockResolvedValue([] as any);
      prismaMock.booking.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/bookings/my?status=COMPLETED')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(prismaMock.booking.findMany).toHaveBeenCalledWith({
        where: { customerId: validCustomerId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });

    it('should reject invalid page and limit (tests 5, 6)', async () => {
      let response = await request(app)
        .get('/api/bookings/my?page=invalid')
        .set('Authorization', `Bearer ${validToken}`);
      expect(response.status).toBe(400);

      response = await request(app)
        .get('/api/bookings/my?limit=-5')
        .set('Authorization', `Bearer ${validToken}`);
      expect(response.status).toBe(400);
    });

    it('should reject excessive limit (test 7)', async () => {
      const response = await request(app)
        .get('/api/bookings/my?limit=5000')
        .set('Authorization', `Bearer ${validToken}`);

      // Our schema rejects values over 100
      expect(response.status).toBe(400);
    });

    it('should reject unauthenticated requests (test 8)', async () => {
      const response = await request(app).get('/api/bookings/my');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/bookings/:id', () => {
    it('should retrieve own booking details (test 10)', async () => {
      const mockBooking = { id: '00000000-0000-0000-0000-000000000000', customerId: validCustomerId };
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking as any);

      const response = await request(app)
        .get('/api/bookings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.booking.id).toBe('00000000-0000-0000-0000-000000000000');
    });

    it('should not retrieve another customer\'s booking (test 11, 9)', async () => {
      const mockBooking = { id: '00000000-0000-0000-0000-000000000000', customerId: 'someone-else' };
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking as any);

      const response = await request(app)
        .get('/api/bookings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for nonexistent booking (test 12)', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/bookings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject invalid booking ID format (test 13)', async () => {
      const response = await request(app)
        .get('/api/bookings/invalid-id')
        .set('Authorization', `Bearer ${validToken}`);

      // Fails UUID validation
      expect(response.status).toBe(400);
    });

    it('should reject unauthenticated requests (test 14)', async () => {
      const response = await request(app).get('/api/bookings/00000000-0000-0000-0000-000000000000');
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/bookings/:id/cancel', () => {
    it('should cancel PENDING and ACCEPTED bookings (tests 15, 16)', async () => {
      const mockBooking = { id: '00000000-0000-0000-0000-000000000000', customerId: validCustomerId, status: 'CANCELLED' };
      prismaMock.booking.update.mockResolvedValue(mockBooking as any);

      const response = await request(app)
        .patch('/api/bookings/00000000-0000-0000-0000-000000000000/cancel')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(prismaMock.booking.update).toHaveBeenCalledWith({
        where: {
          id: '00000000-0000-0000-0000-000000000000',
          customerId: validCustomerId,
          status: { in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] }
        },
        data: { status: BookingStatus.CANCELLED }
      });
    });

    it('should reject cancellation for non-cancellable states (tests 17, 18, 19, 20, 21, 22, 23, 24)', async () => {
      // Prisma throws P2025 when update fails to find a record
      const error: any = new Error('Record not found');
      error.code = 'P2025';
      prismaMock.booking.update.mockRejectedValue(error);

      const response = await request(app)
        .patch('/api/bookings/00000000-0000-0000-0000-000000000000/cancel')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
    });

    it('should reject unauthenticated requests (test 25)', async () => {
      const response = await request(app).patch('/api/bookings/00000000-0000-0000-0000-000000000000/cancel');
      expect(response.status).toBe(401);
    });
  });
});
