import { Request, Response, NextFunction } from 'express';
import { DriverProfileService } from '../services/driver-profile.service';
import { updateDriverProfileSchema } from '../validators/driver-profile.validator';

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
   * GET /api/public/driver-profile
   * Returns public driver profile info (name, phone, description, working hours).
   * No authentication required.
   */
  static async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await DriverProfileService.getProfile();
      // Expose only public-safe fields
      res.status(200).json({
        driverName: profile.driverName,
        phoneNumber: profile.phoneNumber,
        whatsappNumber: profile.whatsappNumber,
        profilePhoto: profile.profilePhoto,
        description: profile.description,
        workingHours: profile.workingHours,
      });
    } catch (error) {
      next(error);
    }
  }
}
