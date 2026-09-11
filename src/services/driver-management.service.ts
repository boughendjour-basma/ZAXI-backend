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

    // Use UTC boundaries adjusted for Algeria (UTC+1) so "today" and "this month"
    // match the driver's local clock rather than the server's UTC clock.
    const ALGERIA_OFFSET_MS = 1 * 60 * 60 * 1000; // UTC+1
    const localNow = new Date(now.getTime() + ALGERIA_OFFSET_MS);
    const localYear = localNow.getUTCFullYear();
    const localMonth = localNow.getUTCMonth();
    const localDate = localNow.getUTCDate();

    // startOfDay / startOfMonth expressed in UTC so Prisma comparisons are correct
    const startOfDay = new Date(Date.UTC(localYear, localMonth, localDate) - ALGERIA_OFFSET_MS);
    const startOfMonth = new Date(Date.UTC(localYear, localMonth, 1) - ALGERIA_OFFSET_MS);

    const [
      totalCustomers,
      activeCustomers,
      newUsersThisMonth,
      totalBookings,
      completedRides,
      cancelledRides,
      todayCompletedRides,
      ratings,
      completedBookingsDistance,
      allTimeRevenueSummary,
      todayRevenueSummary,
      monthlyRevenueSummary,
    ] = await Promise.all([
      // Customers
      prisma.user.count({ where: { role: Role.CUSTOMER } }),
      prisma.user.count({ where: { role: Role.CUSTOMER, isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),

      // Bookings totals
      prisma.booking.count(),
      prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),

      // Today's completed rides count
      prisma.booking.count({
        where: { status: BookingStatus.COMPLETED, updatedAt: { gte: startOfDay } },
      }),

      // Ratings
      prisma.rating.findMany({ select: { score: true } }),

      // Average distance
      prisma.booking.aggregate({
        where: { status: BookingStatus.COMPLETED },
        _avg: { distanceKm: true },
      }),

      // All-time cash revenue from completed rides
      prisma.booking.aggregate({
        where: { status: BookingStatus.COMPLETED },
        _sum: { estimatedPrice: true },
      }),

      // Today's cash revenue from completed rides
      prisma.booking.aggregate({
        where: {
          status: BookingStatus.COMPLETED,
          updatedAt: { gte: startOfDay },
        },
        _sum: { estimatedPrice: true },
      }),

      // This month's cash revenue from completed rides
      prisma.booking.aggregate({
        where: {
          status: BookingStatus.COMPLETED,
          updatedAt: { gte: startOfMonth },
        },
        _sum: { estimatedPrice: true },
      }),
    ]);

    const totalRatings = ratings.length;
    const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
    const averageRating = totalRatings > 0 ? Math.round((totalScore / totalRatings) * 10) / 10 : 0;

    const totalRevenue = allTimeRevenueSummary?._sum?.estimatedPrice ?? 0;
    const dailyRevenue = todayRevenueSummary?._sum?.estimatedPrice ?? 0;
    const monthlyRevenue = monthlyRevenueSummary?._sum?.estimatedPrice ?? 0;

    const avgKm = completedBookingsDistance?._avg?.distanceKm;
    const averageDistanceKm = typeof avgKm === 'number' ? Math.round(avgKm * 10) / 10 : 0;

    return {
      totalCustomers,
      activeCustomers,
      newUsersThisMonth,
      totalRides: totalBookings,
      completedRides,
      cancelledRides,
      todayCompletedRides,
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
