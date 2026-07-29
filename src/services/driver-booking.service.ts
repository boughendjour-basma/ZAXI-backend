import prisma from '../config/database';
import { BookingStatus } from '@prisma/client';
import { BookingStateMachine } from '../utils/booking-state-machine';
import { SocketService } from '../sockets/socket.service';
import { DriverLocationService } from './driver-location.service';
import { NotificationService } from './notification.service';

export class DriverBookingService {
  /**
   * Retrieves bookings for the driver dashboard with filtering and pagination.
   */
  static async getDriverBookings(
    driverId: string,
    filters: { page: number; limit: number; status?: BookingStatus }
  ) {
    const { page, limit, status } = filters;
    const skip = (page - 1) * limit;

    let where: any;
    if (status) {
      if (status === BookingStatus.PENDING) {
        where = { status: BookingStatus.PENDING };
      } else {
        where = {
          status,
          OR: [{ driverId }, { driverId: null }]
        };
      }
    } else {
      where = {
        OR: [
          { driverId },
          { status: BookingStatus.PENDING, driverId: null }
        ]
      };
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          customer: {
            select: {
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    const formattedBookings = bookings.map((b) => ({
      id: b.id,
      customer: b.customer ? { name: b.customer.name, phone: b.customer.phone } : null,
      pickupLatitude: b.pickupLatitude,
      pickupLongitude: b.pickupLongitude,
      pickupAddress: b.pickupAddress,
      destinationLatitude: b.destinationLatitude,
      destinationLongitude: b.destinationLongitude,
      destinationAddress: b.destinationAddress,
      estimatedPrice: b.estimatedPrice,
      distanceKm: b.distanceKm,
      durationMinutes: b.durationMinutes,
      status: b.status,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));

    return {
      bookings: formattedBookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Accepts a pending ride booking atomically.
   */
  static async acceptBooking(driverId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    BookingStateMachine.validateTransition(booking.status, BookingStatus.ACCEPTED);

    if (booking.status !== BookingStatus.PENDING) {
      const error: any = new Error('Booking is not in PENDING status');
      error.statusCode = 409;
      throw error;
    }

    try {
      const updated = await prisma.booking.update({
        where: {
          id: bookingId,
          status: BookingStatus.PENDING,
        },
        data: {
          status: BookingStatus.ACCEPTED,
          driverId,
        },
      });

      SocketService.emitBookingAccepted({
        bookingId: updated.id,
        status: BookingStatus.ACCEPTED,
      });

      const driverUser = await prisma.user.findUnique({ where: { id: driverId }, select: { phone: true, name: true } });
      if (driverUser?.phone) {
        SocketService.emitDriverPhoneAvailable({
          bookingId: updated.id,
          phone: driverUser.phone,
        });
      }

      // Persist notification for offline customers
      const driverName = driverUser?.name ?? 'Your driver';
      DriverBookingService.saveNotification(
        updated.customerId,
        'booking:accepted',
        'Booking accepted',
        `${driverName} has accepted your ride and is on the way!`
      );

      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') {
        const conflictError: any = new Error('Booking is no longer available to accept');
        conflictError.statusCode = 409;
        throw conflictError;
      }
      throw error;
    }
  }

  // ─── Notification helper (fire-and-forget) ────────────────────────────────
  private static saveNotification(
    userId: string,
    type: string,
    title: string,
    message: string
  ) {
    NotificationService.create({ userId, type, title, message }).catch(console.error);
  }

  /**
   * Rejects a pending ride booking atomically (sets status to CANCELLED).
   */
  static async rejectBooking(driverId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    BookingStateMachine.validateTransition(booking.status, BookingStatus.CANCELLED);

    if (booking.status !== BookingStatus.PENDING) {
      const error: any = new Error('Only PENDING bookings can be rejected');
      error.statusCode = 409;
      throw error;
    }

    try {
      const updated = await prisma.booking.update({
        where: {
          id: bookingId,
          status: BookingStatus.PENDING,
        },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });

      SocketService.emitBookingCancelled({
        bookingId: updated.id,
        status: BookingStatus.CANCELLED,
      });

      await DriverLocationService.cleanupDriverLocation(bookingId);

      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') {
        const conflictError: any = new Error('Booking is no longer available to reject');
        conflictError.statusCode = 409;
        throw conflictError;
      }
      throw error;
    }
  }

  /**
   * Starts an accepted ride atomically (sets status to IN_PROGRESS).
   */
  static async startRide(driverId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    BookingStateMachine.validateTransition(booking.status, BookingStatus.IN_PROGRESS);

    if (booking.status !== BookingStatus.ACCEPTED) {
      const error: any = new Error('Only ACCEPTED rides can start');
      error.statusCode = 409;
      throw error;
    }

    try {
      const updated = await prisma.booking.update({
        where: {
          id: bookingId,
          status: BookingStatus.ACCEPTED,
        },
        data: {
          status: BookingStatus.IN_PROGRESS,
        },
      });

      SocketService.emitBookingStarted({
        bookingId: updated.id,
        status: BookingStatus.IN_PROGRESS,
      });

      // Persist notification for offline customers
      DriverBookingService.saveNotification(
        updated.customerId,
        'ride:started',
        'Ride started',
        'Your driver has started the ride. Enjoy your trip!'
      );

      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') {
        const conflictError: any = new Error('Booking is no longer in ACCEPTED status');
        conflictError.statusCode = 409;
        throw conflictError;
      }
      throw error;
    }
  }

  /**
   * Completes an in-progress ride atomically (sets status to COMPLETED).
   */
  static async completeRide(driverId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    BookingStateMachine.validateTransition(booking.status, BookingStatus.COMPLETED);

    if (booking.status !== BookingStatus.IN_PROGRESS) {
      const error: any = new Error('Only IN_PROGRESS rides can be completed');
      error.statusCode = 409;
      throw error;
    }

    try {
      const updated = await prisma.booking.update({
        where: {
          id: bookingId,
          status: BookingStatus.IN_PROGRESS,
        },
        data: {
          status: BookingStatus.COMPLETED,
        },
      });

      SocketService.emitBookingCompleted({
        bookingId: updated.id,
        status: BookingStatus.COMPLETED,
      });

      // Persist notification for offline customers
      DriverBookingService.saveNotification(
        updated.customerId,
        'ride:completed',
        'Ride completed',
        'Your ride has been completed. Thank you for choosing ZAXI!'
      );

      await DriverLocationService.cleanupDriverLocation(bookingId);

      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') {
        const conflictError: any = new Error('Booking is no longer in IN_PROGRESS status');
        conflictError.statusCode = 409;
        throw conflictError;
      }
      throw error;
    }
  }
}
