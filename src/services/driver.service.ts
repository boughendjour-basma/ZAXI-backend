import prisma from '../config/database';
import { BookingStatus } from '@prisma/client';
import { BookingStateMachine } from '../utils/booking-state-machine';
import { SocketService } from '../sockets/socket.service';
import { NotificationService } from './notification.service';

export class DriverService {
  /**
   * Retrieves bookings for the driver.
   * Can see:
   * - PENDING bookings where driverId is null (unassigned)
   * - Any booking assigned to this driver
   */
  static async getDriverBookings(driverId: string, filters: { page: number, limit: number, status?: BookingStatus }) {
    const { page, limit, status } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { driverId: driverId },
        { status: BookingStatus.PENDING, driverId: null }
      ]
    };

    if (status) {
      where.status = status;
    }

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

  /**
   * Retrieves a specific booking.
   * Must be assigned to this driver or be PENDING unassigned.
   */
  static async getDriverBookingById(driverId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    const isPendingUnassigned = booking.status === BookingStatus.PENDING && booking.driverId === null;
    const isAssignedToMe = booking.driverId === driverId;

    if (!isPendingUnassigned && !isAssignedToMe) {
      const error: any = new Error('Booking not found or not accessible');
      error.statusCode = 404;
      throw error;
    }

    return booking;
  }

  /**
   * Updates a booking's status. Handles concurrency for ACCEPTED/REJECTED.
   */
  static async updateBookingStatus(driverId: string, bookingId: string, nextStatus: BookingStatus) {
    // We must read the booking first to know its current state for validation
    const booking = await this.getDriverBookingById(driverId, bookingId);

    // Validate the state transition
    BookingStateMachine.validateTransition(booking.status, nextStatus);

    if (nextStatus === BookingStatus.ACCEPTED) {
      return this.acceptBooking(driverId, bookingId);
    }

    if (nextStatus === BookingStatus.REJECTED) {
      return this.rejectBooking(driverId, bookingId);
    }

    // For other transitions (DRIVER_ARRIVING, ARRIVED, IN_PROGRESS, COMPLETED),
    // the driver is already assigned, so we can do a safe update.
    try {
      const updatedBooking = await prisma.booking.update({
        where: {
          id: bookingId,
          driverId: driverId,
          status: booking.status // Ensure status hasn't changed since read
        },
        data: {
          status: nextStatus
        }
      });

      // Emit socket event and save notification according to status
      if (nextStatus === BookingStatus.DRIVER_ARRIVING) {
        SocketService.emitBookingDriverArriving({ bookingId: updatedBooking.id, status: nextStatus });
        NotificationService.create({
          userId: updatedBooking.customerId,
          type: 'booking:driver_arriving',
          title: 'Chauffeur en route',
          message: 'Votre chauffeur se dirige vers votre lieu de prise en charge.',
        }).catch(console.error);
      } else if (nextStatus === BookingStatus.ARRIVED) {
        SocketService.emitBookingDriverArrived({ bookingId: updatedBooking.id, status: nextStatus });
        NotificationService.create({
          userId: updatedBooking.customerId,
          type: 'booking:driver_arrived',
          title: 'Chauffeur arrivé',
          message: 'Votre chauffeur est arrivé au point de rendez-vous !',
        }).catch(console.error);
      } else if (nextStatus === BookingStatus.IN_PROGRESS) {
        SocketService.emitBookingStarted({ bookingId: updatedBooking.id, status: nextStatus });
        NotificationService.create({
          userId: updatedBooking.customerId,
          type: 'ride:started',
          title: 'Course démarrée',
          message: 'Votre course a démarré. Bon trajet avec ZAXI !',
        }).catch(console.error);
      } else if (nextStatus === BookingStatus.COMPLETED) {
        SocketService.emitBookingCompleted({ bookingId: updatedBooking.id, status: nextStatus });
        NotificationService.create({
          userId: updatedBooking.customerId,
          type: 'ride:completed',
          title: 'Course terminée',
          message: 'Votre course est terminée. Merci d\'avoir utilisé ZAXI !',
        }).catch(console.error);
      }

      return updatedBooking;
    } catch (error: any) {
      if (error.code === 'P2025') {
        const customError: any = new Error('Booking state changed concurrently or is no longer accessible');
        customError.statusCode = 409;
        throw customError;
      }
      throw error;
    }
  }

  private static async acceptBooking(driverId: string, bookingId: string) {
    try {
      // Atomic update: only succeeds if status is PENDING and driverId is null
      const updated = await prisma.booking.update({
        where: {
          id: bookingId,
          status: BookingStatus.PENDING,
          driverId: null
        },
        data: {
          status: BookingStatus.ACCEPTED,
          driverId: driverId
        }
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') {
        const customError: any = new Error('Booking is no longer available to accept');
        customError.statusCode = 409; // Conflict
        throw customError;
      }
      throw error;
    }
  }

  private static async rejectBooking(driverId: string, bookingId: string) {
    try {
      // Atomic update: only succeeds if status is PENDING and driverId is null
      const updated = await prisma.booking.update({
        where: {
          id: bookingId,
          status: BookingStatus.PENDING,
          driverId: null
        },
        data: {
          status: BookingStatus.REJECTED,
          driverId: null
        }
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') {
        const customError: any = new Error('Booking is no longer available to reject');
        customError.statusCode = 409; // Conflict
        throw customError;
      }
      throw error;
    }
  }
}
