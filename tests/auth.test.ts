import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import { Role } from '@prisma/client';
import argon2 from 'argon2';
import { generateToken, generateVerificationToken } from '../src/utils/jwt';
import { requireRole, authenticate } from '../src/middleware/auth.middleware';
import { SMSService } from '../src/services/sms/sms.service';

// Add a test-only route to verify role authorization
app.get('/api/test-driver-only', authenticate, requireRole(Role.DRIVER), (_req, res) => {
  res.status(200).json({ status: 'success', message: 'Welcome driver' });
});

// ─── Shared Fixtures ──────────────────────────────────────────────────────────

const CUSTOMER_ID = 'user-1';
const DRIVER_ID = 'driver-1';
const OTP_ID = 'otp-1';

const customerFromDb = {
  id: CUSTOMER_ID,
  email: null,
  name: 'John Doe',
  phone: '+213555123456',
  passwordHash: null,
  phoneVerified: true,
  lastLoginAt: null,
  role: Role.CUSTOMER,
  profilePhoto: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const driverFromDb = {
  id: DRIVER_ID,
  email: null,
  name: 'Driver Joe',
  phone: '+213666777888',
  passwordHash: null,
  phoneVerified: true,
  lastLoginAt: null,
  role: Role.DRIVER,
  profilePhoto: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeOTP(overrides: Record<string, any> = {}) {
  return {
    id: OTP_ID,
    phone: '+213555123456',
    codeHash: '$argon2id$fakehash',
    attempts: 0,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    verified: false,
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Authentication API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ─── POST /api/auth/register ───────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should create a passwordless CUSTOMER account with a valid verificationToken and return JWT', async () => {
      const verificationToken = generateVerificationToken('+213555123456');
      prismaMock.user.findUnique.mockResolvedValue(null);

      const safeUser = { ...customerFromDb };
      prismaMock.user.create.mockResolvedValue(safeUser as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          verificationToken,
          name: 'John Doe',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe(Role.CUSTOMER);

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: Role.CUSTOMER,
            phoneVerified: true,
            passwordHash: null,
          }),
        })
      );
    });

    it('should reject an invalid verificationToken with 401', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          verificationToken: 'invalid.token.value',
          name: 'John Doe',
        });

      expect(response.status).toBe(401);
    });

    it('should reject an expired or tampered verificationToken with 401', async () => {
      const wrongToken = generateToken({ userId: 'x', role: Role.CUSTOMER });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          verificationToken: wrongToken,
          name: 'John Doe',
        });

      expect(response.status).toBe(401);
    });

    it('should reject duplicate registration with 409', async () => {
      const verificationToken = generateVerificationToken('+213555123456');
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          verificationToken,
          name: 'John Doe',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Account already exists for this phone number');
    });

    it('should reject registration with missing name with 400', async () => {
      const verificationToken = generateVerificationToken('+213555123456');

      const response = await request(app)
        .post('/api/auth/register')
        .send({ verificationToken });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  // ─── POST /api/auth/login/request-code ────────────────────────────────────

  describe('POST /api/auth/login/request-code', () => {
    it('should send OTP and return generic success for a registered customer', async () => {
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);
      prismaMock.oTPVerification.deleteMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.oTPVerification.create.mockResolvedValue(makeOTP() as any);
      const smsSpy = vi.spyOn(SMSService, 'sendSMS').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login/request-code')
        .send({ phone: '+213555123456' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toMatch(/if this phone number is registered/i);
      expect(smsSpy).toHaveBeenCalledWith('+213555123456', expect.stringContaining('ZAXI login code'));
    });

    it('should send OTP and return generic success for the registered driver', async () => {
      prismaMock.user.findUnique.mockResolvedValue(driverFromDb as any);
      prismaMock.oTPVerification.deleteMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.oTPVerification.create.mockResolvedValue(makeOTP({ phone: '+213666777888' }) as any);
      const smsSpy = vi.spyOn(SMSService, 'sendSMS').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login/request-code')
        .send({ phone: '+213666777888' });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/if this phone number is registered/i);
      expect(smsSpy).toHaveBeenCalledWith('+213666777888', expect.any(String));
    });

    it('should return 200 silently without sending OTP for an unregistered phone (no enumeration)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const smsSpy = vi.spyOn(SMSService, 'sendSMS').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login/request-code')
        .send({ phone: '+213999000000' });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/if this phone number is registered/i);
      expect(smsSpy).not.toHaveBeenCalled();
    });

    it('should normalize Algerian local format (0555...) before lookup', async () => {
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);
      prismaMock.oTPVerification.deleteMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.oTPVerification.create.mockResolvedValue(makeOTP() as any);
      vi.spyOn(SMSService, 'sendSMS').mockResolvedValue(true);

      await request(app)
        .post('/api/auth/login/request-code')
        .send({ phone: '0555123456' });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { phone: '+213555123456' } })
      );
    });

    it('should reject invalid phone format with 400', async () => {
      const response = await request(app)
        .post('/api/auth/login/request-code')
        .send({ phone: 'not-a-phone' });

      expect(response.status).toBe(400);
    });
  });

  // ─── POST /api/auth/login/verify ──────────────────────────────────────────

  describe('POST /api/auth/login/verify', () => {
    it('should login a customer with a valid OTP and return JWT', async () => {
      const otp = makeOTP();
      prismaMock.oTPVerification.findFirst.mockResolvedValue(otp as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);
      prismaMock.oTPVerification.update.mockResolvedValue({ ...otp, verified: true } as any);
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);
      prismaMock.user.update.mockResolvedValue({ ...customerFromDb, lastLoginAt: new Date() } as any);

      const response = await request(app)
        .post('/api/auth/login/verify')
        .send({ phone: '+213555123456', code: '483921' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe(Role.CUSTOMER);
    });

    it('should login the driver via OTP and return JWT with role=DRIVER', async () => {
      const otp = makeOTP({ phone: '+213666777888' });
      prismaMock.oTPVerification.findFirst.mockResolvedValue(otp as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);
      prismaMock.oTPVerification.update.mockResolvedValue({ ...otp, verified: true } as any);
      prismaMock.user.findUnique.mockResolvedValue(driverFromDb as any);
      prismaMock.user.update.mockResolvedValue({ ...driverFromDb, lastLoginAt: new Date() } as any);

      const response = await request(app)
        .post('/api/auth/login/verify')
        .send({ phone: '+213666777888', code: '483921' });

      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe(Role.DRIVER);
      expect(response.body.data.token).toBeDefined();
    });

    it('should update lastLoginAt on successful login', async () => {
      const otp = makeOTP();
      prismaMock.oTPVerification.findFirst.mockResolvedValue(otp as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);
      prismaMock.oTPVerification.update.mockResolvedValue({ ...otp, verified: true } as any);
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);
      prismaMock.user.update.mockResolvedValue({ ...customerFromDb, lastLoginAt: new Date() } as any);

      await request(app)
        .post('/api/auth/login/verify')
        .send({ phone: '+213555123456', code: '483921' });

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        })
      );
    });

    it('should reject an invalid OTP code with 400', async () => {
      const otp = makeOTP();
      prismaMock.oTPVerification.findFirst.mockResolvedValue(otp as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(false);
      prismaMock.oTPVerification.update.mockResolvedValue({ ...otp, attempts: 1 } as any);

      const response = await request(app)
        .post('/api/auth/login/verify')
        .send({ phone: '+213555123456', code: '000000' });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/invalid phone or verification code/i);
    });

    it('should reject an expired OTP with 400', async () => {
      const expiredOtp = makeOTP({ expiresAt: new Date(Date.now() - 60000) });
      prismaMock.oTPVerification.findFirst.mockResolvedValue(expiredOtp as any);

      const response = await request(app)
        .post('/api/auth/login/verify')
        .send({ phone: '+213555123456', code: '483921' });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/expired/i);
    });

    it('should reject after 5 failed attempts with 400', async () => {
      const lockedOtp = makeOTP({ attempts: 5 });
      prismaMock.oTPVerification.findFirst.mockResolvedValue(lockedOtp as any);

      const response = await request(app)
        .post('/api/auth/login/verify')
        .send({ phone: '+213555123456', code: '483921' });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/too many/i);
    });

    it('should reject when no OTP record exists (unregistered phone) with 400', async () => {
      prismaMock.oTPVerification.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login/verify')
        .send({ phone: '+213999000000', code: '483921' });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/invalid phone or verification code/i);
    });

    it('should reject a non-6-digit code with 400', async () => {
      const response = await request(app)
        .post('/api/auth/login/verify')
        .send({ phone: '+213555123456', code: '12345' });

      expect(response.status).toBe(400);
    });
  });

  // ─── Authentication & Authorization Middleware ─────────────────────────────

  describe('Authentication & Authorization Middleware', () => {
    it('should reject a request with no Authorization header with 401', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authentication required');
    });

    it('should reject a malformed or invalid JWT with 401', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('should return the current user for a valid JWT', async () => {
      const token = generateToken({ userId: 'user-1', role: Role.CUSTOMER });

      const safeUser = { ...customerFromDb };
      prismaMock.user.findUnique.mockResolvedValue(safeUser as any);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.phone).toBe('+213555123456');
    });

    it('should allow DRIVER to access a DRIVER-only route', async () => {
      const token = generateToken({ userId: 'driver-1', role: Role.DRIVER });

      const response = await request(app)
        .get('/api/test-driver-only')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Welcome driver');
    });

    it('should reject a CUSTOMER accessing a DRIVER-only route with 403', async () => {
      const token = generateToken({ userId: 'user-1', role: Role.CUSTOMER });

      const response = await request(app)
        .get('/api/test-driver-only')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden: Insufficient permissions');
    });
  });
});
