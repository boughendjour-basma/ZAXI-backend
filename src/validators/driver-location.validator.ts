import { z } from 'zod';

export const bookingIdParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format for booking ID'),
});

export const updateLocationSchema = z.object({
  latitude: z
    .number()
    .refine((val) => !Number.isNaN(val) && Number.isFinite(val), 'Latitude must be a finite number')
    .refine((val) => val >= -90 && val <= 90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number()
    .refine((val) => !Number.isNaN(val) && Number.isFinite(val), 'Longitude must be a finite number')
    .refine((val) => val >= -180 && val <= 180, 'Longitude must be between -180 and 180'),
  heading: z
    .number()
    .refine((val) => !Number.isNaN(val) && Number.isFinite(val), 'Heading must be a finite number')
    .refine((val) => val >= 0 && val <= 360, 'Heading must be between 0 and 360')
    .optional(),
  speed: z
    .number()
    .refine((val) => !Number.isNaN(val) && Number.isFinite(val), 'Speed must be a finite number')
    .refine((val) => val >= 0, 'Speed cannot be negative')
    .optional(),
  accuracy: z
    .number()
    .refine((val) => !Number.isNaN(val) && Number.isFinite(val), 'Accuracy must be a finite number')
    .refine((val) => val >= 0, 'Accuracy cannot be negative')
    .optional(),
});
