import { Request, Response, NextFunction } from 'express';
import { DriverBookingService } from '../services/driver-booking.service';
import {
  bookingIdParamSchema,
  driverBookingQuerySchema,
} from '../validators/driver-booking.validator';

export class DriverBookingController {
  /**
   * GET /api/driver/bookings
   */
  static async getBookings(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const filters = driverBookingQuerySchema.parse(req.query);
      const result = await DriverBookingService.getDriverBookings(req.user.userId, filters);

      return res.status(200).json({
        status: 'success',
        data: result,
        bookings: result.bookings,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/driver/bookings/:id/accept
   */
  static async acceptBooking(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const booking = await DriverBookingService.acceptBooking(req.user.userId, id);

      return res.status(200).json({
        status: 'success',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/driver/bookings/:id/reject
   */
  static async rejectBooking(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const booking = await DriverBookingService.rejectBooking(req.user.userId, id);

      return res.status(200).json({
        status: 'success',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/driver/bookings/:id/start
   */
  static async startRide(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const booking = await DriverBookingService.startRide(req.user.userId, id);

      return res.status(200).json({
        status: 'success',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/driver/bookings/:id/complete
   */
  static async completeRide(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const booking = await DriverBookingService.completeRide(req.user.userId, id);

      return res.status(200).json({
        status: 'success',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }
}
