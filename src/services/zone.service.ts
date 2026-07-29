import { BBA_COMMUNE_POLYGON, Coordinates } from '../config/pricing.config';

export class ZoneService {
  /**
   * Determines whether a given GPS coordinate point is strictly inside the official
   * administrative boundary of Bordj Bou Arréridj commune (city limits).
   *
   * Uses W. Randolph Franklin's Point-in-Polygon (PNPOLY) ray-casting algorithm.
   *
   * @param latitude Latitude of the coordinate point (-90 to 90)
   * @param longitude Longitude of the coordinate point (-180 to 180)
   * @returns `true` if the point lies inside Bordj Bou Arréridj city limits; `false` otherwise.
   * @throws Error with `statusCode` 400 if coordinates are missing, non-numeric, or out of range.
   */
  static isInsideBordjBouArreridj(latitude: number, longitude: number): boolean {
    this.validateCoordinate(latitude, longitude);

    return this.isPointInPolygon(
      { latitude, longitude },
      BBA_COMMUNE_POLYGON
    );
  }

  /**
   * Determines whether a complete ride trip is entirely inside Bordj Bou Arréridj city limits.
   * A trip is considered a city trip ONLY IF BOTH pickup and destination coordinates fall inside the city boundary.
   *
   * @param pickup Starting location coordinates
   * @param destination Destination location coordinates
   * @returns `true` if both pickup and destination are inside Bordj Bou Arréridj city; `false` otherwise.
   */
  static isCityTrip(pickup: Coordinates, destination: Coordinates): boolean {
    if (!pickup || typeof pickup !== 'object') {
      const error: any = new Error('Pickup coordinates are required');
      error.statusCode = 400;
      throw error;
    }

    if (!destination || typeof destination !== 'object') {
      const error: any = new Error('Destination coordinates are required');
      error.statusCode = 400;
      throw error;
    }

    const pickupInside = this.isInsideBordjBouArreridj(pickup.latitude, pickup.longitude);
    const destinationInside = this.isInsideBordjBouArreridj(destination.latitude, destination.longitude);

    return pickupInside && destinationInside;
  }

  /**
   * PNPOLY Point-In-Polygon ray-casting algorithm.
   */
  private static isPointInPolygon(point: Coordinates, polygon: Coordinates[]): boolean {
    const px = point.longitude;
    const py = point.latitude;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      const intersect =
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Validates coordinate bounds and types.
   */
  private static validateCoordinate(latitude: number, longitude: number): void {
    if (typeof latitude !== 'number' || Number.isNaN(latitude) || !Number.isFinite(latitude)) {
      const error: any = new Error('Latitude must be a valid finite number');
      error.statusCode = 400;
      throw error;
    }

    if (typeof longitude !== 'number' || Number.isNaN(longitude) || !Number.isFinite(longitude)) {
      const error: any = new Error('Longitude must be a valid finite number');
      error.statusCode = 400;
      throw error;
    }

    if (latitude < -90 || latitude > 90) {
      const error: any = new Error('Latitude must be between -90 and 90 degrees');
      error.statusCode = 400;
      throw error;
    }

    if (longitude < -180 || longitude > 180) {
      const error: any = new Error('Longitude must be between -180 and 180 degrees');
      error.statusCode = 400;
      throw error;
    }
  }
}
