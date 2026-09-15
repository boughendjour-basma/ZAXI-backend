/**
 * MapsService - Handles routing and distance calculation.
 *
 * Uses OSRM (Open Source Routing Machine) — free, no API key required.
 * Falls back to Haversine formula if OSRM is unreachable.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
}

export class MapsService {
  /**
   * Calculates the distance and duration for a route between pickup and destination.
   * Uses OSRM routing (free), with Haversine as fallback.
   *
   * @param pickup Starting coordinates
   * @param destination Ending coordinates
   * @returns Route result containing distance in kilometers and duration in minutes
   */
  static async getRoute(pickup: Coordinates, destination: Coordinates): Promise<RouteResult> {
    this.validateCoordinates(pickup, 'Pickup');
    this.validateCoordinates(destination, 'Destination');

    // Try OSRM first (free open-source routing)
    try {
      const baseUrl = (process.env.OSRM_ROUTING_URL || 'https://router.project-osrm.org').replace(/\/+$/, '');
      const osrmUrl = `${baseUrl}/route/v1/driving/${pickup.longitude},${pickup.latitude};${destination.longitude},${destination.latitude}?overview=false`;
      const res = await fetch(osrmUrl, {
        headers: { 'User-Agent': 'ZaxiAlgeria/1.0 (RideApp)' },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const json: any = await res.json();
        if (json.code === 'Ok' && json.routes && json.routes.length > 0) {
          const bestRoute = json.routes[0];
          const distanceKm = Math.max(0.5, Math.round((bestRoute.distance / 1000) * 10) / 10);
          const durationMinutes = Math.max(1, Math.round(bestRoute.duration / 60));
          return { distanceKm, durationMinutes };
        }
      }
    } catch {
      // OSRM unavailable — fall back to Haversine
    }

    return this.getFallbackRoute(pickup, destination);
  }

  /**
   * Calculates the estimated arrival time (ETA) and distance between two locations.
   *
   * @param origin Starting coordinates (e.g. driver location)
   * @param destination Target coordinates (e.g. pickup or destination)
   * @returns Distance in km and estimated duration in minutes
   */
  static async calculateETA(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
    return this.getRoute(origin, destination);
  }

  /**
   * Haversine fallback — straight-line distance with road correction factor.
   */
  private static getFallbackRoute(pickup: Coordinates, destination: Coordinates): RouteResult {
    const R = 6371; // Earth radius in km
    const dLat = ((destination.latitude - pickup.latitude) * Math.PI) / 180;
    const dLon = ((destination.longitude - pickup.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pickup.latitude * Math.PI) / 180) *
        Math.cos((destination.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistance = R * c;

    // Road factor ~1.20 for Algerian inter-wilaya roads and highways
    const distanceKm = Math.max(0.5, Math.round(straightDistance * 1.20 * 10) / 10);
    // Average speed ~90 km/h on highways, ~50 km/h in urban areas
    const avgSpeed = distanceKm > 30 ? 90 : 50;
    const durationMinutes = Math.max(1, Math.round((distanceKm / avgSpeed) * 60));

    return { distanceKm, durationMinutes };
  }

  private static validateCoordinates(coords: Coordinates, label: string) {
    if (!coords || typeof coords !== 'object') {
      const error: any = new Error(`${label} coordinates must be an object`);
      error.statusCode = 400;
      throw error;
    }

    const { latitude, longitude } = coords;

    if (typeof latitude !== 'number' || Number.isNaN(latitude) || !Number.isFinite(latitude)) {
      const error: any = new Error(`${label} latitude must be a finite number`);
      error.statusCode = 400;
      throw error;
    }

    if (typeof longitude !== 'number' || Number.isNaN(longitude) || !Number.isFinite(longitude)) {
      const error: any = new Error(`${label} longitude must be a finite number`);
      error.statusCode = 400;
      throw error;
    }

    if (latitude < -90 || latitude > 90) {
      const error: any = new Error(`${label} latitude must be between -90 and 90`);
      error.statusCode = 400;
      throw error;
    }

    if (longitude < -180 || longitude > 180) {
      const error: any = new Error(`${label} longitude must be between -180 and 180`);
      error.statusCode = 400;
      throw error;
    }
  }
}
