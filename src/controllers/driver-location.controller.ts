import { Request, Response, NextFunction } from 'express';
import { DriverLocationService } from '../services/driver-location.service';
import {
  bookingIdParamSchema,
  updateLocationSchema,
} from '../validators/driver-location.validator';

export class DriverLocationController {
  /**
   * PATCH /api/driver/bookings/:id/location
   * Driver updates GPS location for an active booking.
   */
  static async updateLocation(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const locationData = updateLocationSchema.parse(req.body);

      const location = await DriverLocationService.updateDriverLocation(
        req.user.userId,
        id,
        locationData
      );

      return res.status(200).json({
        status: 'success',
        data: { location },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bookings/:id/location
   * Customer or driver retrieves the live location & phase-aware ETA.
   */
  static async getLocation(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const { id } = bookingIdParamSchema.parse(req.params);
      const trackingInfo = await DriverLocationService.getDriverLocation(
        req.user.userId,
        id
      );

      return res.status(200).json({
        status: 'success',
        data: trackingInfo,
      });
    } catch (error) {
      next(error);
    }
  }
}
