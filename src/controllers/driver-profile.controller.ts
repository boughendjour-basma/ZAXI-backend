import { Request, Response, NextFunction } from 'express';
import { DriverProfileService } from '../services/driver-profile.service';
import { updateDriverProfileSchema, setAvailabilitySchema } from '../validators/driver-profile.validator';

export class DriverProfileController {
  /**
   * GET /api/driver/profile
   * Retrieves the driver personal profile. Protected: DRIVER only.
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await DriverProfileService.getProfile();
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/driver/profile
   * Updates the driver personal profile. Protected: DRIVER only.
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = updateDriverProfileSchema.parse(req.body);
      const updated = await DriverProfileService.updateProfile(validatedData);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/driver/availability
   * Sets driver online/offline status. Protected: DRIVER only.
   */
  static async setAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isOnline } = setAvailabilitySchema.parse(req.body);
      const result = await DriverProfileService.setAvailability(isOnline);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/public/driver-profile
   * Returns public driver profile info including isOnline status.
   * No authentication required.
   */
  static async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await DriverProfileService.getProfile();
      res.status(200).json({
        status: 'success',
        data: {
          driver: {
            driverName: profile.driverName,
            name: profile.driverName,
            phoneNumber: profile.phoneNumber,
            phone: profile.phoneNumber,
            whatsappNumber: profile.whatsappNumber,
            profilePhoto: profile.profilePhoto,
            description: profile.description,
            workingHours: profile.workingHours,
            isOnline: profile.isOnline,
            ratingAverage: profile.ratingAverage,
            totalTrips: profile.totalTrips,
            vehicleMake: profile.vehicleMake,
            vehicleModel: profile.vehicleModel,
            vehicleColor: profile.vehicleColor,
            vehiclePlate: profile.vehiclePlate,
            ccpNumber: profile.ccpNumber,
            ccpKey: profile.ccpKey,
            carPhotos: profile.carPhotos,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
