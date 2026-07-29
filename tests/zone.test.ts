import { describe, it, expect } from 'vitest';
import { ZoneService } from '../src/services/zone.service';

describe('ZoneService - Geofencing & Zone Detection', () => {
  // ── Coordinates Inside City ─────────────────────────────────────────

  describe('Inside Bordj Bou Arréridj City Limits', () => {
    it('should return true for Bordj Bou Arréridj city center', () => {
      // 36.0732, 4.7610 - City Center
      const inside = ZoneService.isInsideBordjBouArreridj(36.0732, 4.7610);
      expect(inside).toBe(true);
    });

    it('should return true for Bordj Bou Arréridj downtown', () => {
      // 36.0686, 4.7622 - Downtown
      const inside = ZoneService.isInsideBordjBouArreridj(36.0686, 4.7622);
      expect(inside).toBe(true);
    });
  });

  // ── Coordinates Outside City (Neighboring Towns & Communes) ──────────

  describe('Outside Bordj Bou Arréridj City Limits (Neighboring Communes)', () => {
    it('should return false for El Achir (west of city)', () => {
      const inside = ZoneService.isInsideBordjBouArreridj(36.0638, 4.6275);
      expect(inside).toBe(false);
    });

    it('should return false for Medjana (north of city)', () => {
      const inside = ZoneService.isInsideBordjBouArreridj(36.1350, 4.6650);
      expect(inside).toBe(false);
    });

    it('should return false for El Ghadir (east of city)', () => {
      const inside = ZoneService.isInsideBordjBouArreridj(36.1150, 4.8450);
      expect(inside).toBe(false);
    });

    it('should return false for Ras El Oued (south-east of city)', () => {
      const inside = ZoneService.isInsideBordjBouArreridj(35.9420, 4.9000);
      expect(inside).toBe(false);
    });

    it('should return false for Ain Taghrout (far east of city)', () => {
      const inside = ZoneService.isInsideBordjBouArreridj(36.1120, 4.9530);
      expect(inside).toBe(false);
    });
  });

  // ── Trip Classification (isCityTrip) ─────────────────────────────────

  describe('Trip Classification (isCityTrip)', () => {
    const bbaCenter = { latitude: 36.0732, longitude: 4.7610 };
    const bbaDowntown = { latitude: 36.0686, longitude: 4.7622 };
    const elAchir = { latitude: 36.0638, longitude: 4.6275 };
    const medjana = { latitude: 36.1350, longitude: 4.6650 };

    it('should return true when BOTH pickup and destination are inside city limits', () => {
      const isCity = ZoneService.isCityTrip(bbaCenter, bbaDowntown);
      expect(isCity).toBe(true);
    });

    it('should return false when pickup is inside but destination is outside city limits', () => {
      const isCity = ZoneService.isCityTrip(bbaCenter, elAchir);
      expect(isCity).toBe(false);
    });

    it('should return false when pickup is outside but destination is inside city limits', () => {
      const isCity = ZoneService.isCityTrip(medjana, bbaDowntown);
      expect(isCity).toBe(false);
    });

    it('should return false when BOTH pickup and destination are outside city limits', () => {
      const isCity = ZoneService.isCityTrip(elAchir, medjana);
      expect(isCity).toBe(false);
    });
  });

  // ── Validation & Error Handling ─────────────────────────────────────

  describe('Validation & Invalid Coordinates', () => {
    it('should throw HTTP 400 for latitude out of range (> 90)', () => {
      expect(() => ZoneService.isInsideBordjBouArreridj(95, 4.7610)).toThrowError(
        'Latitude must be between -90 and 90 degrees'
      );
    });

    it('should throw HTTP 400 for longitude out of range (<-180)', () => {
      expect(() => ZoneService.isInsideBordjBouArreridj(36.0732, -190)).toThrowError(
        'Longitude must be between -180 and 180 degrees'
      );
    });

    it('should throw HTTP 400 for NaN latitude', () => {
      expect(() => ZoneService.isInsideBordjBouArreridj(NaN, 4.7610)).toThrowError(
        'Latitude must be a valid finite number'
      );
    });

    it('should throw HTTP 400 for Infinity longitude', () => {
      expect(() => ZoneService.isInsideBordjBouArreridj(36.0732, Infinity)).toThrowError(
        'Longitude must be a valid finite number'
      );
    });
  });
});
