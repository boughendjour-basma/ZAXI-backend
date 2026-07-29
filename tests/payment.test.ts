import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import jwt from 'jsonwebtoken';
import { BookingStatus, Role, PaymentMethod, PaymentStatus } from '@prisma/client';
import { SocketService } from '../src/sockets/socket.service';

const DRIVER_ID = '123e4567-e89b-42d3-a456-426614174001';
const CUSTOMER_ID = '123e4567-e89b-42d3-a456-426614174002';
const OTHER_CUSTOMER_ID = '123e4567-e89b-42d3-a456-426614174003';
const BOOKING_ID = '123e4567-e89b-42d3-a456-426614174000';
const PAYMENT_ID = '123e4567-e89b-42d3-a456-426614174099';

function makeCompletedBooking(overrides: Record<string, any> = {}) {
  return {
    id: BOOKING_ID,
    status: BookingStatus.COMPLETED,
    pricingType: 'DISTANCE',
    pickupLatitude: 36.75,
    pickupLongitude: 3.04,
    destinationLatitude: 36.8,
    destinationLongitude: 3.06,
    pickupAddress: 'BBA City',
    destinationAddress: 'Airport',
    distanceKm: 15,
    estimatedPrice: 2000,
    durationMinutes: 25,
    scheduledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customerId: CUSTOMER_ID,
    driverId: DRIVER_ID,
    payment: null,
    ...overrides,
  };
}

function makePayment(overrides: Record<string, any> = {}) {
  return {
    id: PAYMENT_ID,
    bookingId: BOOKING_ID,
    amount: 2000,
    paymentMethod: PaymentMethod.CASH,
    status: PaymentStatus.PAID,
    paidAt: new Date(),
    transactionReference: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('Payments, Ride Receipts & Booking History API', () => {
  let customerToken: string;
  let driverToken: string;
  let otherCustomerToken: string;

  beforeEach(() => {
    vi.clearAllMocks();

    customerToken = jwt.sign(
      { userId: CUSTOMER_ID, email: 'customer@zaxi.dz', role: Role.CUSTOMER },
      process.env.JWT_SECRET || 'fallback_secret'
    );
    driverToken = jwt.sign(
      { userId: DRIVER_ID, email: 'driver@zaxi.dz', role: Role.DRIVER },
      process.env.JWT_SECRET || 'fallback_secret'
    );
    otherCustomerToken = jwt.sign(
      { userId: OTHER_CUSTOMER_ID, email: 'other@zaxi.dz', role: Role.CUSTOMER },
      process.env.JWT_SECRET || 'fallback_secret'
    );
  });

  // ─── 1. Payment Creation ──────────────────────────────────────────────────
  describe('POST /api/bookings/:id/payment — Creation', () => {
    it('should successfully create a cash payment for a completed booking', async () => {
      const booking = makeCompletedBooking();
      const payment = makePayment();
      prismaMock.booking.findUnique.mockResolvedValue(booking as any);
      prismaMock.payment.create.mockResolvedValue(payment as any);

      const emitSpy = vi.spyOn(SocketService, 'emitPaymentCompleted');

      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/payment`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethod: 'CASH' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.payment.amount).toBe(2000);
      expect(res.body.data.payment.paymentMethod).toBe('CASH');
      expect(res.body.data.payment.status).toBe('PAID');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: BOOKING_ID,
          amount: 2000,
          paymentMethod: 'CASH',
          status: 'PAID',
        })
      );
    });

    it('should support future ONLINE payment method with PENDING status', async () => {
      const booking = makeCompletedBooking();
      const payment = makePayment({
        paymentMethod: PaymentMethod.ONLINE,
        status: PaymentStatus.PENDING,
        paidAt: null,
        transactionReference: 'REF-123456',
      });

      prismaMock.booking.findUnique.mockResolvedValue(booking as any);
      prismaMock.payment.create.mockResolvedValue(payment as any);

      const emitSpy = vi.spyOn(SocketService, 'emitPaymentCompleted');

      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/payment`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethod: 'ONLINE', transactionReference: 'REF-123456' });

      expect(res.status).toBe(201);
      expect(res.body.data.payment.paymentMethod).toBe('ONLINE');
      expect(res.body.data.payment.status).toBe('PENDING');
      // Should not emit payment:completed for PENDING payments
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should reject payment for non-completed bookings with 409 Conflict', async () => {
      const booking = makeCompletedBooking({ status: BookingStatus.IN_PROGRESS });
      prismaMock.booking.findUnique.mockResolvedValue(booking as any);

      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/payment`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethod: 'CASH' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/COMPLETED/i);
    });

    it('should reject duplicate payment attempts with 409 Conflict', async () => {
      const existingPayment = makePayment();
      const booking = makeCompletedBooking({ payment: existingPayment });
      prismaMock.booking.findUnique.mockResolvedValue(booking as any);

      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/payment`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethod: 'CASH' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should handle concurrent payment creation race conditions with 409 Conflict', async () => {
      const booking = makeCompletedBooking();
      prismaMock.booking.findUnique.mockResolvedValue(booking as any);

      const p2002Error: any = new Error('Unique constraint failed on booking_id');
      p2002Error.code = 'P2002';
      prismaMock.payment.create.mockRejectedValue(p2002Error);

      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/payment`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethod: 'CASH' });

      expect(res.status).toBe(409);
    });
  });

  // ─── 2. Payment Authorization Security ──────────────────────────────────
  describe('POST /api/bookings/:id/payment — Security', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/payment`)
        .send({ paymentMethod: 'CASH' });

      expect(res.status).toBe(401);
    });

    it('should return 404 when another customer tries to pay for a booking', async () => {
      const booking = makeCompletedBooking();
      prismaMock.booking.findUnique.mockResolvedValue(booking as any);

      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/payment`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({ paymentMethod: 'CASH' });

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent booking', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/payment`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethod: 'CASH' });

      expect(res.status).toBe(404);
    });
  });

  // ─── 3. Validation ───────────────────────────────────────────────────────
  describe('Payment Validation', () => {
    it('should reject invalid payment method with 400', async () => {
      const res = await request(app)
        .post(`/api/bookings/${BOOKING_ID}/payment`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethod: 'CRYPTO' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid UUID parameter with 400', async () => {
      const res = await request(app)
        .post('/api/bookings/invalid-uuid/payment')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethod: 'CASH' });

      expect(res.status).toBe(400);
    });
  });

  // ─── 4. Receipts ─────────────────────────────────────────────────────────
  describe('GET /api/bookings/:id/receipt — Digital Ride Receipts', () => {
    it('should return complete immutable receipt for booking customer', async () => {
      const booking = makeCompletedBooking({
        customer: { id: CUSTOMER_ID, name: 'Ahmed', phone: '+213555123456' },
        driver: { id: DRIVER_ID, name: 'Karim', phone: '+213555987654' },
        payment: makePayment(),
      });
      prismaMock.booking.findUnique.mockResolvedValue(booking as any);

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/receipt`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.receipt.bookingId).toBe(BOOKING_ID);
      expect(res.body.data.receipt.customer.name).toBe('Ahmed');
      expect(res.body.data.receipt.driver.name).toBe('Karim');
      expect(res.body.data.receipt.payment.amount).toBe(2000);
    });

    it('should allow assigned driver to view receipt', async () => {
      const booking = makeCompletedBooking({
        customer: { id: CUSTOMER_ID, name: 'Ahmed', phone: '+213555123456' },
        driver: { id: DRIVER_ID, name: 'Karim', phone: '+213555987654' },
        payment: makePayment(),
      });
      prismaMock.booking.findUnique.mockResolvedValue(booking as any);

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/receipt`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 when unrelated user requests receipt', async () => {
      const booking = makeCompletedBooking();
      prismaMock.booking.findUnique.mockResolvedValue(booking as any);

      const res = await request(app)
        .get(`/api/bookings/${BOOKING_ID}/receipt`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── 5. Customer History ─────────────────────────────────────────────────
  describe('GET /api/bookings/history — Customer History', () => {
    it('should return customer ride history with pagination', async () => {
      const mockBookings = [makeCompletedBooking({ payment: makePayment() })];
      prismaMock.booking.findMany.mockResolvedValue(mockBookings as any);
      prismaMock.booking.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/bookings/history?page=1&limit=10')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter customer history by payment status', async () => {
      prismaMock.booking.findMany.mockResolvedValue([]);
      prismaMock.booking.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/bookings/history?paymentStatus=PAID')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            payment: { status: 'PAID' },
          }),
        })
      );
    });
  });

  // ─── 6. Driver Earnings Dashboard ─────────────────────────────────────────
  describe('GET /api/driver/earnings — Earnings Dashboard', () => {
    it('should calculate today, week, month, and total earnings for driver', async () => {
      const mockPayments = [{ amount: 2000 }, { amount: 1500 }];
      prismaMock.payment.findMany.mockResolvedValue(mockPayments as any);

      const res = await request(app)
        .get('/api/driver/earnings')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.earnings.total).toBe(3500);
      expect(res.body.data.earnings.completedRides).toBe(2);
      expect(res.body.data.earnings.averageRideValue).toBe(1750);
    });

    it('should reject non-driver from accessing earnings endpoint with 403', async () => {
      const res = await request(app)
        .get('/api/driver/earnings')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
