import { z } from 'zod';

// ─── Sign-Up ─────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  phone: z.string().min(8, 'Phone number must be valid').max(20),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date of birth format',
  }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ─── Login (Phone + Password) ────────────────────────────────────────────────

export const loginSchema = z.object({
  phone: z.string().min(8, 'Phone number must be valid').max(20),
  password: z.string().min(1, 'Password is required'),
});

// ─── Forgot Password Verification (Phone + Date of Birth) ─────────────────────

export const forgotPasswordVerifySchema = z.object({
  phone: z.string().min(8, 'Phone number must be valid').max(20),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date of birth format',
  }),
});

// ─── Reset Password ──────────────────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordVerifyInput = z.infer<typeof forgotPasswordVerifySchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

