import prisma from '../config/database';
import { BookingStatus, Role, PaymentStatus } from '@prisma/client';
import { AuditLogService } from './audit-log.service';

export interface DriverManagementCustomerFilterInput {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}

export interface DriverManagementBookingFilterInput {
  page: number;
  limit: number;
  status?: BookingStatus;
  customerId?: string;
  driverId?: string;
  startDate?: string;
  endDate?: string;
}

export class DriverManagementService {
  /**
   * Calculates overall platform statistics & financial metrics.
   * Accessible by the DRIVER (platform administrator).
   */
  static async getStatistics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalCustomers,
      activeCustomers,
      newUsersThisMonth,
      totalBookings,
      completedRides,
      cancelledRides,
      ratings,
      paymentsSummary,
      dailyPaymentsSummary,
      monthlyPaymentsSummary,
      completedBookingsDistance,
    ] = await Promise.all([
      // Customers
      prisma.user.count({ where: { role: Role.CUSTOMER } }),
      prisma.user.count({ where: { role: Role.CUSTOMER, isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),

      // Bookings
      prisma.booking.count(),
      prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),

      // Ratings
      prisma.rating.findMany({ select: { score: true } }),

      // Financials
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID, paidAt: { gte: startOfDay } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID, paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),

      // Average distance
      prisma.booking.aggregate({
        where: { status: BookingStatus.COMPLETED },
        _avg: { distanceKm: true },
      }),
    ]);

    const totalRatings = ratings.length;
    const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
    const averageRating = totalRatings > 0 ? Math.round((totalScore / totalRatings) * 10) / 10 : 0;

    const totalRevenue = paymentsSummary?._sum?.amount ?? 0;
    const dailyRevenue = dailyPaymentsSummary?._sum?.amount ?? 0;
    const monthlyRevenue = monthlyPaymentsSummary?._sum?.amount ?? 0;
    const avgKm = completedBookingsDistance?._avg?.distanceKm;
    const averageDistanceKm = typeof avgKm === 'number' ? Math.round(avgKm * 10) / 10 : 0;

    return {
      totalCustomers,
      activeCustomers,
      newUsersThisMonth,
      totalRides: totalBookings,
      completedRides,
      cancelledRides,
      averageDistanceKm,
      totalRevenue,
      dailyRevenue,
      monthlyRevenue,
      averageRating,
    };
  }

  /**
   * Retrieves paginated customers list with optional search and filters.
   */
  static async getCustomers(filters: DriverManagementCustomerFilterInput) {
    const { page, limit, search, isActive } = filters;
    const skip = (page - 1) * limit;

    const where: any = { role: Role.CUSTOMER };

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: { customerBookings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const formatted = customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      isActive: c.isActive,
      createdAt: c.createdAt,
      lastLoginAt: c.lastLoginAt,
      totalTrips: c._count.customerBookings,
    }));

    return {
      customers: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Booking monitoring with filters (status, date range, customer, driver).
   */
  static async getBookings(filters: DriverManagementBookingFilterInput) {
    const { page, limit, status, customerId, driverId, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (driverId) where.driverId = driverId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        select: {
          id: true,
          status: true,
          pickupAddress: true,
          destinationAddress: true,
          estimatedPrice: true,
          distanceKm: true,
          createdAt: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
          driver: {
            select: { id: true, name: true, phone: true },
          },
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
}
