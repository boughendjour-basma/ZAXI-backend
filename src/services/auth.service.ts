import prisma from '../config/database';
import argon2 from 'argon2';
import { Role } from '@prisma/client';
import { RegisterInput, LoginInput, ResetPasswordInput } from '../validators/auth.validator';
import { normalizePhoneNumber } from '../validators/phone.validator';
import { generateToken, generateVerificationToken, verifyVerificationToken } from '../utils/jwt';
import { SMSService } from './sms/sms.service';
import { SocketService } from '../sockets/socket.service';
import { AuditLogService } from './audit-log.service';

/** Fields safely returned to the client — never includes passwordHash. */
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
  // ─── Step 1: Request OTP (Sign-Up Phone Verification) ───────────────────────

  /**
   * POST /api/auth/request-code
   * Generates a 6-digit OTP, hashes it with Argon2, stores it, and sends via SMS.
   * Used exclusively for sign-up phone verification. Never for normal login.
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

  // ─── Step 2: Verify OTP ───────────────────────────────────────────────────

  /**
   * POST /api/auth/verify-code
   * Validates the OTP. Does NOT create an account or issue an auth JWT.
   *
   * New phone (not registered yet):
   *   → { isNewUser: true, verificationToken }
   *   The short-lived verificationToken (10 min) must be sent to /api/auth/register.
   *
   * Existing phone (already has an account):
   *   → { isNewUser: false }
   *   Client redirects to the login screen.
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
      // Phone already registered → redirect to login
      return { isNewUser: false };
    }

    // New phone → issue a short-lived verification token to authorise registration
    const verificationToken = generateVerificationToken(phone);
    return { isNewUser: true, verificationToken };
  }

  // ─── Step 3: Register (Create Account) ───────────────────────────────────

  /**
   * POST /api/auth/register
   * Requires the verificationToken issued by /api/auth/verify-code.
   * Creates the CUSTOMER account and immediately returns an auth JWT.
   */
  static async register(data: RegisterInput) {
    const { verificationToken, name, password } = data;

    // Validate token — throws 401 if invalid, expired, or wrong type
    const { phone } = verifyVerificationToken(verificationToken);

    // Guard against double-submission (race condition)
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      const error: any = new Error('Account already exists for this phone number');
      error.statusCode = 409;
      throw error;
    }

    // Hash password with Argon2
    const passwordHash = await argon2.hash(password);

    const newUser = await prisma.user.create({
      data: {
        phone,
        name,
        passwordHash,
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

  // ─── Login ────────────────────────────────────────────────────────────────

  /**
   * POST /api/auth/login
   * Authenticates using phone + password. Never sends OTP.
   * Works for both CUSTOMER and DRIVER accounts.
   */
  static async login(data: LoginInput) {
    const normalizedPhone = normalizePhoneNumber(data.phone);

    const invalidAuthError: any = new Error('Invalid phone number or password');
    invalidAuthError.statusCode = 401;

    const user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });

    if (!user || !user.passwordHash) throw invalidAuthError;

    const isPasswordValid = await argon2.verify(user.passwordHash, data.password);
    if (!isPasswordValid) throw invalidAuthError;

    const now = new Date();
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });

    const token = generateToken({ userId: user.id, role: user.role, phone: user.phone });

    const { passwordHash, ...rest } = user;
    const safeUser = { ...rest, lastLoginAt: now };

    return { user: safeUser, token };
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────

  /**
   * POST /api/auth/forgot-password/request-code
   * Sends a password-reset OTP. Returns success regardless of whether the phone
   * is registered — prevents user enumeration attacks.
   */
  static async forgotPasswordRequestCode(rawPhone: string) {
    const phone = normalizePhoneNumber(rawPhone);

    if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      const error: any = new Error('Invalid phone number format');
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({ where: { phone } });

    if (user) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = await argon2.hash(code);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await prisma.oTPVerification.deleteMany({ where: { phone, verified: false } });
      await prisma.oTPVerification.create({
        data: { phone, codeHash, expiresAt, attempts: 0, verified: false },
      });

      const smsMessage = `Your ZAXI password reset code is ${code}`;
      await SMSService.sendSMS(phone, smsMessage);
    }

    // Always return the same message — never reveal whether the phone is registered
    return { message: 'If your number is registered, a verification code has been sent' };
  }

  /**
   * POST /api/auth/forgot-password/reset
   * Verifies the reset OTP and replaces the user's Argon2 password hash.
   */
  static async resetPassword(data: ResetPasswordInput) {
    const phone = normalizePhoneNumber(data.phone);

    const otpRecord = await prisma.oTPVerification.findFirst({
      where: { phone, verified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      const error: any = new Error('Invalid or expired verification code');
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

    const isCodeValid = await argon2.verify(otpRecord.codeHash, data.code);

    if (!isCodeValid) {
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const error: any = new Error('Invalid verification code');
      error.statusCode = 400;
      throw error;
    }

    // Mark OTP verified — prevents reuse
    await prisma.oTPVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      const error: any = new Error('No account found for this phone number');
      error.statusCode = 404;
      throw error;
    }

    // Replace password hash with Argon2 hash of the new password
    const passwordHash = await argon2.hash(data.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return { message: 'Password reset successfully' };
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

  /**
   * PATCH /api/auth/change-password
   * Authenticated password change for any user (such as DRIVER or CUSTOMER).
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (!user.passwordHash) {
      const error: any = new Error('Current password is incorrect');
      error.statusCode = 401;
      throw error;
    }

    const isCurrentValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isCurrentValid) {
      const error: any = new Error('Current password is incorrect');
      error.statusCode = 401;
      throw error;
    }

    const isSamePassword = await argon2.verify(user.passwordHash, newPassword);
    if (isSamePassword) {
      const error: any = new Error('New password cannot be the same as the current password');
      error.statusCode = 400;
      throw error;
    }

    const now = new Date();
    const newPasswordHash = await argon2.hash(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        lastLoginAt: now,
      },
    });

    await AuditLogService.logAction({
      userId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: userId,
    });

    return { message: 'Password updated successfully' };
  }
}
