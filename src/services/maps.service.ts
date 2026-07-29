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
      error.statusCode = 500;
      throw error;
    }

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    
    const requestBody = {
      origin: {
        location: { latLng: pickup }
      },
      destination: {
        location: { latLng: destination }
      },
      travelMode: 'DRIVE'
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            const error: any = new Error('External API authentication failed');
            error.statusCode = 502; // Using 502 Bad Gateway to hide upstream details
            throw error;
        }
        if (response.status === 429) {
            const error: any = new Error('External API rate limit exceeded');
            error.statusCode = 502;
            throw error;
        }
        
        const error: any = new Error('External routing service unavailable');
        error.statusCode = 502;
        throw error;
      }

      const data = await response.json();
      
      if (!data.routes || !data.routes.length) {
         const error: any = new Error('No route found between the provided locations');
         error.statusCode = 404; // Not Found
         throw error;
      }

      const route = data.routes[0];
      
      if (route.distanceMeters === undefined || route.duration === undefined) {
         const error: any = new Error('Malformed response from routing service');
         error.statusCode = 502;
         throw error;
      }

      // Convert distanceMeters to km
      const distanceKm = route.distanceMeters / 1000;
      
      // Parse duration from formats like "1522s" or "3.5s"
      const durationSeconds = parseFloat(route.duration.replace('s', ''));
      if (Number.isNaN(durationSeconds)) {
         const error: any = new Error('Malformed response from routing service');
         error.statusCode = 502;
         throw error;
      }
      
      // Convert seconds to minutes with deterministic rounding
      const durationMinutes = Math.round(durationSeconds / 60);

      return {
        distanceKm,
        durationMinutes
      };

    } catch (error: any) {
      if (error.statusCode) {
        throw error; // Rethrow already structured application errors
      }
      // Handle network errors (e.g. DNS failure, connection refused)
      // Never expose raw error strings which might leak api keys or URLs
      const err: any = new Error('Failed to connect to external routing service');
      err.statusCode = 502;
      throw err;
    }
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
