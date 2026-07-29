import { z } from 'zod';
import { BookingStatus } from '@prisma/client';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be a positive integer').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be a positive integer').max(100).default(10),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'DRIVER_ARRIVING', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional()
});

export const bookingIdParamSchema = z.object({
  id: z.string().uuid('Invalid booking ID')
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'DRIVER_ARRIVING', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'])
}).strict();
