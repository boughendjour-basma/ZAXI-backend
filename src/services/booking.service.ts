import { MapsService } from './maps.service';
import { PricingService } from './pricing.service';
import prisma from '../config/database';
import { BookingStatus } from '@prisma/client';

export interface CreateBookingInput {
  pickup: {
    address: string;
    latitude: number;
    longitude: number;
  };
  destination: {
    address: string;
    latitude: number;
    longitude: number;
  };
  scheduledAt?: string;
}

export class BookingService {
  /**
   * Creates a new ride booking for a customer.
   *
   * @param customerId ID of the authenticated customer
   * @param data Validated booking input data
   * @returns The created booking record
   */
  static async createBooking(customerId: string, data: CreateBookingInput) {
    const pickupCoords = { latitude: data.pickup.latitude, longitude: data.pickup.longitude };
    const destinationCoords = { latitude: data.destination.latitude, longitude: data.destination.longitude };

    // 1. Calculate the route distance and duration
    const { distanceKm, durationMinutes } = await MapsService.getRoute(
      pickupCoords,
      destinationCoords
    );

    // 2. Calculate the price and pricing mode via PricingService
    const { pricingType, estimatedPrice, cityFlatFareUsed, outsideRatePerKmUsed } = await PricingService.calculatePrice(
      pickupCoords,
      destinationCoords,
      distanceKm
    );

    // 3. Create the database record with pricing audit snapshot
    const booking = await prisma.booking.create({
      data: {
        customerId,
        status: BookingStatus.PENDING,
        pricingType,
        cityFlatFareUsed,
        outsideRatePerKmUsed,
        pickupAddress: data.pickup.address,
        pickupLatitude: data.pickup.latitude,
        pickupLongitude: data.pickup.longitude,
        destinationAddress: data.destination.address,
        destinationLatitude: data.destination.latitude,
        destinationLongitude: data.destination.longitude,
        distanceKm,
        durationMinutes,
        estimatedPrice,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });

    return booking;
  }
  static async getCustomerBookings(customerId: string, filters: { page: number, limit: number, status?: BookingStatus }) {
    const { page, limit, status } = filters;
    const skip = (page - 1) * limit;

    const where = {
      customerId,
      ...(status ? { status } : {})
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.booking.count({ where })
    ]);

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getCustomerBookingById(customerId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!booking || booking.customerId !== customerId) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    // Privacy rule: Do not expose driver details before ride is ACCEPTED
    if (booking.status === BookingStatus.PENDING) {
      const { driver, ...bookingWithoutDriver } = booking;
      return { ...bookingWithoutDriver, driver: null };
    }

    return booking;
  }

  static async cancelCustomerBooking(customerId: string, bookingId: string) {
    // We use a safe atomic update by requiring the current status to be PENDING or ACCEPTED
    // inside the "where" clause. If the booking doesn't exist, isn't owned by this customer,
    // or has already changed to a non-cancellable state, the update will fail to find a record.
    
    try {
      const cancelledBooking = await prisma.booking.update({
        where: {
          id: bookingId,
          customerId: customerId,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.ACCEPTED]
          }
        },
        data: {
          status: BookingStatus.CANCELLED
        }
      });

      return cancelledBooking;
    } catch (error: any) {
      // Prisma throws P2025 when the record to update is not found
      if (error.code === 'P2025') {
        const customError: any = new Error('Booking not found or cannot be cancelled');
        customError.statusCode = 400; // You could also use 404 or 409 depending on preference
        throw customError;
      }
      throw error;
    }
  }
}
