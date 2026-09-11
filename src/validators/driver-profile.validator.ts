import { z } from 'zod';

export const updateDriverProfileSchema = z
  .object({
    driverName: z
      .string()
      .min(1, 'Driver name cannot be empty')
      .max(100, 'Driver name must be at most 100 characters')
      .optional(),
    name: z
      .string()
      .min(1)
      .max(100)
      .optional(),
    phoneNumber: z
      .string()
      .min(1, 'Phone number cannot be empty')
      .max(20, 'Phone number must be at most 20 characters')
      .regex(/^\+?[0-9\s\-()]+$/, 'Phone number must be a valid format')
      .optional(),
    phone: z
      .string()
      .min(1)
      .max(20)
      .regex(/^\+?[0-9\s\-()]+$/, 'Phone number must be a valid format')
      .optional(),
    whatsappNumber: z
      .string()
      .max(20, 'WhatsApp number must be at most 20 characters')
      .regex(/^\+?[0-9\s\-()]+$/, 'WhatsApp number must be a valid format')
      .nullable()
      .optional(),
    profilePhoto: z
      .string()
      .nullable()
      .optional(),
    description: z
      .string()
      .max(1000, 'Description must be at most 1000 characters')
      .nullable()
      .optional(),
    workingHours: z
      .string()
      .max(200, 'Working hours must be at most 200 characters')
      .nullable()
      .optional(),
    minimumFare: z
      .number()
      .int('Minimum fare must be an integer')
      .nonnegative('Minimum fare cannot be negative')
      .nullable()
      .optional(),
    maxBookingDistanceKm: z
      .number()
      .positive('Max booking distance must be a positive number')
      .nullable()
      .optional(),
    vehicleMake: z
      .string()
      .max(100)
      .nullable()
      .optional(),
    vehicleModel: z
      .string()
      .max(100)
      .nullable()
      .optional(),
    vehicleColor: z
      .string()
      .max(100)
      .nullable()
      .optional(),
    vehiclePlate: z
      .string()
      .max(50)
      .nullable()
      .optional(),
    ccpNumber: z
      .string()
      .max(50)
      .nullable()
      .optional(),
    ccpKey: z
      .string()
      .max(10)
      .nullable()
      .optional(),
    carPhotos: z
      .union([z.string(), z.array(z.string())])
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one profile field must be provided to update',
  });

export const setAvailabilitySchema = z.object({
  isOnline: z.boolean({
    error: 'isOnline must be a boolean',
  }),
});
