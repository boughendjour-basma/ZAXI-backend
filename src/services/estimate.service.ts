import { MapsService, Coordinates } from './maps.service';
import { PricingService } from './pricing.service';
import { PricingType } from '@prisma/client';


export interface EstimateResult {
  pricingType: PricingType;
  distanceKm: number;
  durationMinutes: number;
  ratePerKm: number | null;
  estimatedPrice: number;
}

export class EstimateService {
  /**
   * Calculates a ride estimate by orchestrating MapsService and PricingService.
   *
   * @param pickup Starting coordinates
   * @param destination Ending coordinates
   * @returns EstimateResult containing pricingType, distance, duration, rate, and estimated price
   */
  static async calculateEstimate(
    pickup: Coordinates,
    destination: Coordinates,
    pickupAddress?: string | null,
    destinationAddress?: string | null
  ): Promise<EstimateResult> {
    // 1. Get route distance and duration from MapsService
    const { distanceKm, durationMinutes } = await MapsService.getRoute(pickup, destination);

    // 2. Calculate price using PricingService, ZoneService & BBA Fixed Routes
    const { pricingType, ratePerKm, estimatedPrice } = await PricingService.calculatePrice(
      pickup,
      destination,
      distanceKm,
      pickupAddress,
      destinationAddress
    );

    return {
      pricingType,
      distanceKm,
      durationMinutes,
      ratePerKm,
      estimatedPrice,
    };
  }
}
