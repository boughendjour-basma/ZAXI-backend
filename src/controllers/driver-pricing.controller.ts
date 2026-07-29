import { Request, Response, NextFunction } from 'express';
import { PricingSettingsService } from '../services/pricing-settings.service';
import { updatePricingSchema } from '../validators/driver-pricing.validator';

export class DriverPricingController {
  /**
   * GET /api/driver/pricing
   * Retrieves the current global pricing settings. Protected: DRIVER only.
   */
  static async getPricing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await PricingSettingsService.getSettings();
      res.status(200).json({
        cityFlatFare: settings.cityFlatFare,
        outsideRatePerKm: settings.outsideRatePerKm,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/driver/pricing
   * Updates global pricing settings. Protected: DRIVER only.
   */
  static async updatePricing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = updatePricingSchema.parse(req.body);
      const updatedSettings = await PricingSettingsService.updateSettings(validatedData);
      
      res.status(200).json({
        cityFlatFare: updatedSettings.cityFlatFare,
        outsideRatePerKm: updatedSettings.outsideRatePerKm,
      });
    } catch (error) {
      next(error);
    }
  }
}
