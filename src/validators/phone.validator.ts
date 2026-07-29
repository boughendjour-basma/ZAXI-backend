import { z } from 'zod';

/**
 * Normalizes phone numbers to standard E.164 format (+213XXXXXXXXX for Algeria).
 * Examples:
 *  "0555123456"    -> "+213555123456"
 *  "0655123456"    -> "+213655123456"
 *  "0755123456"    -> "+213755123456"
 *  "213555123456"   -> "+213555123456"
 *  "+213555123456"  -> "+213555123456"
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove spaces, hyphens, dots, parentheses
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '').trim();

  // If local Algerian format: 05XXXXXXXX, 06XXXXXXXX, 07XXXXXXXX
  if (/^0[567]\d{8}$/.test(cleaned)) {
    cleaned = '+213' + cleaned.substring(1);
  } else if (/^213[567]\d{8}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  } else if (/^0\d{8,9}$/.test(cleaned)) {
    // Other local 0-prefixed numbers
    cleaned = '+213' + cleaned.substring(1);
  }

  return cleaned;
}

export const requestCodeSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .transform((val) => normalizePhoneNumber(val))
    .refine((val) => /^\+[1-9]\d{7,14}$/.test(val), {
      message: 'Invalid phone number format. Must be a valid phone number (e.g., +213555123456 or 0555123456)',
    }),
});

export const verifyCodeSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .transform((val) => normalizePhoneNumber(val))
    .refine((val) => /^\+[1-9]\d{7,14}$/.test(val), {
      message: 'Invalid phone number format',
    }),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: 'Verification code must be exactly 6 digits' }),
});
