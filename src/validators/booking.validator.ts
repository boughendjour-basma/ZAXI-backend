import { z } from 'zod';

const coordinateSchema = z.object({
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .refine((val) => Number.isFinite(val), { message: 'Latitude must be a finite number' }),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .refine((val) => Number.isFinite(val), { message: 'Longitude must be a finite number' })
});

export const estimateSchema = z.object({
  pickup: coordinateSchema,
  destination: coordinateSchema
});

const locationSchema = coordinateSchema.extend({
  address: z.string().min(1, 'Address is required')
});

export const createBookingSchema = z.object({
  pickup: locationSchema,
  destination: locationSchema,
  scheduledAt: z.string().datetime().optional().refine((val) => {
    if (!val) return true;
    return new Date(val).getTime() >= Date.now();
  }, { message: 'scheduledAt must not be in the past' })
}).strict();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be a positive integer').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be a positive integer').max(100).default(10),
  status: z.enum(['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional()
});

export const bookingIdParamSchema = z.object({
  id: z.string().uuid('Invalid booking ID')
});
