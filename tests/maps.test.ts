import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MapsService } from '../src/services/maps.service';

const originalFetch = globalThis.fetch;

describe('MapsService (OSRM + Haversine fallback)', () => {
  const validPickup = { latitude: 36.0734, longitude: 4.7645 };
  const validDestination = { latitude: 36.0800, longitude: 4.7700 };

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.resetAllMocks();
  });

  it('1. Successful route calculation via OSRM', async () => {
    const mockResponse = {
      code: 'Ok',
      routes: [
        {
          distance: 5500, // 5.5 km
          duration: 900, // 15 mins
        },
      ],
    };

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await MapsService.getRoute(validPickup, validDestination);
    expect(result.distanceKm).toBe(5.5);
    expect(result.durationMinutes).toBe(15);

    // Verify OSRM endpoint was called with correct coordinate order (lon,lat)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = (globalThis.fetch as any).mock.calls[0];
    expect(fetchArgs[0]).toContain('https://router.project-osrm.org/route/v1/driving/');
    expect(fetchArgs[0]).toContain('4.7645,36.0734;4.77,36.08');
  });

  it('2. Correct distance rounding from OSRM meters to km', async () => {
    const mockResponse = {
      code: 'Ok',
      routes: [
        {
          distance: 12345, // 12.345 km -> rounded to 12.3
          duration: 600,
        },
      ],
    };

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await MapsService.getRoute(validPickup, validDestination);
    expect(result.distanceKm).toBe(12.3);
  });

  it('3. Fallback to Haversine when OSRM fetch throws (network error)', async () => {
    (globalThis.fetch as any).mockRejectedValue(new Error('Network error connecting to OSRM'));

    const result = await MapsService.getRoute(validPickup, validDestination);
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.durationMinutes).toBeGreaterThan(0);
    // Distance between these close points in BBA is around 1-2 km
    expect(result.distanceKm).toBeLessThan(10);
  });

  it('4. Fallback to Haversine when OSRM returns non-ok HTTP status', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 503,
    });

    const result = await MapsService.getRoute(validPickup, validDestination);
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.durationMinutes).toBeGreaterThan(0);
  });

  it('5. Fallback to Haversine when OSRM returns code != Ok', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'NoRoute', routes: [] }),
    });

    const result = await MapsService.getRoute(validPickup, validDestination);
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.durationMinutes).toBeGreaterThan(0);
  });

  it('6. Does not require any GOOGLE_MAPS_API_KEY', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const mockResponse = {
      code: 'Ok',
      routes: [{ distance: 3000, duration: 360 }],
    };
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await MapsService.getRoute(validPickup, validDestination);
    expect(result.distanceKm).toBe(3);
    expect(result.durationMinutes).toBe(6);
  });

  it('7. Invalid latitude (< -90 or > 90)', async () => {
    await expect(MapsService.getRoute({ latitude: 91, longitude: 0 }, validDestination))
      .rejects.toThrow('Pickup latitude must be between -90 and 90');

    await expect(MapsService.getRoute(validPickup, { latitude: -91, longitude: 0 }))
      .rejects.toThrow('Destination latitude must be between -90 and 90');
  });

  it('8. Invalid longitude (< -180 or > 180)', async () => {
    await expect(MapsService.getRoute({ latitude: 0, longitude: 181 }, validDestination))
      .rejects.toThrow('Pickup longitude must be between -180 and 180');

    await expect(MapsService.getRoute(validPickup, { latitude: 0, longitude: -181 }))
      .rejects.toThrow('Destination longitude must be between -180 and 180');
  });

  it('9. NaN coordinates', async () => {
    await expect(MapsService.getRoute({ latitude: NaN, longitude: 0 }, validDestination))
      .rejects.toThrow('Pickup latitude must be a finite number');
  });

  it('10. Infinity coordinates', async () => {
    await expect(MapsService.getRoute(validPickup, { latitude: 0, longitude: Infinity }))
      .rejects.toThrow('Destination longitude must be a finite number');
  });

  it('11. Non-object coordinates', async () => {
    await expect(MapsService.getRoute(null as any, validDestination))
      .rejects.toThrow('Pickup coordinates must be an object');
  });

  it('12. calculateETA delegates to getRoute', async () => {
    const mockResponse = {
      code: 'Ok',
      routes: [{ distance: 4000, duration: 480 }],
    };
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const eta = await MapsService.calculateETA(validPickup, validDestination);
    expect(eta.distanceKm).toBe(4);
    expect(eta.durationMinutes).toBe(8);
  });
});
