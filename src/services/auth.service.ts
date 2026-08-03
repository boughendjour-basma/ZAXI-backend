import prisma from '../config/database';
import argon2 from 'argon2';
import { Role } from '@prisma/client';
import { RegisterInput } from '../validators/auth.validator';
import { normalizePhoneNumber } from '../validators/phone.validator';
import { generateToken, generateVerificationToken, verifyVerificationToken } from '../utils/jwt';
import { SMSService } from './sms/sms.service';
import { SocketService } from '../sockets/socket.service';

/** Fields safely returned to the client — never includes sensitive/internal fields. */
export const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  phoneVerified: true,
  lastLoginAt: true,
  role: true,
  profilePhoto: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export class AuthService {
  // ─── Registration Flow (OTP-based) ─────────────────────────────────────────

  /**
   * POST /api/auth/request-code
   * Generates a 6-digit OTP, hashes it with Argon2, stores it, and sends via SMS.
   * Used exclusively for sign-up phone verification.
   */
  static async requestCode(rawPhone: string) {
    const phone = normalizePhoneNumber(rawPhone);

    if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      const error: any = new Error('Invalid phone number format');
      error.statusCode = 400;
      throw error;
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash with Argon2 — never store plaintext OTP
    const codeHash = await argon2.hash(code);

    // 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate any previous active OTP records for this phone
    await prisma.oTPVerification.deleteMany({ where: { phone, verified: false } });

    // Store the hashed OTP
    await prisma.oTPVerification.create({
      data: { phone, codeHash, expiresAt, attempts: 0, verified: false },
    });

    // Send SMS via provider abstraction layer
    const smsMessage = `Your ZAXI verification code is ${code}`;
    await SMSService.sendSMS(phone, smsMessage);

    // Return success WITHOUT exposing the OTP code
    return { message: 'Verification code sent' };
  }

  /**
   * POST /api/auth/verify-code
   * Validates the registration OTP. Does NOT create an account or issue an auth JWT.
   *
   * New phone (not registered yet):
   *   → { isNewUser: true, verificationToken }
   *
   * Existing phone (already has an account):
   *   → { isNewUser: false }
   */
  static async verifyCode(rawPhone: string, code: string) {
    const phone = normalizePhoneNumber(rawPhone);

    if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      const error: any = new Error('Invalid phone number format');
      error.statusCode = 400;
      throw error;
    }

    // Fetch the latest unverified OTP for this phone
    const otpRecord = await prisma.oTPVerification.findFirst({
      where: { phone, verified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      const error: any = new Error('Invalid or expired verification code');
      error.statusCode = 400;
      throw error;
    }

    // Check expiry
    if (new Date() > otpRecord.expiresAt) {
      const error: any = new Error('Verification code has expired. Please request a new code');
      error.statusCode = 400;
      throw error;
    }

    // Enforce max 5 attempts
    if (otpRecord.attempts >= 5) {
      const error: any = new Error('Too many failed attempts. Please request a new code');
      error.statusCode = 400;
      throw error;
    }

    // Verify Argon2 hash
    const isCodeValid = await argon2.verify(otpRecord.codeHash, code);

    if (!isCodeValid) {
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const error: any = new Error('Invalid verification code');
      error.statusCode = 400;
      throw error;
    }

    // Mark OTP as verified — prevents reuse
    await prisma.oTPVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    const existingUser = await prisma.user.findUnique({ where: { phone } });

    if (existingUser) {
      return { isNewUser: false };
    }

    // New phone → issue a short-lived verification token to authorize registration
    const verificationToken = generateVerificationToken(phone);
    return { isNewUser: true, verificationToken };
  }

  /**
   * POST /api/auth/register
   * Requires the verificationToken issued by /api/auth/verify-code.
   * Creates the CUSTOMER account (passwordless) and returns an auth JWT.
   */
  static async register(data: RegisterInput) {
    const { verificationToken, name } = data;

    // Validate token — throws 401 if invalid, expired, or wrong type
    const { phone } = verifyVerificationToken(verificationToken);

    // Guard against double-submission
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      const error: any = new Error('Account already exists for this phone number');
      error.statusCode = 409;
      throw error;
    }

    // Create passwordless CUSTOMER account
    const newUser = await prisma.user.create({
      data: {
        phone,
        name,
        passwordHash: null,
        role: Role.CUSTOMER,
        phoneVerified: true,
      },
    });

    const token = generateToken({ userId: newUser.id, role: newUser.role, phone: newUser.phone });

    // Emit real-time socket notification
    SocketService.emitAuthVerified({ userId: newUser.id, phone: newUser.phone, role: newUser.role });

    const safeUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      phone: newUser.phone,
      phoneVerified: newUser.phoneVerified,
      lastLoginAt: newUser.lastLoginAt,
      role: newUser.role,
      profilePhoto: newUser.profilePhoto,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return { user: safeUser, token };
  }

  // ─── Login Flow (Two-Step OTP for All Users) ───────────────────────────────

  /**
   * POST /api/auth/login/request-code
   * Step 1 of Login: Sends an OTP if the phone number is registered.
   * Always returns a generic success message to prevent user enumeration attacks.
   */
  static async loginRequestCode(rawPhone: string) {
    const phone = normalizePhoneNumber(rawPhone);

    if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      const error: any = new Error('Invalid phone number format');
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({ where: { phone } });

    if (user && user.isActive) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = await argon2.hash(code);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await prisma.oTPVerification.deleteMany({ where: { phone, verified: false } });
      await prisma.oTPVerification.create({
        data: { phone, codeHash, expiresAt, attempts: 0, verified: false },
      });

      const smsMessage = `Your ZAXI login code is ${code}`;
      await SMSService.sendSMS(phone, smsMessage);
    }

    // Always return generic message to prevent user enumeration
    return { message: 'If this phone number is registered, a verification code has been sent' };
  }

  /**
   * POST /api/auth/login/verify
   * Step 2 of Login: Verifies the login OTP code and returns auth JWT + user profile.
   * Works identically for CUSTOMER and DRIVER (role determined by user record in DB).
   */
  static async loginVerify(rawPhone: string, code: string) {
    const phone = normalizePhoneNumber(rawPhone);

    if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      const error: any = new Error('Invalid phone number format');
      error.statusCode = 400;
      throw error;
    }

    const otpRecord = await prisma.oTPVerification.findFirst({
      where: { phone, verified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      const error: any = new Error('Invalid phone or verification code');
      error.statusCode = 400;
      throw error;
    }

    if (new Date() > otpRecord.expiresAt) {
      const error: any = new Error('Verification code has expired. Please request a new code');
      error.statusCode = 400;
      throw error;
    }

    if (otpRecord.attempts >= 5) {
      const error: any = new Error('Too many failed attempts. Please request a new code');
      error.statusCode = 400;
      throw error;
    }

    const isCodeValid = await argon2.verify(otpRecord.codeHash, code);

    if (!isCodeValid) {
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const error: any = new Error('Invalid phone or verification code');
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user || !user.isActive) {
      const error: any = new Error('Invalid phone or verification code');
      error.statusCode = 400;
      throw error;
    }

    // Mark OTP verified
    await prisma.oTPVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    const now = new Date();
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });

    const token = generateToken({ userId: user.id, role: user.role, phone: user.phone });

    const { passwordHash, ...rest } = user;
    const safeUser = { ...rest, lastLoginAt: now };

    return { user: safeUser, token };
  }

  // ─── Session ──────────────────────────────────────────────────────────────

  /**
   * GET /api/auth/me
   */
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });

    if (!user) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return user;
  }
}
