import { Request, Response, NextFunction } from 'express';
import { BookingStatus } from '@prisma/client';
import { DriverService } from '../services/driver.service';
import { paginationQuerySchema, bookingIdParamSchema, updateBookingStatusSchema } from '../validators/driver.validator';

export class DriverController {
  static async getDriverBookings(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const filters = paginationQuerySchema.parse(req.query);
      const result = await DriverService.getDriverBookings(req.user.userId, {
        ...filters,
        status: filters.status as BookingStatus | undefined
      });
      
      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDriverBookingById(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const booking = await DriverService.getDriverBookingById(req.user.userId, id);
      
      return res.status(200).json({
        status: 'success',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateBookingStatus(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const { status } = updateBookingStatusSchema.parse(req.body);

      const booking = await DriverService.updateBookingStatus(req.user.userId, id, status as BookingStatus);
      
      return res.status(200).json({
        status: 'success',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }
}
