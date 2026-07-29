import { Request, Response, NextFunction } from 'express';
import { CustomerBookingService } from '../services/customer-booking.service';
import { customerBookingQuerySchema } from '../validators/customer.validator';
import { BookingStatus } from '@prisma/client';

export class CustomerBookingController {
  static async getMyBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const query = customerBookingQuerySchema.parse(req.query);

      const result = await CustomerBookingService.getMyBookings(userId, {
        page: query.page,
        limit: query.limit,
        status: query.status as BookingStatus | undefined,
      });

      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getMyBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const id = req.params.id as string;

      const booking = await CustomerBookingService.getMyBookingById(userId, id);

      res.status(200).json({ status: 'success', data: { booking } });
    } catch (error) {
      next(error);
    }
  }

  static async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const id = req.params.id as string;

      const booking = await CustomerBookingService.cancelBooking(userId, id);

      res.status(200).json({
        status: 'success',
        message: 'Booking cancelled successfully',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }
}
