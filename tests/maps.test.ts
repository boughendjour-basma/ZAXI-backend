import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MapsService } from '../src/services/maps.service';

const originalFetch = globalThis.fetch;

describe('MapsService', () => {
  const validPickup = { latitude: 35.6971, longitude: -0.6308 };
  const validDestination = { latitude: 35.7058, longitude: -0.6412 };

  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.resetAllMocks();
  });

  it('1. Successful route calculation', async () => {
    const mockResponse = {
      routes: [
        {
          distanceMeters: 5500, // 5.5 km
          duration: "900s" // 15 mins
        }
      ]
    };

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const result = await MapsService.getRoute(validPickup, validDestination);
    expect(result.distanceKm).toBe(5.5);
    expect(result.durationMinutes).toBe(15);
    
    // Check if fetch was called with right arguments
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = (globalThis.fetch as any).mock.calls[0];
    expect(fetchArgs[0]).toBe('https://routes.googleapis.com/directions/v2:computeRoutes');
    expect(fetchArgs[1].headers['X-Goog-Api-Key']).toBe('test-api-key');
    expect(fetchArgs[1].headers['X-Goog-FieldMask']).toBe('routes.duration,routes.distanceMeters');
  });

  it('2. Correct distance conversion from meters to kilometers', async () => {
    const mockResponse = {
      routes: [{ distanceMeters: 12345, duration: "600s" }] // 12.345 km
    };
    (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => mockResponse });
    const result = await MapsService.getRoute(validPickup, validDestination);
    expect(result.distanceKm).toBe(12.345);
  });

  it('3. Correct duration conversion to minutes (rounding down)', async () => {
    const mockResponse = {
      routes: [{ distanceMeters: 1000, duration: "929.9s" }] // 15.498 mins -> 15 mins
    };
    (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => mockResponse });
    const result = await MapsService.getRoute(validPickup, validDestination);
    expect(result.durationMinutes).toBe(15);
  });
  
  it('3. Correct duration conversion to minutes (rounding up)', async () => {
    const mockResponse = {
      routes: [{ distanceMeters: 1000, duration: "930s" }] // 15.5 mins -> 16 mins
    };
    (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => mockResponse });
    const result = await MapsService.getRoute(validPickup, validDestination);
    expect(result.durationMinutes).toBe(16);
  });

  it('4. Invalid latitude', async () => {
    await expect(MapsService.getRoute({ latitude: 91, longitude: 0 }, validDestination))
      .rejects.toThrow('Pickup latitude must be between -90 and 90');
      
    await expect(MapsService.getRoute(validPickup, { latitude: -91, longitude: 0 }))
      .rejects.toThrow('Destination latitude must be between -90 and 90');
  });

  it('5. Invalid longitude', async () => {
    await expect(MapsService.getRoute({ latitude: 0, longitude: 181 }, validDestination))
      .rejects.toThrow('Pickup longitude must be between -180 and 180');
      
    await expect(MapsService.getRoute(validPickup, { latitude: 0, longitude: -181 }))
      .rejects.toThrow('Destination longitude must be between -180 and 180');
  });

  it('6. NaN coordinates', async () => {
    await expect(MapsService.getRoute({ latitude: NaN, longitude: 0 }, validDestination))
      .rejects.toThrow('Pickup latitude must be a finite number');
  });

  it('7. Infinity coordinates', async () => {
    await expect(MapsService.getRoute(validPickup, { latitude: 0, longitude: Infinity }))
      .rejects.toThrow('Destination longitude must be a finite number');
  });

  it('8. Missing GOOGLE_MAPS_API_KEY', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    await expect(MapsService.getRoute(validPickup, validDestination)).rejects.toThrow('Google Maps API key is not configured');
  });

  it('9. Google authentication failure', async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: false, status: 401 });
    try {
        await MapsService.getRoute(validPickup, validDestination);
        expect.fail('Should have thrown');
    } catch(err: any) {
        expect(err.message).toBe('External API authentication failed');
        expect(err.statusCode).toBe(502);
    }
  });

  it('10. Google rate limit failure', async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: false, status: 429 });
    try {
        await MapsService.getRoute(validPickup, validDestination);
        expect.fail('Should have thrown');
    } catch(err: any) {
        expect(err.message).toBe('External API rate limit exceeded');
        expect(err.statusCode).toBe(502);
    }
  });

  it('11. Google server error', async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: false, status: 500 });
    try {
        await MapsService.getRoute(validPickup, validDestination);
        expect.fail('Should have thrown');
    } catch(err: any) {
        expect(err.message).toBe('External routing service unavailable');
        expect(err.statusCode).toBe(502);
    }
  });

  it('12. No route found', async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });
    try {
        await MapsService.getRoute(validPickup, validDestination);
        expect.fail('Should have thrown');
    } catch(err: any) {
        expect(err.message).toBe('No route found between the provided locations');
        expect(err.statusCode).toBe(404);
    }
  });

  it('13. Malformed Google API response', async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ routes: [{}] }) });
    try {
        await MapsService.getRoute(validPickup, validDestination);
        expect.fail('Should have thrown');
    } catch(err: any) {
        expect(err.message).toBe('Malformed response from routing service');
        expect(err.statusCode).toBe(502);
    }
  });

  it('14. The raw Google API response is never exposed (handles network failure silently)', async () => {
    (globalThis.fetch as any).mockRejectedValue(new Error('DNS resolution failed for api.google.com'));
    try {
        await MapsService.getRoute(validPickup, validDestination);
        expect.fail('Should have thrown');
    } catch(err: any) {
        expect(err.message).not.toContain('api.google.com');
        expect(err.message).toBe('Failed to connect to external routing service');
    }
  });
  
  it('15. The API key is never included in application error messages', async () => {
    (globalThis.fetch as any).mockRejectedValue(new Error('Network disconnected test-api-key xyz'));
    try {
        await MapsService.getRoute(validPickup, validDestination);
        expect.fail('Should have thrown');
    } catch(err: any) {
        expect(err.message).not.toContain('test-api-key');
        expect(err.message).toBe('Failed to connect to external routing service');
    }
  });
});
