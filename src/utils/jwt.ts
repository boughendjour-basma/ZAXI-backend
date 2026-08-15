import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  userId: string;
  role: Role;
  phone?: string;
}

export interface PasswordResetPayload {
  userId: string;
  phone: string;
  type: 'password_reset';
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
 * Generates a short-lived (10 min) password reset token.
 * Carries `type: 'password_reset'` so it cannot be used as an auth JWT.
 */
export const generatePasswordResetToken = (userId: string, phone: string): string => {
  return jwt.sign({ userId, phone, type: 'password_reset' }, JWT_SECRET, { expiresIn: '10m' });
};

/**
 * Verifies a password reset token.
 * Throws 401 error if the token is invalid, expired, or of the wrong type.
 */
export const verifyPasswordResetToken = (token: string): PasswordResetPayload => {
  let payload: any;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    const error: any = new Error('Invalid or expired reset token');
    error.statusCode = 401;
    throw error;
  }
  if (payload.type !== 'password_reset') {
    const error: any = new Error('Invalid or expired reset token');
    error.statusCode = 401;
    throw error;
  }
  return payload as PasswordResetPayload;
};

