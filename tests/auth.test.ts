import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import { Role } from '@prisma/client';
import argon2 from 'argon2';
import { generateToken, generateVerificationToken } from '../src/utils/jwt';
import { requireRole, authenticate } from '../src/middleware/auth.middleware';

// Add a test-only route to verify role authorization
app.get('/api/test-driver-only', authenticate, requireRole(Role.DRIVER), (_req, res) => {
  res.status(200).json({ status: 'success', message: 'Welcome driver' });
});

// ─── Shared Fixtures ──────────────────────────────────────────────────────────

const customerFromDb = {
  id: 'user-1',
  email: null,
  name: 'John Doe',
  phone: '+213555123456',
  passwordHash: 'hashedpassword',
  phoneVerified: true,
  lastLoginAt: null,
  role: Role.CUSTOMER,
  profilePhoto: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const driverFromDb = {
  id: 'driver-1',
  email: null,
  name: 'Driver Joe',
  phone: '+213666777888',
  passwordHash: 'hashedpassword',
  phoneVerified: true,
  lastLoginAt: null,
  role: Role.DRIVER,
  profilePhoto: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Authentication API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ─── POST /api/auth/register ───────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should create a CUSTOMER account with a valid verificationToken and return JWT', async () => {
      const verificationToken = generateVerificationToken('+213555123456');
      prismaMock.user.findUnique.mockResolvedValue(null);

      const safeUser = { ...customerFromDb };
      // @ts-ignore
      delete safeUser.passwordHash;
      prismaMock.user.create.mockResolvedValue(safeUser as any);
      vi.spyOn(argon2, 'hash').mockResolvedValue('hashedpassword' as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          verificationToken,
          name: 'John Doe',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe(Role.CUSTOMER);

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: Role.CUSTOMER, phoneVerified: true }),
        })
      );
    });

    it('should reject an invalid verificationToken with 401', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          verificationToken: 'invalid.token.value',
          name: 'John Doe',
          password: 'password123',
        });

      expect(response.status).toBe(401);
    });

    it('should reject an expired or tampered verificationToken with 401', async () => {
      // Sign a token with the wrong type — should be rejected
      const wrongToken = generateToken({ userId: 'x', role: Role.CUSTOMER });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          verificationToken: wrongToken,
          name: 'John Doe',
          password: 'password123',
        });

      expect(response.status).toBe(401);
    });

    it('should reject duplicate registration (phone already has an account) with 409', async () => {
      const verificationToken = generateVerificationToken('+213555123456');
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          verificationToken,
          name: 'John Doe',
          password: 'password123',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Account already exists for this phone number');
    });

    it('should reject registration with missing name with 400', async () => {
      const verificationToken = generateVerificationToken('+213555123456');

      const response = await request(app)
        .post('/api/auth/register')
        .send({ verificationToken, password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject registration with a short password with 400', async () => {
      const verificationToken = generateVerificationToken('+213555123456');

      const response = await request(app)
        .post('/api/auth/register')
        .send({ verificationToken, name: 'John', password: 'short' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  // ─── POST /api/auth/login ──────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should login a customer successfully with phone + password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);
      prismaMock.user.update.mockResolvedValue({
        ...customerFromDb,
        lastLoginAt: new Date(),
      } as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+213555123456', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.token).toBeDefined();
    });

    it('should login the driver successfully with phone + password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(driverFromDb as any);
      prismaMock.user.update.mockResolvedValue({
        ...driverFromDb,
        lastLoginAt: new Date(),
      } as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+213666777888', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe(Role.DRIVER);
      expect(response.body.data.token).toBeDefined();
    });

    it('should update lastLoginAt on successful login', async () => {
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);
      prismaMock.user.update.mockResolvedValue({
        ...customerFromDb,
        lastLoginAt: new Date(),
      } as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);

      await request(app)
        .post('/api/auth/login')
        .send({ phone: '+213555123456', password: 'password123' });

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        })
      );
    });

    it('should reject a wrong password with 401', async () => {
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+213555123456', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid phone number or password');
    });

    it('should reject an unregistered phone number with 401', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+213999999999', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid phone number or password');
    });

    it('should reject a user with no password hash (OTP-only account) with 401', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...customerFromDb,
        passwordHash: null,
      } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+213555123456', password: 'password123' });

      expect(response.status).toBe(401);
    });

    it('should accept normalised Algerian local format (0555...)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);
      prismaMock.user.update.mockResolvedValue({
        ...customerFromDb,
        lastLoginAt: new Date(),
      } as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ phone: '0555123456', password: 'password123' });

      // The service normalises 0555123456 → +213555123456
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { phone: '+213555123456' } })
      );
      expect(response.status).toBe(200);
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
      // @ts-ignore
      delete safeUser.passwordHash;
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
