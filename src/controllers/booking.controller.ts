import { Request, Response, NextFunction } from 'express';
import { EstimateService } from '../services/estimate.service';
import { BookingService } from '../services/booking.service';
import { estimateSchema, createBookingSchema, paginationQuerySchema, bookingIdParamSchema } from '../validators/booking.validator';

export class BookingController {
  static async getEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = estimateSchema.parse(req.body);
      const { pickup, destination } = validatedData;
      
      const estimate = await EstimateService.calculateEstimate(pickup, destination);
      
      res.status(200).json(estimate);
    } catch (error) {
      next(error);
    }
  }

  static async createBooking(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const validatedData = createBookingSchema.parse(req.body);
      
      const booking = await BookingService.createBooking(req.user.userId, validatedData);
      
      return res.status(201).json({
        status: 'success',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerBookings(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const filters = paginationQuerySchema.parse(req.query);
      const result = await BookingService.getCustomerBookings(req.user.userId, filters);
      
      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerBookingById(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const booking = await BookingService.getCustomerBookingById(req.user.userId, id);
      
      return res.status(200).json({
        status: 'success',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelBooking(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const booking = await BookingService.cancelCustomerBooking(req.user.userId, id);
      
      return res.status(200).json({
        status: 'success',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }
}

