import { z } from 'zod';
import { BookingStatus } from '@prisma/client';

export const bookingIdParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format for booking ID'),
});

export const driverBookingQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be a positive integer').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be a positive integer').max(100).default(10),
  status: z.nativeEnum(BookingStatus).optional(),
});
