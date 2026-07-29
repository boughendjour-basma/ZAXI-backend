import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import {
  bookingIdParamSchema,
  createPaymentSchema,
  historyQuerySchema,
  earningsQuerySchema,
} from '../validators/payment.validator';

export class PaymentController {
  /**
   * POST /api/bookings/:id/payment
   * Customer creates a payment for a completed booking.
   */
  static async createPayment(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const data = createPaymentSchema.parse(req.body);

      const payment = await PaymentService.createPayment(req.user.userId, id, data);

      return res.status(201).json({
        status: 'success',
        data: { payment },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bookings/:id/payment
   * Retrieve the payment for a booking (customer or driver).
   */
  static async getPayment(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const payment = await PaymentService.getPayment(req.user.userId, id);

      return res.status(200).json({
        status: 'success',
        data: { payment },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bookings/:id/receipt
   * Returns an immutable ride receipt (customer or driver).
   */
  static async getReceipt(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const receipt = await PaymentService.getReceipt(req.user.userId, id);

      return res.status(200).json({
        status: 'success',
        data: { receipt },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bookings/history
   * Customer ride history with filtering and pagination.
   */
  static async getHistory(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const filters = historyQuerySchema.parse(req.query);
      const result = await PaymentService.getCustomerHistory(req.user.userId, filters);

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/driver/earnings
   * Driver earnings dashboard.
   */
  static async getDriverEarnings(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const filters = earningsQuerySchema.parse(req.query);
      const earnings = await PaymentService.getDriverEarnings(req.user.userId, filters);

      return res.status(200).json({
        status: 'success',
        data: { earnings },
      });
    } catch (error) {
      next(error);
    }
  }
}
