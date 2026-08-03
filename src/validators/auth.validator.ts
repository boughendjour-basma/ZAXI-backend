import { z } from 'zod';

// ─── Sign-Up (Step 3 of 3: after OTP verification) ───────────────────────────

/**
 * POST /api/auth/register
 * Requires the short-lived verificationToken issued by /api/auth/verify-code.
 * Creates the CUSTOMER account (passwordless) and immediately returns an auth JWT.
 */
export const registerSchema = z.object({
  verificationToken: z.string().min(1, 'Verification token is required'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
});

// ─── Login Flow (Two-Step OTP) ────────────────────────────────────────────────

/**
 * POST /api/auth/login/request-code
 * Request a 6-digit login OTP for an existing phone number.
 */
export const loginRequestCodeSchema = z.object({
  phone: z.string().min(8, 'Phone number must be valid').max(20),
});

/**
 * POST /api/auth/login/verify
 * Verify a 6-digit login OTP and return auth JWT + user profile.
 */
export const loginVerifySchema = z.object({
  phone: z.string().min(8, 'Phone number must be valid').max(20),
  code: z.string().trim().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginRequestCodeInput = z.infer<typeof loginRequestCodeSchema>;
export type LoginVerifyInput = z.infer<typeof loginVerifySchema>;
