/**
 * MapsService - Handles routing and distance calculation using Google Routes API.
 * 
 * Interacts with external services to compute routes.
 * Must map external errors and handle data validation safely.
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
   * 
   * @param pickup Starting coordinates
   * @param destination Ending coordinates
   * @returns Route result containing distance in kilometers and duration in minutes
   */
  static async getRoute(pickup: Coordinates, destination: Coordinates): Promise<RouteResult> {
    // 1. Validation
    this.validateCoordinates(pickup, 'Pickup');
    this.validateCoordinates(destination, 'Destination');

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      const error: any = new Error('Google Maps API key is not configured');
      error.statusCode = 503;
      throw error;
    }

    // When GOOGLE_MAPS_API_KEY is placeholder or mock-key -> use free OSRM / Haversine fallback
    if (apiKey.includes('your-google-routes-api-key') || apiKey === 'mock-key') {
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickup.longitude},${pickup.latitude};${destination.longitude},${destination.latitude}?overview=false`;
        const res = await fetch(osrmUrl, {
          headers: { 'User-Agent': 'ZaxiAlgeria/1.0 (RideApp)' }
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
        // fall back to Haversine
      }

      return this.getFallbackRoute(pickup, destination);
    }

    // When GOOGLE_MAPS_API_KEY is explicitly configured, call Google Routes API with full error validation
    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const requestBody = {
      origin: { location: { latLng: pickup } },
      destination: { location: { latLng: destination } },
      travelMode: 'DRIVE'
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
        },
        body: JSON.stringify(requestBody)
      });
    } catch (_netErr) {
      const error: any = new Error('Failed to connect to external routing service');
      error.statusCode = 502;
      throw error;
    }

    if (!response.ok) {
      let message = 'External routing service unavailable';
      if (response.status === 401) {
        message = 'External API authentication failed';
      } else if (response.status === 429) {
        message = 'External API rate limit exceeded';
      }
      const error: any = new Error(message);
      error.statusCode = 502;
      throw error;
    }

    let data: any;
    try {
      data = await response.json();
    } catch (_jsonErr) {
      const error: any = new Error('Malformed response from routing service');
      error.statusCode = 502;
      throw error;
    }

    if (!data.routes || !data.routes.length) {
      const error: any = new Error('No route found between the provided locations');
      error.statusCode = 404;
      throw error;
    }

    const route = data.routes[0];

    if (route.distanceMeters === undefined || route.duration === undefined) {
      const error: any = new Error('Malformed response from routing service');
      error.statusCode = 502;
      throw error;
    }

    const distanceKm = route.distanceMeters / 1000;
    const durationSeconds = parseFloat(route.duration.replace('s', ''));
    if (Number.isNaN(durationSeconds)) {
      const error: any = new Error('Malformed response from routing service');
      error.statusCode = 502;
      throw error;
    }

    const durationMinutes = Math.round(durationSeconds / 60);

    return {
      distanceKm,
      durationMinutes
    };
  }

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

    // Road factor ~1.20 for Algerian inter-wilaya roads and highways (Autoroute Est-Ouest, RN)
    const distanceKm = Math.max(0.5, Math.round(straightDistance * 1.20 * 10) / 10);
    // Average speed ~90 km/h on highways, ~50 km/h in urban areas
    const avgSpeed = distanceKm > 30 ? 90 : 50;
    const durationMinutes = Math.max(1, Math.round((distanceKm / avgSpeed) * 60));

    return {
      distanceKm,
      durationMinutes,
    };
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
