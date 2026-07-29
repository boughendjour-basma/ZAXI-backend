import prisma from '../config/database';
import { BookingStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { SocketService } from '../sockets/socket.service';

export interface CreatePaymentInput {
  paymentMethod: PaymentMethod;
  transactionReference?: string;
}

export class PaymentService {
  /**
   * Creates a payment record for a completed booking.
   *
   * Security rules:
   * - Only the booking customer can trigger payment.
   * - Only COMPLETED bookings are eligible.
   * - Amount is always sourced from the booking (never the client).
   * - Duplicate payments blocked atomically via @unique on bookingId.
   */
  static async createPayment(customerId: string, bookingId: string, data: CreatePaymentInput) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    // 404 for non-existent or unauthorized (obfuscation pattern)
    if (!booking || booking.customerId !== customerId) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    // Only COMPLETED bookings can be paid
    if (booking.status !== BookingStatus.COMPLETED) {
      const error: any = new Error(
        `Payment not allowed. Booking must be COMPLETED (current: ${booking.status})`
      );
      error.statusCode = 409;
      throw error;
    }

    // Prevent duplicate payments (also enforced at DB level via @unique)
    if (booking.payment) {
      const error: any = new Error('Payment already exists for this booking');
      error.statusCode = 409;
      throw error;
    }

    // Determine initial status — CASH resolves immediately, ONLINE stays PENDING
    const isCash = data.paymentMethod === PaymentMethod.CASH;
    const status: PaymentStatus = isCash ? PaymentStatus.PAID : PaymentStatus.PENDING;
    const paidAt = isCash ? new Date() : null;

    // Atomic create — amount comes exclusively from the booking record
    let payment;
    try {
      payment = await prisma.payment.create({
        data: {
          bookingId,
          amount: booking.estimatedPrice,
          paymentMethod: data.paymentMethod,
          status,
          paidAt,
          transactionReference: data.transactionReference ?? null,
        },
      });
    } catch (error: any) {
      // P2002 = unique constraint violation (concurrent duplicate payment)
      if (error.code === 'P2002') {
        const conflictError: any = new Error('Payment already exists for this booking');
        conflictError.statusCode = 409;
        throw conflictError;
      }
      throw error;
    }

    // Emit Socket.IO notification to booking room + all clients
    if (payment.status === PaymentStatus.PAID) {
      SocketService.emitPaymentCompleted({
        bookingId,
        paymentId: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      });
    }

    return payment;
  }

  /**
   * Retrieves the payment record for a booking.
   * Accessible by the booking customer or the assigned driver.
   */
  static async getPayment(userId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking || (booking.customerId !== userId && booking.driverId !== userId)) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    if (!booking.payment) {
      const error: any = new Error('No payment found for this booking');
      error.statusCode = 404;
      throw error;
    }

    return booking.payment;
  }

  /**
   * Generates a full ride receipt for a booking.
   * Preserves exact ride data at the time of payment.
   */
  static async getReceipt(userId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        driver: { select: { id: true, name: true, phone: true } },
        payment: true,
      },
    });

    if (!booking || (booking.customerId !== userId && booking.driverId !== userId)) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      bookingId: booking.id,
      status: booking.status,
      customer: booking.customer,
      driver: booking.driver,
      pickup: {
        address: booking.pickupAddress,
        latitude: booking.pickupLatitude,
        longitude: booking.pickupLongitude,
      },
      destination: {
        address: booking.destinationAddress,
        latitude: booking.destinationLatitude,
        longitude: booking.destinationLongitude,
      },
      distanceKm: booking.distanceKm,
      durationMinutes: booking.durationMinutes,
      pricingType: booking.pricingType,
      estimatedPrice: booking.estimatedPrice,
      scheduledAt: booking.scheduledAt,
      createdAt: booking.createdAt,
      payment: booking.payment
        ? {
            id: booking.payment.id,
            amount: booking.payment.amount,
            paymentMethod: booking.payment.paymentMethod,
            status: booking.payment.status,
            paidAt: booking.payment.paidAt,
            transactionReference: booking.payment.transactionReference,
          }
        : null,
    };
  }

  /**
   * Customer ride history with rich filtering.
   */
  static async getCustomerHistory(
    customerId: string,
    filters: {
      page: number;
      limit: number;
      status?: string;
      paymentStatus?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    const { page, limit, status, paymentStatus, dateFrom, dateTo } = filters;
    const skip = (page - 1) * limit;

    const where: any = { customerId };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (paymentStatus) {
      where.payment = { status: paymentStatus };
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          payment: {
            select: {
              status: true,
              amount: true,
              paymentMethod: true,
              paidAt: true,
            },
          },
          driver: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Driver earnings dashboard — calculated directly from paid payments.
   */
  static async getDriverEarnings(
    driverId: string,
    filters: { from?: string; to?: string }
  ) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Build date filter for custom range query
    const customWhere: any = {
      booking: { driverId, status: BookingStatus.COMPLETED },
      status: PaymentStatus.PAID,
    };
    if (filters.from || filters.to) {
      customWhere.paidAt = {};
      if (filters.from) customWhere.paidAt.gte = new Date(filters.from);
      if (filters.to) customWhere.paidAt.lte = new Date(filters.to);
    }

    const [todayPayments, weekPayments, monthPayments, totalPayments, customPayments] =
      await Promise.all([
        // Today
        prisma.payment.findMany({
          where: {
            booking: { driverId, status: BookingStatus.COMPLETED },
            status: PaymentStatus.PAID,
            paidAt: { gte: startOfToday },
          },
          select: { amount: true },
        }),
        // This week
        prisma.payment.findMany({
          where: {
            booking: { driverId, status: BookingStatus.COMPLETED },
            status: PaymentStatus.PAID,
            paidAt: { gte: startOfWeek },
          },
          select: { amount: true },
        }),
        // This month
        prisma.payment.findMany({
          where: {
            booking: { driverId, status: BookingStatus.COMPLETED },
            status: PaymentStatus.PAID,
            paidAt: { gte: startOfMonth },
          },
          select: { amount: true },
        }),
        // All time
        prisma.payment.findMany({
          where: {
            booking: { driverId, status: BookingStatus.COMPLETED },
            status: PaymentStatus.PAID,
          },
          select: { amount: true },
        }),
        // Custom range (if provided)
        prisma.payment.findMany({
          where: customWhere,
          select: { amount: true },
        }),
      ]);

    const sum = (payments: { amount: number }[]) =>
      payments.reduce((acc, p) => acc + p.amount, 0);

    const total = sum(totalPayments);
    const count = totalPayments.length;

    return {
      today: sum(todayPayments),
      week: sum(weekPayments),
      month: sum(monthPayments),
      total,
      completedRides: count,
      averageRideValue: count > 0 ? Math.round(total / count) : 0,
      ...(filters.from || filters.to
        ? { customRange: sum(customPayments) }
        : {}),
    };
  }
}
