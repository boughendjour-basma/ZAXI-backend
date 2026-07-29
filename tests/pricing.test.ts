import { describe, it, expect, beforeEach } from 'vitest';
import { PricingService } from '../src/services/pricing.service';
import { prismaMock } from './setup';
import { PricingType } from '@prisma/client';

describe('PricingService - Dynamic Pricing Engine', () => {
  const bbaCenter = { latitude: 36.0732, longitude: 4.7610 };
  const bbaDowntown = { latitude: 36.0686, longitude: 4.7622 };
  const elAchir = { latitude: 36.0638, longitude: 4.6275 };
  const medjana = { latitude: 36.1350, longitude: 4.6650 };

  beforeEach(() => {
    // Default Prisma mock return value for PricingSettings
    prismaMock.pricingSettings.findUnique.mockResolvedValue({
      id: 1,
      cityFlatFare: 150,
      outsideRatePerKm: 40,
      updatedAt: new Date(),
    });
  });

  // ── Pricing Mode Selection ──────────────────────────────────────────

  describe('Pricing Mode Selection (City vs Distance)', () => {
    it('should apply CITY flat fare when BOTH pickup and destination are inside city limits', async () => {
      const result = await PricingService.calculatePrice(bbaCenter, bbaDowntown, 5.0);
      expect(result.pricingType).toBe(PricingType.CITY);
      expect(result.estimatedPrice).toBe(150);
      expect(result.ratePerKm).toBeNull();
      expect(result.distanceKm).toBe(5.0);
    });

    it('should apply DISTANCE fare when pickup is inside but destination is outside city limits', async () => {
      const result = await PricingService.calculatePrice(bbaCenter, elAchir, 10.0);
      expect(result.pricingType).toBe(PricingType.DISTANCE);
      expect(result.ratePerKm).toBe(40);
      expect(result.estimatedPrice).toBe(400); // 10 * 40
      expect(result.distanceKm).toBe(10.0);
    });

    it('should apply DISTANCE fare when pickup is outside but destination is inside city limits', async () => {
      const result = await PricingService.calculatePrice(medjana, bbaDowntown, 12.0);
      expect(result.pricingType).toBe(PricingType.DISTANCE);
      expect(result.ratePerKm).toBe(40);
      expect(result.estimatedPrice).toBe(480); // 12 * 40
    });

    it('should apply DISTANCE fare when BOTH pickup and destination are outside city limits', async () => {
      const result = await PricingService.calculatePrice(elAchir, medjana, 18.4);
      expect(result.pricingType).toBe(PricingType.DISTANCE);
      expect(result.ratePerKm).toBe(40);
      expect(result.estimatedPrice).toBe(736); // Math.round(18.4 * 40) = 736
    });
  });

  // ── Decimal Distance Rounding ─────────────────────────────────────────

  describe('Decimal Distance Rounding for Outside Trips', () => {
    it('should round price half-up to nearest whole integer for decimal distances', async () => {
      // 10.3125 * 40 = 412.5 -> Math.round -> 413
      const result = await PricingService.calculatePrice(elAchir, medjana, 10.3125);
      expect(result.pricingType).toBe(PricingType.DISTANCE);
      expect(result.estimatedPrice).toBe(413);
      expect(Number.isInteger(result.estimatedPrice)).toBe(true);
    });

    it('should round down when fractional part < 0.5', async () => {
      // 10.1 * 40 = 404.0 -> Math.round -> 404
      const result = await PricingService.calculatePrice(elAchir, medjana, 10.1);
      expect(result.estimatedPrice).toBe(404);
    });
  });

  // ── Dynamic Database Settings Integration ────────────────────────────

  describe('Dynamic Database Pricing Settings Integration', () => {
    it('should immediately use updated cityFlatFare from database settings', async () => {
      // Driver updated cityFlatFare to 200 DA
      prismaMock.pricingSettings.findUnique.mockResolvedValue({
        id: 1,
        cityFlatFare: 200,
        outsideRatePerKm: 40,
        updatedAt: new Date(),
      });

      const result = await PricingService.calculatePrice(bbaCenter, bbaDowntown, 4.2);
      expect(result.pricingType).toBe(PricingType.CITY);
      expect(result.estimatedPrice).toBe(200);
    });

    it('should immediately use updated outsideRatePerKm from database settings', async () => {
      // Driver updated outsideRatePerKm to 50 DA/km
      prismaMock.pricingSettings.findUnique.mockResolvedValue({
        id: 1,
        cityFlatFare: 150,
        outsideRatePerKm: 50,
        updatedAt: new Date(),
      });

      const result = await PricingService.calculatePrice(bbaCenter, elAchir, 10.0);
      expect(result.pricingType).toBe(PricingType.DISTANCE);
      expect(result.ratePerKm).toBe(50);
      expect(result.estimatedPrice).toBe(500); // 10 * 50
    });
  });

  // ── Validation: Invalid Inputs ────────────────────────────────────────

  describe('Validation – Invalid Inputs', () => {
    it('should reject zero distance', async () => {
      await expect(PricingService.calculatePrice(bbaCenter, bbaDowntown, 0)).rejects.toThrowError(
        'Distance must be a positive number greater than zero'
      );
    });

    it('should reject negative distance', async () => {
      await expect(PricingService.calculatePrice(bbaCenter, bbaDowntown, -5)).rejects.toThrowError(
        'Distance must be a positive number greater than zero'
      );
    });

    it('should reject NaN distance', async () => {
      await expect(PricingService.calculatePrice(bbaCenter, bbaDowntown, NaN)).rejects.toThrowError(
        'Distance must be a valid number'
      );
    });

    it('should reject Infinity distance', async () => {
      await expect(
        PricingService.calculatePrice(bbaCenter, bbaDowntown, Infinity)
      ).rejects.toThrowError('Distance must be a finite number');
    });
  });
});
