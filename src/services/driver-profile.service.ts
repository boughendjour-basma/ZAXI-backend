import prisma from '../config/database';

const DEFAULT_DRIVER_NAME = 'Driver';
const DEFAULT_PHONE = '+213';

export interface DriverProfileResult {
  driverName: string;
  phoneNumber: string;
  whatsappNumber: string | null;
  profilePhoto: string | null;
  description: string | null;
  workingHours: string | null;
  minimumFare: number | null;
  maxBookingDistanceKm: number | null;
  isOnline: boolean;
  ratingAverage: number;
  totalRatings: number;
  totalTrips: number;
}

export interface UpdateDriverProfileInput {
  driverName?: string;
  phoneNumber?: string;
  whatsappNumber?: string | null;
  profilePhoto?: string | null;
  description?: string | null;
  workingHours?: string | null;
  minimumFare?: number | null;
  maxBookingDistanceKm?: number | null;
}

export class DriverProfileService {
  /**
   * Retrieves the single global DriverSettings record.
   * Auto-initializes with placeholder defaults if the record does not yet exist.
   */
  static async getProfile(): Promise<DriverProfileResult> {
    let settings = await prisma.driverSettings.findUnique({ where: { id: 1 } });

    if (!settings) {
      settings = await prisma.driverSettings.create({
        data: {
          id: 1,
          driverName: DEFAULT_DRIVER_NAME,
          phoneNumber: DEFAULT_PHONE,
        },
      });
    }

    const driverUser = await prisma.user.findFirst({
      where: { role: 'DRIVER' },
      select: { id: true },
    });

    let ratingAverage = 0;
    let totalRatings = 0;
    let totalTrips = 0;

    if (driverUser) {
      const ratings = await prisma.rating.findMany({
        where: { driverId: driverUser.id },
        select: { score: true },
      });

      totalRatings = ratings.length;
      const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
      ratingAverage = totalRatings > 0 ? Math.round((totalScore / totalRatings) * 10) / 10 : 0;

      totalTrips = await prisma.booking.count({
        where: { driverId: driverUser.id, status: 'COMPLETED' },
      });
    }

    return {
      driverName: settings?.driverName ?? DEFAULT_DRIVER_NAME,
      phoneNumber: settings?.phoneNumber ?? DEFAULT_PHONE,
      whatsappNumber: settings?.whatsappNumber ?? null,
      profilePhoto: settings?.profilePhoto ?? null,
      description: settings?.description ?? null,
      workingHours: settings?.workingHours ?? null,
      minimumFare: settings?.minimumFare ?? null,
      maxBookingDistanceKm: settings?.maxBookingDistanceKm ?? null,
      isOnline: settings?.isOnline ?? false,
      ratingAverage,
      totalRatings,
      totalTrips,
    };
  }

  /**
   * Updates the driver's personal profile settings.
   * At least one field must be provided.
   */
  static async updateProfile(input: UpdateDriverProfileInput): Promise<DriverProfileResult> {
    if (!input || Object.keys(input).length === 0) {
      const error: any = new Error('At least one profile field must be provided to update');
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.driverSettings.upsert({
      where: { id: 1 },
      update: input,
      create: {
        id: 1,
        driverName: input.driverName ?? DEFAULT_DRIVER_NAME,
        phoneNumber: input.phoneNumber ?? DEFAULT_PHONE,
        whatsappNumber: input.whatsappNumber,
        profilePhoto: input.profilePhoto,
        description: input.description,
        workingHours: input.workingHours,
        minimumFare: input.minimumFare,
        maxBookingDistanceKm: input.maxBookingDistanceKm,
      },
    });

    const driverUser = await prisma.user.findFirst({
      where: { role: 'DRIVER' },
      select: { id: true },
    });

    let ratingAverage = 0;
    let totalRatings = 0;
    let totalTrips = 0;

    if (driverUser) {
      const ratings = await prisma.rating.findMany({
        where: { driverId: driverUser.id },
        select: { score: true },
      });

      totalRatings = ratings.length;
      const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
      ratingAverage = totalRatings > 0 ? Math.round((totalScore / totalRatings) * 10) / 10 : 0;

      totalTrips = await prisma.booking.count({
        where: { driverId: driverUser.id, status: 'COMPLETED' },
      });
    }

    return {
      driverName: updated.driverName,
      phoneNumber: updated.phoneNumber,
      whatsappNumber: updated.whatsappNumber,
      profilePhoto: updated.profilePhoto,
      description: updated.description,
      workingHours: updated.workingHours,
      minimumFare: updated.minimumFare,
      maxBookingDistanceKm: updated.maxBookingDistanceKm,
      isOnline: updated.isOnline,
      ratingAverage,
      totalRatings,
      totalTrips,
    };
  }

  /**
   * Toggles or sets the driver's online/offline availability.
   * Persisted to DB so the customer dashboard can read it.
   */
  static async setAvailability(isOnline: boolean): Promise<{ isOnline: boolean }> {
    const updated = await prisma.driverSettings.upsert({
      where: { id: 1 },
      update: { isOnline },
      create: {
        id: 1,
        driverName: DEFAULT_DRIVER_NAME,
        phoneNumber: DEFAULT_PHONE,
        isOnline,
      },
    });
    return { isOnline: updated.isOnline };
  }
}
