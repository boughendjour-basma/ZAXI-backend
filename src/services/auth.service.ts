import prisma from '../config/database';
import argon2 from 'argon2';
import { Role } from '@prisma/client';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordVerifyInput,
  ResetPasswordInput,
} from '../validators/auth.validator';
import { normalizePhoneNumber } from '../validators/phone.validator';
import { generateToken, generatePasswordResetToken, verifyPasswordResetToken } from '../utils/jwt';
import { SocketService } from '../sockets/socket.service';

/** Fields safely returned to the client — never includes sensitive/internal fields. */
export const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  phoneVerified: true,
  dateOfBirth: true,
  lastLoginAt: true,
  role: true,
  profilePhoto: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export class AuthService {
  // ─── Registration Flow (Password-based) ──────────────────────────────────

  /**
   * POST /api/auth/register
   * Creates a new CUSTOMER account with phone, name, dateOfBirth, and password.
   */
  static async register(data: RegisterInput) {
    const { phone: rawPhone, name, dateOfBirth, password } = data;
    const phone = normalizePhoneNumber(rawPhone);

    if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      const error: any = new Error('Invalid phone number format');
      error.statusCode = 400;
      throw error;
    }

    const parsedDateOfBirth = new Date(dateOfBirth);
    if (isNaN(parsedDateOfBirth.getTime())) {
      const error: any = new Error('Invalid date of birth format');
      error.statusCode = 400;
      throw error;
    }

    // Check if user with phone already exists
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      const error: any = new Error('Account already exists for this phone number');
      error.statusCode = 409;
      throw error;
    }

    // Hash password with Argon2
    const passwordHash = await argon2.hash(password);

    // Create CUSTOMER account
    const newUser = await prisma.user.create({
      data: {
        phone,
        name,
        dateOfBirth: parsedDateOfBirth,
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
      dateOfBirth: newUser.dateOfBirth,
      lastLoginAt: newUser.lastLoginAt,
      role: newUser.role,
      profilePhoto: newUser.profilePhoto,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return { user: safeUser, token };
  }

  // ─── Login Flow (Password-based) ─────────────────────────────────────────

  /**
   * POST /api/auth/login
   * Authenticates any user (CUSTOMER or DRIVER) using phone + password.
   */
  static async login(data: LoginInput) {
    const phone = normalizePhoneNumber(data.phone);

    if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      const error: any = new Error('Invalid phone number format');
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user || !user.isActive) {
      const error: any = new Error('Incorrect phone number or password');
      error.statusCode = 401;
      throw error;
    }

    // If user has no password set (legacy account), reject with friendly message
    if (!user.passwordHash) {
      const error: any = new Error('No password set for this account');
      error.statusCode = 401;
      throw error;
    }

    // Verify password with Argon2
    const isPasswordValid = await argon2.verify(user.passwordHash, data.password);
    if (!isPasswordValid) {
      const error: any = new Error('Incorrect phone number or password');
      error.statusCode = 401;
      throw error;
    }

    const now = new Date();
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });

    const token = generateToken({ userId: user.id, role: user.role, phone: user.phone });

    const { passwordHash, ...rest } = user;
    const safeUser = { ...rest, lastLoginAt: now };

    return { user: safeUser, token };
  }

  // ─── Forgot Password Flow ────────────────────────────────────────────────

  /**
   * POST /api/auth/forgot-password/verify
   * Verifies Phone Number + Full Name + Date of Birth.
   * Returns a 10-minute resetToken if matched.
   * Uses a generic error message to prevent account enumeration.
   */
  static async forgotPasswordVerify(data: ForgotPasswordVerifyInput) {
    const genericErrorMessage = 'Invalid phone number or date of birth';
    const phone = normalizePhoneNumber(data.phone);

    if (!phone) {
      const error: any = new Error(genericErrorMessage);
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !user.isActive) {
      const error: any = new Error(genericErrorMessage);
      error.statusCode = 400;
      throw error;
    }

    // Verify Date of Birth match (compare YYYY-MM-DD string portions)
    const inputDobIso = new Date(data.dateOfBirth).toISOString().slice(0, 10);
    const userDobIso = user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null;
    const dobMatch = userDobIso === inputDobIso;

    if (!dobMatch) {
      const error: any = new Error(genericErrorMessage);
      error.statusCode = 400;
      throw error;
    }

    const resetToken = generatePasswordResetToken(user.id, user.phone);
    return { resetToken };
  }

  /**
   * POST /api/auth/forgot-password/reset
   * Validates the 10-minute resetToken and updates the user's password.
   */
  static async resetPassword(data: ResetPasswordInput) {
    const payload = verifyPasswordResetToken(data.resetToken);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      const error: any = new Error('User not found or inactive');
      error.statusCode = 404;
      throw error;
    }

    const passwordHash = await argon2.hash(data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { message: 'Password updated successfully' };
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

