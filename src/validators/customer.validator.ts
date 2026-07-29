import { z } from 'zod';
import { BookingStatus } from '@prisma/client';

// ─── Legacy schemas (used by CustomerController.updateProfile / changePassword) ─
export const updateProfileSchema = z.object({
  name:         z.string().trim().min(1).max(100).optional(),
  profilePhoto: z.string().url('Profile photo must be a valid URL').optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     z.string().min(8, 'New password must be at least 8 characters'),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const customerBookingQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(50).default(10),
  status: z.nativeEnum(BookingStatus).optional(),
});

export const createFavoriteSchema = z.object({
  name:      z.string().trim().min(1, 'Name is required').max(50),
  address:   z.string().trim().min(1, 'Address is required').max(255),
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const updateFavoriteSchema = z.object({
  name:      z.string().trim().min(1).max(50).optional(),
  address:   z.string().trim().min(1).max(255).optional(),
  latitude:  z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);

export const createRatingSchema = z.object({
  score:   z.number().int().min(1, 'Score must be at least 1').max(5, 'Score must be at most 5'),
  comment: z.string().trim().max(500).optional(),
});

export const paginationQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const updateCustomerProfileSchema = z.object({
  name:         z.string().trim().min(1).max(100).optional(),
  profilePhoto: z.string().url('Profile photo must be a valid URL').optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);
