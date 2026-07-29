import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const bookingIdParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format for booking ID'),
});

export const createPaymentSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod, {
    message: 'Invalid payment method. Must be CASH, CARD, or ONLINE',
  }),
  transactionReference: z.string().max(255).optional(),
});

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be a positive integer').default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z
    .enum(['PENDING', 'ACCEPTED', 'REJECTED', 'DRIVER_ARRIVING', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    .optional(),
  paymentStatus: z
    .nativeEnum(
      { PENDING: 'PENDING', PAID: 'PAID', FAILED: 'FAILED', REFUNDED: 'REFUNDED' } as const
    )
    .optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
});

export const earningsQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
