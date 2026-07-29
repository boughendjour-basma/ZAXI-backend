import prisma from '../config/database';
import { DEFAULT_CITY_FLAT_FARE, DEFAULT_OUTSIDE_RATE_PER_KM } from '../config/pricing.config';
import { AuditLogService } from './audit-log.service';

export interface PricingSettingsResult {
  cityFlatFare: number;
  outsideRatePerKm: number;
}

export interface UpdatePricingSettingsInput {
  cityFlatFare?: number;
  outsideRatePerKm?: number;
}

export class PricingSettingsService {
  /**
   * Retrieves the single global PricingSettings record from the database.
   * If no record exists yet, automatically seeds the default values (150 DA flat fare, 40 DA/km outside rate).
   *
   * @returns PricingSettingsResult containing cityFlatFare and outsideRatePerKm
   */
  static async getSettings(): Promise<PricingSettingsResult> {
    let settings = await prisma.pricingSettings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await prisma.pricingSettings.create({
        data: {
          id: 1,
          cityFlatFare: DEFAULT_CITY_FLAT_FARE,
          outsideRatePerKm: DEFAULT_OUTSIDE_RATE_PER_KM,
        },
      });
    }

    return {
      cityFlatFare: settings.cityFlatFare,
      outsideRatePerKm: settings.outsideRatePerKm,
    };
  }

  /**
   * Updates global pricing settings. Callable only by DRIVER.
   *
   * @param input Data object containing cityFlatFare and/or outsideRatePerKm
   * @returns Updated PricingSettingsResult
   * @throws Error with `statusCode` 400 if validation fails
   */
  static async updateSettings(input: UpdatePricingSettingsInput): Promise<PricingSettingsResult> {
    if (!input || typeof input !== 'object') {
      const error: any = new Error('Invalid request payload');
      error.statusCode = 400;
      throw error;
    }

    const { cityFlatFare, outsideRatePerKm } = input;

    if (cityFlatFare !== undefined) {
      this.validatePositiveInteger(cityFlatFare, 'cityFlatFare');
    }

    if (outsideRatePerKm !== undefined) {
      this.validatePositiveInteger(outsideRatePerKm, 'outsideRatePerKm');
    }

    if (cityFlatFare === undefined && outsideRatePerKm === undefined) {
      const error: any = new Error('At least one pricing field must be provided to update');
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.pricingSettings.upsert({
      where: { id: 1 },
      update: {
        ...(cityFlatFare !== undefined ? { cityFlatFare } : {}),
        ...(outsideRatePerKm !== undefined ? { outsideRatePerKm } : {}),
      },
      create: {
        id: 1,
        cityFlatFare: cityFlatFare ?? DEFAULT_CITY_FLAT_FARE,
        outsideRatePerKm: outsideRatePerKm ?? DEFAULT_OUTSIDE_RATE_PER_KM,
      },
    });

    AuditLogService.logAction({
      action: 'DRIVER_PRICING_UPDATED',
      entity: 'PricingSettings',
      entityId: '1',
      metadata: { cityFlatFare: updated.cityFlatFare, outsideRatePerKm: updated.outsideRatePerKm },
    }).catch(() => {});

    return {
      cityFlatFare: updated.cityFlatFare,
      outsideRatePerKm: updated.outsideRatePerKm,
    };
  }

  /**
   * Validates that a pricing input value is a positive whole integer.
   */
  private static validatePositiveInteger(value: any, fieldName: string): void {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      const error: any = new Error(`${fieldName} must be a valid number`);
      error.statusCode = 400;
      throw error;
    }

    if (!Number.isInteger(value)) {
      const error: any = new Error(`${fieldName} must be a whole integer without decimals`);
      error.statusCode = 400;
      throw error;
    }

    if (value <= 0) {
      const error: any = new Error(`${fieldName} must be a positive integer greater than zero`);
      error.statusCode = 400;
      throw error;
    }
  }
}
