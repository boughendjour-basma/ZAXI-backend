import { z } from 'zod';

// ─── Sign-Up (Step 3 of 3: after OTP verification) ───────────────────────────

/**
 * POST /api/auth/register
 * Requires the short-lived verificationToken issued by /api/auth/verify-code.
 * Creates the CUSTOMER account and immediately returns an auth JWT.
 */
export const registerSchema = z.object({
  verificationToken: z.string().min(1, 'Verification token is required'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password is too long'),
});

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Authenticates using phone + password. Never sends OTP.
 */
export const loginSchema = z.object({
  phone: z.string().min(8, 'Phone number must be valid').max(20),
  password: z.string().min(1, 'Password is required'),
});

// ─── Password Recovery ────────────────────────────────────────────────────────

/**
 * POST /api/auth/forgot-password/reset
 * Verifies a reset OTP and replaces the password hash.
 */
export const resetPasswordSchema = z.object({
  phone: z.string().min(8, 'Phone number must be valid').max(20),
  code: z.string().trim().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password is too long'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
