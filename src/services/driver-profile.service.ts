import prisma from '../config/database';

const DEFAULT_DRIVER_NAME = 'Zakaria Boukedjar';
const DEFAULT_PHONE = '+213';

export interface DriverProfileResult {
  driverName: string;
  name?: string;
  phoneNumber: string;
  phone?: string;
  whatsappNumber: string | null;
  profilePhoto: string | null;
  description: string | null;
  workingHours: string | null;
  minimumFare: number | null;
  maxBookingDistanceKm: number | null;
  isOnline: boolean;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehiclePlate: string | null;
  ccpNumber: string | null;
  ccpKey: string | null;
  carPhotos: string[] | null;
  ratingAverage: number;
  totalRatings: number;
  totalTrips: number;
}

export interface UpdateDriverProfileInput {
  driverName?: string;
  name?: string;
  phoneNumber?: string;
  phone?: string;
  whatsappNumber?: string | null;
  profilePhoto?: string | null;
  description?: string | null;
  workingHours?: string | null;
  minimumFare?: number | null;
  maxBookingDistanceKm?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleColor?: string | null;
  vehiclePlate?: string | null;
  ccpNumber?: string | null;
  ccpKey?: string | null;
  carPhotos?: string[] | string | null;
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
      select: { id: true, name: true, phone: true },
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

    let parsedCarPhotos: string[] | null = null;
    if (settings?.carPhotos) {
      try {
        parsedCarPhotos = JSON.parse(settings.carPhotos);
      } catch {
        parsedCarPhotos = settings.carPhotos.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    const driverName = settings?.driverName ?? driverUser?.name ?? DEFAULT_DRIVER_NAME;
    const phoneNumber = settings?.phoneNumber ?? driverUser?.phone ?? DEFAULT_PHONE;

    return {
      driverName,
      name: driverName,
      phoneNumber,
      phone: phoneNumber,
      whatsappNumber: settings?.whatsappNumber ?? null,
      profilePhoto: settings?.profilePhoto ?? null,
      description: settings?.description ?? null,
      workingHours: settings?.workingHours ?? null,
      minimumFare: settings?.minimumFare ?? null,
      maxBookingDistanceKm: settings?.maxBookingDistanceKm ?? null,
      isOnline: settings?.isOnline ?? false,
      vehicleMake: settings?.vehicleMake ?? null,
      vehicleModel: settings?.vehicleModel ?? null,
      vehicleColor: settings?.vehicleColor ?? null,
      vehiclePlate: settings?.vehiclePlate ?? null,
      ccpNumber: settings?.ccpNumber ?? null,
      ccpKey: settings?.ccpKey ?? null,
      carPhotos: parsedCarPhotos,
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

    const driverName = input.driverName || input.name;
    const phoneNumber = input.phoneNumber || input.phone;

    let carPhotosStr: string | null | undefined = undefined;
    if (input.carPhotos !== undefined) {
      carPhotosStr = Array.isArray(input.carPhotos)
        ? JSON.stringify(input.carPhotos)
        : input.carPhotos ?? null;
    }

    const dataToSave: any = {};
    if (driverName !== undefined) dataToSave.driverName = driverName;
    if (phoneNumber !== undefined) dataToSave.phoneNumber = phoneNumber;
    if (input.whatsappNumber !== undefined) dataToSave.whatsappNumber = input.whatsappNumber;
    if (input.profilePhoto !== undefined) dataToSave.profilePhoto = input.profilePhoto;
    if (input.description !== undefined) dataToSave.description = input.description;
    if (input.workingHours !== undefined) dataToSave.workingHours = input.workingHours;
    if (input.minimumFare !== undefined) dataToSave.minimumFare = input.minimumFare;
    if (input.maxBookingDistanceKm !== undefined) dataToSave.maxBookingDistanceKm = input.maxBookingDistanceKm;
    if (input.vehicleMake !== undefined) dataToSave.vehicleMake = input.vehicleMake;
    if (input.vehicleModel !== undefined) dataToSave.vehicleModel = input.vehicleModel;
    if (input.vehicleColor !== undefined) dataToSave.vehicleColor = input.vehicleColor;
    if (input.vehiclePlate !== undefined) dataToSave.vehiclePlate = input.vehiclePlate;
    if (input.ccpNumber !== undefined) dataToSave.ccpNumber = input.ccpNumber;
    if (input.ccpKey !== undefined) dataToSave.ccpKey = input.ccpKey;
    if (carPhotosStr !== undefined) dataToSave.carPhotos = carPhotosStr;

    const updated = await prisma.driverSettings.upsert({
      where: { id: 1 },
      update: dataToSave,
      create: {
        id: 1,
        driverName: driverName ?? DEFAULT_DRIVER_NAME,
        phoneNumber: phoneNumber ?? DEFAULT_PHONE,
        whatsappNumber: input.whatsappNumber,
        profilePhoto: input.profilePhoto,
        description: input.description,
        workingHours: input.workingHours,
        minimumFare: input.minimumFare,
        maxBookingDistanceKm: input.maxBookingDistanceKm,
        vehicleMake: input.vehicleMake,
        vehicleModel: input.vehicleModel,
        vehicleColor: input.vehicleColor,
        vehiclePlate: input.vehiclePlate,
        ccpNumber: input.ccpNumber,
        ccpKey: input.ccpKey,
        carPhotos: carPhotosStr,
      },
    });

    // Also synchronize driver's User table if name was changed
    const driverUser = await prisma.user.findFirst({
      where: { role: 'DRIVER' },
      select: { id: true },
    });

    if (driverUser && driverName) {
      await prisma.user.update({
        where: { id: driverUser.id },
        data: { name: driverName },
      });
    }

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

    let parsedCarPhotos: string[] | null = null;
    if (updated.carPhotos) {
      try {
        parsedCarPhotos = JSON.parse(updated.carPhotos);
      } catch {
        parsedCarPhotos = updated.carPhotos.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    return {
      driverName: updated.driverName,
      name: updated.driverName,
      phoneNumber: updated.phoneNumber,
      phone: updated.phoneNumber,
      whatsappNumber: updated.whatsappNumber,
      profilePhoto: updated.profilePhoto,
      description: updated.description,
      workingHours: updated.workingHours,
      minimumFare: updated.minimumFare,
      maxBookingDistanceKm: updated.maxBookingDistanceKm,
      isOnline: updated.isOnline,
      vehicleMake: updated.vehicleMake,
      vehicleModel: updated.vehicleModel,
      vehicleColor: updated.vehicleColor,
      vehiclePlate: updated.vehiclePlate,
      ccpNumber: updated.ccpNumber,
      ccpKey: updated.ccpKey,
      carPhotos: parsedCarPhotos,
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
