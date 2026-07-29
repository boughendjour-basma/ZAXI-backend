import prisma from '../config/database';
import { BookingStatus } from '@prisma/client';
import { BookingStateMachine } from '../utils/booking-state-machine';
import { SocketService } from '../sockets/socket.service';
import { NotificationService } from './notification.service';

// Fields returned for a booking list item (lightweight)
const BOOKING_LIST_SELECT = {
  id: true,
  status: true,
  pickupAddress: true,
  destinationAddress: true,
  estimatedPrice: true,
  distanceKm: true,
  scheduledAt: true,
  createdAt: true,
  driverId: true,
  driver: {
    select: { id: true, name: true },
  },
};

// Fields returned for a booking detail (full)
const BOOKING_DETAIL_SELECT = {
  id: true,
  status: true,
  pickupAddress: true,
  destinationAddress: true,
  pickupLatitude: true,
  pickupLongitude: true,
  destinationLatitude: true,
  destinationLongitude: true,
  estimatedPrice: true,
  distanceKm: true,
  durationMinutes: true,
  pricingType: true,
  scheduledAt: true,
  createdAt: true,
  updatedAt: true,
  driverId: true,
  customerId: true,
  driver: {
    select: { id: true, name: true, phone: true, profilePhoto: true },
  },
  payment: {
    select: { id: true, amount: true, paymentMethod: true, status: true, paidAt: true },
  },
  rating: {
    select: { id: true, score: true, comment: true, createdAt: true },
  },
};

// Privacy filter: hide driver phone before ACCEPTED
function applyPrivacyFilter(booking: any) {
  if (!booking) return null;
  const acceptedStatuses: BookingStatus[] = [
    BookingStatus.ACCEPTED,
    BookingStatus.DRIVER_ARRIVING,
    BookingStatus.ARRIVED,
    BookingStatus.IN_PROGRESS,
    BookingStatus.COMPLETED,
  ];
  if (!acceptedStatuses.includes(booking.status as BookingStatus) && booking.driver) {
    return {
      ...booking,
      driver: { id: booking.driver.id, name: booking.driver.name },
    };
  }
  return booking;
}

export class CustomerBookingService {
  /**
   * Returns paginated bookings for a customer with optional status filter.
   */
  static async getMyBookings(
    customerId: string,
    filters: { page: number; limit: number; status?: BookingStatus }
  ) {
    const { page, limit, status } = filters;
    const skip = (page - 1) * limit;

    const where: any = { customerId };
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        select: BOOKING_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings: bookings.map(applyPrivacyFilter),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns full booking details for a customer.
   * Returns 404 if booking doesn't belong to this customer (ID enumeration protection).
   */
  static async getMyBookingById(customerId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: BOOKING_DETAIL_SELECT,
    });

    if (!booking || booking.customerId !== customerId) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    return applyPrivacyFilter(booking);
  }

  /**
   * Customer cancels their own booking.
   *
   * Allowed transitions:
   * - PENDING → CANCELLED
   * - ACCEPTED → CANCELLED (driver hasn't started yet)
   *
   * Forbidden:
   * - IN_PROGRESS → CANCELLED ❌
   * - COMPLETED → CANCELLED ❌
   */
  static async cancelBooking(customerId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking || booking.customerId !== customerId) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    const cancellableStatuses: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.ACCEPTED];
    if (!cancellableStatuses.includes(booking.status)) {
      const error: any = new Error(
        `Cannot cancel a booking with status ${booking.status}. Only PENDING or ACCEPTED bookings can be cancelled.`
      );
      error.statusCode = 409;
      throw error;
    }

    // Use state machine for validation
    BookingStateMachine.validateTransition(booking.status, BookingStatus.CANCELLED);

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });

    SocketService.emitBookingCancelled({
      bookingId: updated.id,
      status: BookingStatus.CANCELLED,
    });

    // Persist notification for the customer
    NotificationService.create({
      userId: customerId,
      type: 'booking:cancelled',
      title: 'Booking cancelled',
      message: 'Your ride booking has been cancelled.',
    }).catch(console.error);

    return updated;
  }
}
