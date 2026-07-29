import { z } from 'zod';
import { AnnouncementCategory } from '@prisma/client';

// ── Create Announcement ─────────────────────────────────────────────────────
export const createAnnouncementSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .min(1, 'Description cannot be empty')
    .max(2000, 'Description must be at most 2000 characters'),
  category: z.nativeEnum(AnnouncementCategory),
  price: z
    .number()
    .int('Price must be an integer')
    .nonnegative('Price cannot be negative')
    .nullable()
    .optional(),
  image: z
    .string()
    .url('Image must be a valid URL')
    .nullable()
    .optional(),
  departureLocation: z
    .string()
    .max(300, 'Departure location must be at most 300 characters')
    .nullable()
    .optional(),
  destinationLocation: z
    .string()
    .max(300, 'Destination location must be at most 300 characters')
    .nullable()
    .optional(),
  availableDate: z
    .iso.datetime()
    .nullable()
    .optional(),
});

// ── Update Announcement ─────────────────────────────────────────────────────
export const updateAnnouncementSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title must be at most 200 characters')
      .optional(),
    description: z
      .string()
      .min(1, 'Description cannot be empty')
      .max(2000, 'Description must be at most 2000 characters')
      .optional(),
    category: z.nativeEnum(AnnouncementCategory).optional(),
    price: z
      .number()
      .int('Price must be an integer')
      .nonnegative('Price cannot be negative')
      .nullable()
      .optional(),
    image: z
      .string()
      .url('Image must be a valid URL')
      .nullable()
      .optional(),
    departureLocation: z
      .string()
      .max(300, 'Departure location must be at most 300 characters')
      .nullable()
      .optional(),
    destinationLocation: z
      .string()
      .max(300, 'Destination location must be at most 300 characters')
      .nullable()
      .optional(),
    availableDate: z
      .iso.datetime()
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

// ── List Announcements Query ────────────────────────────────────────────────
export const listAnnouncementsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => Number.isInteger(val) && val >= 1, { message: 'Page must be a positive integer' }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => Number.isInteger(val) && val >= 1 && val <= 100, {
      message: 'Limit must be between 1 and 100',
    }),
  category: z.nativeEnum(AnnouncementCategory).optional(),
});
