import prisma from '../config/database';
import argon2 from 'argon2';
import { Role } from '@prisma/client';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { normalizePhoneNumber } from '../validators/phone.validator';
import { generateToken } from '../utils/jwt';
import { SMSService } from './sms/sms.service';
import { SocketService } from '../sockets/socket.service';

// Define the fields we want to return safely to the client.
// Explicitly omitting passwordHash.
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
  /**
   * Requests an SMS verification code for a phone number.
   * Generates 6-digit OTP, stores Argon2 hash, and sends SMS.
   */
  static async requestCode(rawPhone: string) {
    const phone = normalizePhoneNumber(rawPhone);

    if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      const error: any = new Error('Invalid phone number format');
      error.statusCode = 400;
      throw error;
    }

    // Generate random 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the code using Argon2 (never store plaintext OTP)
    const codeHash = await argon2.hash(code);

    // Set 5-minute expiration time
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate/delete any previous active OTP records for this phone number
    await prisma.oTPVerification.deleteMany({
      where: { phone, verified: false },
    });

    // Create the OTP verification record
    await prisma.oTPVerification.create({
      data: {
        phone,
        codeHash,
        expiresAt,
        attempts: 0,
        verified: false,
      },
    });

    // Send SMS via provider abstraction layer
    const smsMessage = `Your ZAXI verification code is ${code}`;
    await SMSService.sendSMS(phone, smsMessage);

    // Return success response WITHOUT exposing the OTP code
    return { message: 'Verification code sent' };
  }

  /**
   * Verifies an SMS OTP code and logs in or creates the user.
   */
  static async verifyCode(rawPhone: string, code: string) {
    const phone = normalizePhoneNumber(rawPhone);

    if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      const error: any = new Error('Invalid phone number format');
      error.statusCode = 400;
      throw error;
    }

    // Fetch the latest unverified OTP record for this phone number
    const otpRecord = await prisma.oTPVerification.findFirst({
      where: {
        phone,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      const error: any = new Error('Invalid or expired verification code');
      error.statusCode = 400;
      throw error;
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      const error: any = new Error('Verification code has expired. Please request a new code');
      error.statusCode = 400;
      throw error;
    }

    // Check maximum attempts rule (5 attempts max)
    if (otpRecord.attempts >= 5) {
      const error: any = new Error('Too many failed attempts. Please request a new code');
      error.statusCode = 400;
      throw error;
    }

    // Verify code hash using Argon2
    const isCodeValid = await argon2.verify(otpRecord.codeHash, code);

    if (!isCodeValid) {
      // Increment attempt counter on failure
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });

      const error: any = new Error('Invalid verification code');
      error.statusCode = 400;
      throw error;
    }

    // Mark OTP code as verified so it cannot be reused
    await prisma.oTPVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    const now = new Date();

    if (user) {
      // Existing user: Update verification & login timestamp
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          phoneVerified: true,
          lastLoginAt: now,
        },
      });
    } else {
      // New user: Automatically create account with CUSTOMER role
      user = await prisma.user.create({
        data: {
          phone,
          phoneVerified: true,
          lastLoginAt: now,
          role: Role.CUSTOMER,
        },
      });
    }

    // Generate JWT token with userId, role, and phone
    const token = generateToken({
      userId: user.id,
      role: user.role,
      phone: user.phone,
    });

    // Emit real-time socket notification
    SocketService.emitAuthVerified({
      userId: user.id,
      phone: user.phone,
      role: user.role,
    });

    // Return safe user payload (omitting passwordHash) and token
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      lastLoginAt: user.lastLoginAt,
      role: user.role,
      profilePhoto: user.profilePhoto,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { token, user: safeUser };
  }

  // ─── Legacy Email/Password Methods (Preserved for Backward Compatibility) ───

  static async register(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      const error: any = new Error('Email is already registered');
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await argon2.hash(data.password);
    const normalizedPhone = normalizePhoneNumber(data.phone);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: normalizedPhone,
        passwordHash,
        role: Role.CUSTOMER,
        phoneVerified: true,
      },
      select: safeUserSelect,
    });

    const token = generateToken({
      userId: newUser.id,
      role: newUser.role,
      phone: newUser.phone,
    });

    return { user: newUser, token };
  }

  static async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    const invalidAuthError: any = new Error('Invalid email or password');
    invalidAuthError.statusCode = 401;

    if (!user || !user.passwordHash) {
      throw invalidAuthError;
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, data.password);
    if (!isPasswordValid) {
      throw invalidAuthError;
    }

    const token = generateToken({
      userId: user.id,
      role: user.role,
      phone: user.phone,
    });

    const { passwordHash, ...safeUser } = user;

    return { user: safeUser, token };
  }

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
