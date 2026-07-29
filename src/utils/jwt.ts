import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  userId: string;
  role: Role;
  phone?: string;
}

/**
 * Payload embedded in the short-lived verification token.
 * Carries `type: 'phone_verified'` to distinguish it from auth JWTs.
 */
export interface VerificationPayload {
  phone: string;
  type: 'phone_verified';
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any,
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

/**
 * Generates a short-lived (10 min) verification token after successful OTP verification.
 * This token authorises account creation via POST /api/auth/register.
 * It carries `type: 'phone_verified'` so it can never be used as an auth token.
 */
export const generateVerificationToken = (phone: string): string => {
  return jwt.sign({ phone, type: 'phone_verified' }, JWT_SECRET, { expiresIn: '10m' });
};

/**
 * Verifies a phone verification token issued by generateVerificationToken.
 * Throws 401 if the token is invalid, expired, or is an auth token (wrong type).
 */
export const verifyVerificationToken = (token: string): VerificationPayload => {
  let payload: any;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    const error: any = new Error('Invalid or expired verification token');
    error.statusCode = 401;
    throw error;
  }
  if (payload.type !== 'phone_verified') {
    const error: any = new Error('Invalid or expired verification token');
    error.statusCode = 401;
    throw error;
  }
  return payload as VerificationPayload;
};
