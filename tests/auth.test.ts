import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import { Role } from '@prisma/client';
import argon2 from 'argon2';
import { generateToken, generatePasswordResetToken } from '../src/utils/jwt';
import { requireRole, authenticate } from '../src/middleware/auth.middleware';

// Add a test-only route to verify role authorization
app.get('/api/test-driver-only', authenticate, requireRole(Role.DRIVER), (_req, res) => {
  res.status(200).json({ status: 'success', message: 'Welcome driver' });
});

// ─── Shared Fixtures ──────────────────────────────────────────────────────────

const CUSTOMER_ID = 'user-1';
const DRIVER_ID = 'driver-1';

const customerFromDb = {
  id: CUSTOMER_ID,
  email: null,
  name: 'John Doe',
  phone: '+213555123456',
  dateOfBirth: new Date('2000-05-15'),
  passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakehash',
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
  dateOfBirth: new Date('1990-01-01'),
  passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakedriverhash',
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
    it('should create a CUSTOMER account with valid name, phone, dateOfBirth, password and return JWT', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(customerFromDb as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          phone: '0555123456',
          dateOfBirth: '2000-05-15',
          password: 'Password123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe(Role.CUSTOMER);
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'John Doe',
            phone: '+213555123456',
            role: Role.CUSTOMER,
            phoneVerified: true,
          }),
        })
      );
    });

    it('should reject duplicate phone registration with 409', async () => {
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          phone: '+213555123456',
          dateOfBirth: '2000-05-15',
          password: 'Password123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Account already exists for this phone number');
    });

    it('should reject registration with invalid birth date with 400', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          phone: '0555123456',
          dateOfBirth: 'not-a-date',
          password: 'Password123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject registration with weak/short password with 400', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          phone: '0555123456',
          dateOfBirth: '2000-05-15',
          password: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  // ─── POST /api/auth/login ──────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should authenticate a customer with correct phone + password and return JWT', async () => {
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);
      prismaMock.user.update.mockResolvedValue({ ...customerFromDb, lastLoginAt: new Date() } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '0555123456',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.role).toBe(Role.CUSTOMER);
      expect(response.body.data.token).toBeDefined();
    });

    it('should authenticate the driver with correct phone + password and return JWT with role=DRIVER', async () => {
      prismaMock.user.findUnique.mockResolvedValue(driverFromDb as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);
      prismaMock.user.update.mockResolvedValue({ ...driverFromDb, lastLoginAt: new Date() } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+213666777888',
          password: 'super-secure-password',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe(Role.DRIVER);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject login with invalid password with 401', async () => {
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '0555123456',
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Incorrect phone number or password');
    });

    it('should reject login for unknown phone number with 401', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '0999999999',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Incorrect phone number or password');
    });
  });

  // ─── POST /api/auth/forgot-password/verify ───────────────────────────────

  describe('POST /api/auth/forgot-password/verify', () => {
    it('should issue a resetToken for correct phone + dateOfBirth', async () => {
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);

      const response = await request(app)
        .post('/api/auth/forgot-password/verify')
        .send({
          phone: '0555123456',
          dateOfBirth: '2000-05-15',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.resetToken).toBeDefined();
    });

    it('should return 400 generic error for wrong birth date (anti-enumeration)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);

      const response = await request(app)
        .post('/api/auth/forgot-password/verify')
        .send({
          phone: '0555123456',
          dateOfBirth: '1999-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid phone number or date of birth');
    });

    it('should return 400 generic error for unknown phone number (anti-enumeration)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/forgot-password/verify')
        .send({
          phone: '0999999999',
          dateOfBirth: '2000-05-15',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid phone number or date of birth');
    });
  });

  // ─── POST /api/auth/forgot-password/reset ────────────────────────────────

  describe('POST /api/auth/forgot-password/reset', () => {
    it('should update password with a valid resetToken and allow subsequent login', async () => {
      const resetToken = generatePasswordResetToken(CUSTOMER_ID, '+213555123456');
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);
      prismaMock.user.update.mockResolvedValue({
        ...customerFromDb,
        passwordHash: '$argon2id$newhash',
      } as any);

      const response = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({
          resetToken,
          newPassword: 'NewStrongPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Password updated successfully');
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CUSTOMER_ID },
          data: expect.objectContaining({ passwordHash: expect.any(String) }),
        })
      );
    });

    it('should reject invalid resetToken with 401', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({
          resetToken: 'invalid.token.here',
          newPassword: 'NewStrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid or expired reset token');
    });

    it('should reject standard auth JWT when passed as resetToken with 401', async () => {
      const authJwt = generateToken({ userId: CUSTOMER_ID, role: Role.CUSTOMER });

      const response = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({
          resetToken: authJwt,
          newPassword: 'NewStrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid or expired reset token');
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
      const token = generateToken({ userId: CUSTOMER_ID, role: Role.CUSTOMER });
      prismaMock.user.findUnique.mockResolvedValue(customerFromDb as any);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.phone).toBe('+213555123456');
    });

    it('should allow DRIVER to access a DRIVER-only route', async () => {
      const token = generateToken({ userId: DRIVER_ID, role: Role.DRIVER });

      const response = await request(app)
        .get('/api/test-driver-only')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Welcome driver');
    });

    it('should reject a CUSTOMER accessing a DRIVER-only route with 403', async () => {
      const token = generateToken({ userId: CUSTOMER_ID, role: Role.CUSTOMER });

      const response = await request(app)
        .get('/api/test-driver-only')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden: Insufficient permissions');
    });
  });
});
