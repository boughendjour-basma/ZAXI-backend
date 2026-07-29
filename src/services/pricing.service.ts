import { Coordinates } from '../config/pricing.config';
import { ZoneService } from './zone.service';
import { PricingSettingsService } from './pricing-settings.service';
import { PricingType } from '@prisma/client';

export interface PricingResult {
  pricingType: PricingType;
  distanceKm: number;
  ratePerKm: number | null;
  estimatedPrice: number;
  /** The city flat fare value snapshot at the time of booking creation. */
  cityFlatFareUsed: number | null;
  /** The outside rate per km value snapshot at the time of booking creation. */
  outsideRatePerKmUsed: number | null;
}

export class PricingService {
  /**
   * Calculates the estimated ride price dynamically based on geographic zone detection
   * and database-configured pricing settings.
   *
   * @param pickup Starting coordinates
   * @param destination Destination coordinates
   * @param distanceKm Distance in kilometres provided by MapsService. Must be a finite positive number.
   * @returns A {@link PricingResult} containing pricingType, distanceKm, ratePerKm, estimatedPrice, and pricing audit snapshot fields.
   * @throws Error with `statusCode` 400 if validation fails.
   */
  static async calculatePrice(
    pickup: Coordinates,
    destination: Coordinates,
    distanceKm: number
  ): Promise<PricingResult> {
    // ── Validation ──────────────────────────────────────────────────────
    if (typeof distanceKm !== 'number' || Number.isNaN(distanceKm)) {
      const error: any = new Error('Distance must be a valid number');
      error.statusCode = 400;
      throw error;
    }

    if (!Number.isFinite(distanceKm)) {
      const error: any = new Error('Distance must be a finite number');
      error.statusCode = 400;
      throw error;
    }

    if (distanceKm <= 0) {
      const error: any = new Error('Distance must be a positive number greater than zero');
      error.statusCode = 400;
      throw error;
    }

    // ── Zone Detection ─────────────────────────────────────────────────
    const isCity = ZoneService.isCityTrip(pickup, destination);

    // ── Settings Lookup ────────────────────────────────────────────────
    const settings = await PricingSettingsService.getSettings();

    // ── Fare Calculation with Audit Snapshot ───────────────────────────
    if (isCity) {
      return {
        pricingType: PricingType.CITY,
        distanceKm,
        ratePerKm: null,
        estimatedPrice: settings.cityFlatFare,
        cityFlatFareUsed: settings.cityFlatFare,
        outsideRatePerKmUsed: null,
      };
    }

    const ratePerKm = settings.outsideRatePerKm;
    const estimatedPrice = Math.round(distanceKm * ratePerKm);

    return {
      pricingType: PricingType.DISTANCE,
      distanceKm,
      ratePerKm,
      estimatedPrice,
      cityFlatFareUsed: null,
      outsideRatePerKmUsed: ratePerKm,
    };
  }
}
