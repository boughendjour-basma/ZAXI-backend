import prisma from '../config/database';
import { BookingStatus } from '@prisma/client';
import { MapsService } from './maps.service';
import { SocketService } from '../sockets/socket.service';

export interface UpdateLocationInput {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateHeadingDifference(h1?: number | null, h2?: number | null): number {
  if (h1 == null || h2 == null) return 360;
  let diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export class DriverLocationService {
  /**
   * Driver updates GPS location for an active booking.
   */
  static async updateDriverLocation(
    driverId: string,
    bookingId: string,
    data: UpdateLocationInput
  ) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    // Security rule #1: If booking does not exist or does not belong to driver -> 404
    if (!booking || booking.driverId !== driverId) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    // Terminal status rule: Completed / Cancelled / Rejected -> 410 Gone or 400 Bad Request
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.REJECTED
    ) {
      const error: any = new Error('Location updates are not allowed for completed or cancelled bookings');
      error.statusCode = 410;
      throw error;
    }

    const activeStatuses: BookingStatus[] = [
      BookingStatus.ACCEPTED,
      BookingStatus.DRIVER_ARRIVING,
      BookingStatus.ARRIVED,
      BookingStatus.IN_PROGRESS,
    ];

    if (!activeStatuses.includes(booking.status)) {
      const error: any = new Error('Booking is not in an active status for tracking');
      error.statusCode = 400;
      throw error;
    }

    // Enhancement #6: Check movement thresholds to avoid unnecessary DB writes & broadcasts
    const existing = await prisma.driverLocation.findUnique({ where: { bookingId } });
    if (existing) {
      const distanceMeters = calculateHaversineDistanceMeters(
        existing.latitude,
        existing.longitude,
        data.latitude,
        data.longitude
      );
      const headingDiff = calculateHeadingDifference(existing.heading, data.heading);
      const timeElapsedSeconds = (Date.now() - new Date(existing.updatedAt).getTime()) / 1000;

      if (distanceMeters < 20 && headingDiff < 15 && timeElapsedSeconds < 5) {
        return existing;
      }
    }

    // Atomic upsert
    const location = await prisma.driverLocation.upsert({
      where: { bookingId },
      create: {
        bookingId,
        driverId,
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading ?? null,
        speed: data.speed ?? null,
        accuracy: data.accuracy ?? null,
      },
      update: {
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading ?? null,
        speed: data.speed ?? null,
        accuracy: data.accuracy ?? null,
      },
    });

    const isoDate = location.updatedAt.toISOString();

    // Broadcast room-based update
    SocketService.emitDriverLocationUpdate(bookingId, {
      bookingId,
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading,
      speed: location.speed,
      accuracy: location.accuracy,
      updatedAt: isoDate,
      lastSeen: isoDate,
    });

    return location;
  }

  /**
   * Customer or driver retrieves the live location & phase-aware ETA for a booking.
   */
  static async getDriverLocation(userId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    // Security rule #1: If booking does not exist or user is neither customer nor assigned driver -> 404 Not Found
    if (!booking || (booking.customerId !== userId && booking.driverId !== userId)) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    // Terminal status rule: Completed / Cancelled / Rejected -> 410 Gone
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.REJECTED
    ) {
      const error: any = new Error('Booking is completed or cancelled');
      error.statusCode = 410;
      throw error;
    }

    const location = await prisma.driverLocation.findUnique({ where: { bookingId } });

    if (!location) {
      return {
        bookingId,
        trackingStatus: 'INITIALIZING',
        isStale: false,
        location: null,
        eta: null,
      };
    }

    // Heartbeat rule #7: Check if location is stale (> 30s)
    const timeElapsedSeconds = (Date.now() - new Date(location.updatedAt).getTime()) / 1000;
    const isStale = timeElapsedSeconds > 30;
    const trackingStatus = isStale ? 'STALE_LOCATION' : 'LIVE';
    const isoDate = location.updatedAt.toISOString();

    // Enhancement #5: Phase-aware ETA calculation
    // ACCEPTED / DRIVER_ARRIVING / ARRIVED -> Driver to Pickup
    // IN_PROGRESS -> Driver to Destination
    let destinationCoords: { latitude: number; longitude: number };
    if (booking.status === BookingStatus.IN_PROGRESS) {
      destinationCoords = {
        latitude: Number(booking.destinationLatitude),
        longitude: Number(booking.destinationLongitude),
      };
    } else {
      destinationCoords = {
        latitude: Number(booking.pickupLatitude),
        longitude: Number(booking.pickupLongitude),
      };
    }

    let eta = null;
    try {
      eta = await MapsService.calculateETA(
        { latitude: location.latitude, longitude: location.longitude },
        destinationCoords
      );
    } catch (err) {
      // If ETA calculation fails (e.g. mock or external service), return location without ETA crash
      eta = null;
    }

    return {
      bookingId,
      trackingStatus,
      isStale,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed: location.speed,
        accuracy: location.accuracy,
        updatedAt: isoDate,
        lastSeen: isoDate,
      },
      eta,
    };
  }

  /**
   * Enhancement #9: Automatically cleanup location record on booking completion/cancellation.
   */
  static async cleanupDriverLocation(bookingId: string) {
    try {
      await prisma.driverLocation.deleteMany({ where: { bookingId } });
    } catch (error) {
      // Ignore if record did not exist
    }
  }
}
