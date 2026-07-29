import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import { Role } from '@prisma/client';
import argon2 from 'argon2';
import { generateToken } from '../src/utils/jwt';
import { requireRole, authenticate } from '../src/middleware/auth.middleware';

// Add a test-only route to test role authorization
app.get('/api/test-driver-only', authenticate, requireRole(Role.DRIVER), (req, res) => {
  res.status(200).json({ status: 'success', message: 'Welcome driver' });
});

describe('Authentication API', () => {
  const validRegisterData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    password: 'password123',
  };

  const userFromDb = {
    id: 'user-1',
    email: 'john@example.com',
    name: 'John Doe',
    phone: '+213555123456',
    passwordHash: 'hashedpassword',
    phoneVerified: false,
    lastLoginAt: null,
    role: Role.CUSTOMER,
    profilePhoto: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const driverFromDb = {
    id: 'driver-1',
    email: 'driver@example.com',
    name: 'Driver Joe',
    phone: '+213987654321',
    passwordHash: 'hashedpassword',
    phoneVerified: false,
    lastLoginAt: null,
    role: Role.DRIVER,
    profilePhoto: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new customer successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      
      const safeUser = { ...userFromDb };
      // @ts-ignore
      delete safeUser.passwordHash;
      
      prismaMock.user.create.mockResolvedValue(safeUser as any);
      vi.spyOn(argon2, 'hash').mockResolvedValue('hashedpassword');

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe(Role.CUSTOMER);
      
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: Role.CUSTOMER }),
        })
      );
    });

    it('should prevent duplicate email registration', async () => {
      prismaMock.user.findUnique.mockResolvedValue(userFromDb);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Email is already registered');
    });

    it('should reject invalid registration data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login customer successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(userFromDb);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.token).toBeDefined();
    });

    it('should login driver successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(driverFromDb);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'driver@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe(Role.DRIVER);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject invalid credentials (wrong password)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(userFromDb);
      vi.spyOn(argon2, 'verify').mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should reject invalid credentials (user not found)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('Authentication & Authorization Middleware', () => {
    it('should reject missing JWT', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authentication required');
    });

    it('should reject invalid JWT', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('should access protected route with valid token', async () => {
      const token = generateToken({ userId: 'user-1', role: Role.CUSTOMER });
      
      const safeUser = { ...userFromDb };
      // @ts-ignore
      delete safeUser.passwordHash;
      prismaMock.user.findUnique.mockResolvedValue(safeUser as any);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('john@example.com');
    });

    it('should allow DRIVER to access DRIVER-only route', async () => {
      const token = generateToken({ userId: 'driver-1', role: Role.DRIVER });

      const response = await request(app)
        .get('/api/test-driver-only')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Welcome driver');
    });

    it('should reject CUSTOMER accessing DRIVER-only route', async () => {
      const token = generateToken({ userId: 'user-1', role: Role.CUSTOMER });

      const response = await request(app)
        .get('/api/test-driver-only')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden: Insufficient permissions');
    });
  });
});
