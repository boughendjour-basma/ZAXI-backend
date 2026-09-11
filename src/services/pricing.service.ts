import { Coordinates } from '../config/pricing.config';
import { ZoneService } from './zone.service';
import { PricingSettingsService } from './pricing-settings.service';
import { detectBbaFixedRoute } from '../config/bba-fixed-routes.config';
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
  fixedRouteName?: string;
}

export class PricingService {
  /**
   * Calculates the estimated ride price dynamically based on:
   * 1. BBA City limits (flat fare)
   * 2. BBA Center <-> Outer Daïras fixed routes (Medjana, Zemmoura, Ras El Oued, etc.)
   * 3. Inter-wilaya distance rate per km
   *
   * @param pickup Starting coordinates
   * @param destination Destination coordinates
   * @param distanceKm Distance in kilometres provided by MapsService. Must be a finite positive number.
   * @param pickupAddress Optional human-readable pickup address
   * @param destinationAddress Optional human-readable destination address
   * @returns A {@link PricingResult} containing pricingType, distanceKm, ratePerKm, estimatedPrice, and pricing audit snapshot fields.
   */
  static async calculatePrice(
    pickup: Coordinates,
    destination: Coordinates,
    distanceKm: number,
    pickupAddress?: string | null,
    destinationAddress?: string | null
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

    // ── 1. BBA Center <-> Daïras Fixed Route Check (MUST run first) ──────────
    // Fixed routes take priority over the generic city flat fare.
    const fixedRoute = detectBbaFixedRoute(
      pickup,
      destination,
      pickupAddress,
      destinationAddress
    );

    if (fixedRoute) {
      return {
        pricingType: PricingType.CITY,
        distanceKm,
        ratePerKm: null,
        estimatedPrice: fixedRoute.fixedFare,
        cityFlatFareUsed: fixedRoute.fixedFare,
        outsideRatePerKmUsed: null,
        fixedRouteName: fixedRoute.dairaName,
      };
    }

    // ── 2. City Zone Detection (Intra-Bordj Bou Arréridj flat fare) ─────────
    const settings = await PricingSettingsService.getSettings();
    const isCity = ZoneService.isCityTrip(pickup, destination);

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

    // ── 3. Default Distance-Based Fare ──────────────────────────────────

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
