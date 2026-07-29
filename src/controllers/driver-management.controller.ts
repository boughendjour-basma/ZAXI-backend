import { Request, Response, NextFunction } from 'express';
import { DriverManagementService } from '../services/driver-management.service';
import { AuditLogService } from '../services/audit-log.service';
import {
  adminPaginationSchema,
  adminBookingQuerySchema,
  auditLogQuerySchema,
} from '../validators/admin.validator';

export class DriverManagementController {
  /**
   * GET /api/driver/statistics
   */
  static async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await DriverManagementService.getStatistics();
      res.status(200).json({ status: 'success', data: stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/driver/customers
   */
  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = adminPaginationSchema.parse(req.query);
      const result = await DriverManagementService.getCustomers(filters);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/driver/bookings-management
   */
  static async getBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = adminBookingQuerySchema.parse(req.query);
      const result = await DriverManagementService.getBookings(filters);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/driver/audit-logs
   */
  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = auditLogQuerySchema.parse(req.query);
      const result = await AuditLogService.list(filters);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }
}
