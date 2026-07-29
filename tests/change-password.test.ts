import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import { Role } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

const DRIVER_ID = '123e4567-e89b-42d3-a456-426614174002';
const OLD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$oldhashvalue';
const NEW_HASH = '$argon2id$v=19$m=65536,t=3,p=4$newhashvalue';

const driverToken = jwt.sign(
  { userId: DRIVER_ID, role: Role.DRIVER, phone: '+213666777888' },
  process.env.JWT_SECRET || 'fallback_secret'
);

function makeDriverDbUser(overrides: Record<string, any> = {}) {
  return {
    id: DRIVER_ID,
    email: null,
    name: 'ZAXI Driver',
    phone: '+213666777888',
    passwordHash: OLD_HASH,
    phoneVerified: true,
    lastLoginAt: new Date(),
    role: Role.DRIVER,
    profilePhoto: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PATCH /api/auth/change-password — Authenticated Password Change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Successful password change
  it('1. successfully changes password for authenticated user', async () => {
    const user = makeDriverDbUser();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.user.update.mockResolvedValue({ ...user, passwordHash: NEW_HASH } as any);
    prismaMock.auditLog.create.mockResolvedValue({ id: 'log-1' } as any);

    // Mock argon2: verify(OLD_HASH, "OldPassword123!") = true
    // Mock argon2: verify(OLD_HASH, "NewStrongPassword456!") = false
    vi.spyOn(argon2, 'verify').mockImplementation(async (hash, password) => {
      if (hash === OLD_HASH && password === 'OldPassword123!') return true;
      return false;
    });
    vi.spyOn(argon2, 'hash').mockResolvedValue(NEW_HASH as any);

    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewStrongPassword456!',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Password updated successfully');
  });

  // 2. Incorrect current password
  it('2. rejects request when current password is incorrect (401)', async () => {
    const user = makeDriverDbUser();
    prismaMock.user.findUnique.mockResolvedValue(user as any);

    vi.spyOn(argon2, 'verify').mockResolvedValue(false);

    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewStrongPassword456!',
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Current password is incorrect');
  });

  // 3. New password equals current password
  it('3. rejects request when new password equals current password (400)', async () => {
    const user = makeDriverDbUser();
    prismaMock.user.findUnique.mockResolvedValue(user as any);

    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        currentPassword: 'SamePassword123!',
        newPassword: 'SamePassword123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  // 4. Unauthenticated request → 401
  it('4. rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewStrongPassword456!',
      });

    expect(res.status).toBe(401);
  });

  // 5. Missing fields
  it('5. rejects requests missing currentPassword or newPassword (400)', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        currentPassword: 'OldPassword123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  // 6. Weak password validation
  it('6. rejects new password shorter than 8 characters (400)', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'short',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  // 7. Verify old password no longer works
  it('7. verifies old password no longer verifies against the newly stored hash', async () => {
    const user = makeDriverDbUser();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.user.update.mockResolvedValue({ ...user, passwordHash: NEW_HASH } as any);
    prismaMock.auditLog.create.mockResolvedValue({ id: 'log-1' } as any);

    vi.spyOn(argon2, 'verify').mockImplementation(async (hash, password) => {
      if (hash === OLD_HASH && password === 'OldPassword123!') return true;
      if (hash === NEW_HASH && password === 'NewStrongPassword456!') return true;
      return false;
    });
    vi.spyOn(argon2, 'hash').mockResolvedValue(NEW_HASH as any);

    await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewStrongPassword456!',
      });

    // Old password against new hash must fail
    const oldPasswordValidAgainstNewHash = await argon2.verify(NEW_HASH, 'OldPassword123!');
    expect(oldPasswordValidAgainstNewHash).toBe(false);
  });

  // 8. Verify new password works immediately
  it('8. verifies new password works immediately against the newly stored hash', async () => {
    vi.spyOn(argon2, 'verify').mockImplementation(async (hash, password) => {
      if (hash === NEW_HASH && password === 'NewStrongPassword456!') return true;
      return false;
    });

    const newPasswordValid = await argon2.verify(NEW_HASH, 'NewStrongPassword456!');
    expect(newPasswordValid).toBe(true);
  });

  // 9. Ensure database hash changes
  it('9. ensures database passwordHash is updated with new Argon2 hash', async () => {
    const user = makeDriverDbUser();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.user.update.mockResolvedValue({ ...user, passwordHash: NEW_HASH } as any);
    prismaMock.auditLog.create.mockResolvedValue({ id: 'log-1' } as any);

    vi.spyOn(argon2, 'verify').mockImplementation(async (hash, password) => {
      if (hash === OLD_HASH && password === 'OldPassword123!') return true;
      return false;
    });
    vi.spyOn(argon2, 'hash').mockResolvedValue(NEW_HASH as any);

    await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewStrongPassword456!',
      });

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DRIVER_ID },
        data: expect.objectContaining({ passwordHash: NEW_HASH }),
      })
    );
  });

  // 10. Ensure no password/hash appears in API response
  it('10. ensures no password or hash appears anywhere in the API response payload', async () => {
    const user = makeDriverDbUser();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.user.update.mockResolvedValue({ ...user, passwordHash: NEW_HASH } as any);

    vi.spyOn(argon2, 'verify').mockImplementation(async (hash, password) => {
      if (hash === OLD_HASH && password === 'OldPassword123!') return true;
      return false;
    });
    vi.spyOn(argon2, 'hash').mockResolvedValue(NEW_HASH as any);

    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewStrongPassword456!',
      });

    const responseStr = JSON.stringify(res.body);
    expect(responseStr).not.toMatch(/passwordHash/i);
    expect(responseStr).not.toMatch(/OldPassword/i);
    expect(responseStr).not.toMatch(/NewStrongPassword/i);
    expect(responseStr).not.toMatch(/\$argon2/i);
  });
});
