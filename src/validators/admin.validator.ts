import { z } from 'zod';
import { BookingStatus } from '@prisma/client';

export const adminPaginationSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

export const adminBookingQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  status:     z.nativeEnum(BookingStatus).optional(),
  customerId: z.string().uuid().optional(),
  driverId:   z.string().uuid().optional(),
  startDate:  z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate:    z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const updateDriverStatusSchema = z.object({
  isActive: z.boolean({ message: 'isActive must be a boolean' }),
});

export const auditLogQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
});
