import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import jwt from 'jsonwebtoken';
import { Role, BookingStatus } from '@prisma/client';
import argon2 from 'argon2';
import { normalizePhoneNumber } from '../src/validators/phone.validator';
import { SMSService } from '../src/services/sms/sms.service';
import { SocketService } from '../src/sockets/socket.service';
import { generateVerificationToken } from '../src/utils/jwt';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CUSTOMER_ID = '123e4567-e89b-42d3-a456-426614174001';
const DRIVER_ID   = '123e4567-e89b-42d3-a456-426614174002';
const BOOKING_ID  = '123e4567-e89b-42d3-a456-426614174000';
const OTP_ID      = '123e4567-e89b-42d3-a456-426614174099';

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: CUSTOMER_ID,
    phone: '+213555123456',
    email: null,
    name: null,
    passwordHash: null,
    phoneVerified: true,
    lastLoginAt: null,
    role: Role.CUSTOMER,
    profilePhoto: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeDriverUser(overrides: Record<string, any> = {}) {
  return makeUser({ id: DRIVER_ID, role: Role.DRIVER, phone: '+213666777888', passwordHash: null, ...overrides });
}

function makeOTP(overrides: Record<string, any> = {}) {
  return {
    id: OTP_ID,
    phone: '+213555123456',
    codeHash: '$argon2id$fakehash',
    attempts: 0,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min from now
    verified: false,
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── 1. Phone Number Normalization ────────────────────────────────────────────

describe('Phone Number Normalization', () => {
  it('should convert 0555123456 to +213555123456', () => {
    expect(normalizePhoneNumber('0555123456')).toBe('+213555123456');
  });

  it('should convert 0655123456 to +213655123456', () => {
    expect(normalizePhoneNumber('0655123456')).toBe('+213655123456');
  });

  it('should convert 0755123456 to +213755123456', () => {
    expect(normalizePhoneNumber('0755123456')).toBe('+213755123456');
  });

  it('should convert 213555123456 (without +) to +213555123456', () => {
    expect(normalizePhoneNumber('213555123456')).toBe('+213555123456');
  });

  it('should leave +213555123456 unchanged', () => {
    expect(normalizePhoneNumber('+213555123456')).toBe('+213555123456');
  });

  it('should strip spaces and dashes from phone number', () => {
    expect(normalizePhoneNumber('0555 123 456')).toBe('+213555123456');
    expect(normalizePhoneNumber('0555-123-456')).toBe('+213555123456');
  });
});

// ─── 2. POST /api/auth/request-code ──────────────────────────────────────────

describe('POST /api/auth/request-code — OTP Request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create OTP and send SMS without exposing the code', async () => {
    prismaMock.oTPVerification.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.oTPVerification.create.mockResolvedValue(makeOTP() as any);
    const smsSpy = vi.spyOn(SMSService, 'sendSMS').mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/request-code')
      .send({ phone: '+213555123456' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toMatch(/verification code sent/i);
    // OTP must NEVER be returned in the response
    expect(JSON.stringify(res.body)).not.toMatch(/\d{6}/);
    // SMS must be sent
    expect(smsSpy).toHaveBeenCalledWith('+213555123456', expect.stringContaining('ZAXI verification code'));
  });

  it('should normalize Algerian number format before sending', async () => {
    prismaMock.oTPVerification.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.oTPVerification.create.mockResolvedValue(makeOTP() as any);
    const smsSpy = vi.spyOn(SMSService, 'sendSMS').mockResolvedValue(true);

    await request(app)
      .post('/api/auth/request-code')
      .send({ phone: '0555123456' });

    expect(smsSpy).toHaveBeenCalledWith('+213555123456', expect.any(String));
  });

  it('should delete previous OTPs before creating a new one', async () => {
    prismaMock.oTPVerification.deleteMany.mockResolvedValue({ count: 1 } as any);
    prismaMock.oTPVerification.create.mockResolvedValue(makeOTP() as any);
    vi.spyOn(SMSService, 'sendSMS').mockResolvedValue(true);

    await request(app)
      .post('/api/auth/request-code')
      .send({ phone: '+213555123456' });

    expect(prismaMock.oTPVerification.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ phone: '+213555123456' }) })
    );
  });

  it('should store OTP as argon2 hash (not plaintext)', async () => {
    prismaMock.oTPVerification.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.oTPVerification.create.mockResolvedValue(makeOTP() as any);
    vi.spyOn(SMSService, 'sendSMS').mockResolvedValue(true);

    await request(app)
      .post('/api/auth/request-code')
      .send({ phone: '+213555123456' });

    const createCall = prismaMock.oTPVerification.create.mock.calls[0][0];
    const storedCodeHash = createCall.data.codeHash;
    // Should be argon2 hash, not a 6-digit plaintext number
    expect(storedCodeHash).toMatch(/^\$argon2/);
  });

  it('should reject invalid phone format with 400', async () => {
    const res = await request(app)
      .post('/api/auth/request-code')
      .send({ phone: 'not-a-phone' });

    expect(res.status).toBe(400);
  });

  it('should reject missing phone with 400', async () => {
    const res = await request(app)
      .post('/api/auth/request-code')
      .set('X-Forwarded-For', '10.0.0.99')
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── 3. POST /api/auth/verify-code ───────────────────────────────────────────

describe('POST /api/auth/verify-code — OTP Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return isNewUser:true and a verificationToken for a new phone', async () => {
    const otp = makeOTP();
    prismaMock.oTPVerification.findFirst.mockResolvedValue(otp as any);
    vi.spyOn(argon2, 'verify').mockResolvedValue(true);
    prismaMock.oTPVerification.update.mockResolvedValue({ ...otp, verified: true } as any);
    prismaMock.user.findUnique.mockResolvedValue(null); // phone not yet registered

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ phone: '+213555123456', code: '483921' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.isNewUser).toBe(true);
    expect(res.body.data.verificationToken).toBeDefined();
    // verify-code must NOT return an auth JWT or user object
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.user).toBeUndefined();
    // No account should be created at this step
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    // verificationToken must be a valid short-lived JWT with type: 'phone_verified'
    const decoded: any = jwt.verify(
      res.body.data.verificationToken,
      process.env.JWT_SECRET || 'fallback_secret'
    );
    expect(decoded.phone).toBe('+213555123456');
    expect(decoded.type).toBe('phone_verified');
  });

  it('should return isNewUser:false for an existing phone (redirect to login)', async () => {
    const otp = makeOTP();
    prismaMock.oTPVerification.findFirst.mockResolvedValue(otp as any);
    vi.spyOn(argon2, 'verify').mockResolvedValue(true);
    prismaMock.oTPVerification.update.mockResolvedValue({ ...otp, verified: true } as any);
    const existingUser = makeUser();
    prismaMock.user.findUnique.mockResolvedValue(existingUser as any);

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ phone: '+213555123456', code: '483921' });

    expect(res.status).toBe(200);
    expect(res.body.data.isNewUser).toBe(false);
    // No verificationToken issued for existing users
    expect(res.body.data.verificationToken).toBeUndefined();
    // No account created, no lastLoginAt update
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('should reject wrong OTP code with 400 and increment attempts', async () => {
    const otp = makeOTP({ attempts: 0 });
    prismaMock.oTPVerification.findFirst.mockResolvedValue(otp as any);
    vi.spyOn(argon2, 'verify').mockResolvedValue(false);
    prismaMock.oTPVerification.update.mockResolvedValue({ ...otp, attempts: 1 } as any);

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ phone: '+213555123456', code: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid verification code/i);
    expect(prismaMock.oTPVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attempts: { increment: 1 } } })
    );
  });

  it('should reject expired OTP with 400', async () => {
    const expiredOtp = makeOTP({ expiresAt: new Date(Date.now() - 60000) });
    prismaMock.oTPVerification.findFirst.mockResolvedValue(expiredOtp as any);

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ phone: '+213555123456', code: '483921' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('should reject after 5 failed attempts with 400', async () => {
    const lockedOtp = makeOTP({ attempts: 5 });
    prismaMock.oTPVerification.findFirst.mockResolvedValue(lockedOtp as any);

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ phone: '+213555123456', code: '483921' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/too many/i);
  });

  it('should reject reuse of already-verified OTP', async () => {
    prismaMock.oTPVerification.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ phone: '+213555123456', code: '483921' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it('should reject invalid 6-digit code format with 400', async () => {
    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ phone: '+213555123456', code: '12345' }); // 5 digits

    expect(res.status).toBe(400);
  });

  it('should reject non-numeric code with 400', async () => {
    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ phone: '+213555123456', code: 'abcdef' });

    expect(res.status).toBe(400);
  });
});

// ─── 4. POST /api/auth/register ───────────────────────────────────────────────

describe('POST /api/auth/register — Create Passwordless Customer Account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create passwordless account and return a valid auth JWT', async () => {
    const verificationToken = generateVerificationToken('+213555123456');
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(makeUser() as any);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ verificationToken, name: 'Basma Boughendjour' });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.phone).toBe('+213555123456');
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    // Auth JWT should contain userId, role, phone
    const decoded: any = jwt.verify(res.body.data.token, process.env.JWT_SECRET || 'fallback_secret');
    expect(decoded.userId).toBeDefined();
    expect(decoded.role).toBe('CUSTOMER');
    expect(decoded.phone).toBe('+213555123456');
  });

  it('should emit auth:verified socket event after registration', async () => {
    const verificationToken = generateVerificationToken('+213555123456');
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(makeUser() as any);
    const emitSpy = vi.spyOn(SocketService, 'emitAuthVerified');

    await request(app)
      .post('/api/auth/register')
      .send({ verificationToken, name: 'Basma Boughendjour' });

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: CUSTOMER_ID, phone: '+213555123456', role: 'CUSTOMER' })
    );
  });

  it('should store passwordHash as null for passwordless customer account', async () => {
    const verificationToken = generateVerificationToken('+213555123456');
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(makeUser() as any);

    await request(app)
      .post('/api/auth/register')
      .send({ verificationToken, name: 'Basma' });

    const createCall = prismaMock.user.create.mock.calls[0][0];
    expect(createCall.data.passwordHash).toBeNull();
  });

  it('should reject a duplicate registration with 409', async () => {
    const verificationToken = generateVerificationToken('+213555123456');
    prismaMock.user.findUnique.mockResolvedValue(makeUser() as any);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ verificationToken, name: 'Basma' });

    expect(res.status).toBe(409);
  });

  it('should reject an invalid verificationToken with 401', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ verificationToken: 'bad-token', name: 'Basma' });

    expect(res.status).toBe(401);
  });
});

// ─── 5. POST /api/auth/login/request-code ────────────────────────────────────

describe('POST /api/auth/login/request-code — Login OTP Request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send a login OTP and return generic success for a registered customer', async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser() as any);
    prismaMock.oTPVerification.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.oTPVerification.create.mockResolvedValue(makeOTP() as any);
    const smsSpy = vi.spyOn(SMSService, 'sendSMS').mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login/request-code')
      .send({ phone: '+213555123456' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toMatch(/if this phone number is registered/i);
    expect(smsSpy).toHaveBeenCalledWith('+213555123456', expect.stringContaining('ZAXI login code'));
    // OTP must never be returned in the response
    expect(JSON.stringify(res.body)).not.toMatch(/\d{6}/);
  });

  it('should send a login OTP and return generic success for the driver', async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeDriverUser() as any);
    prismaMock.oTPVerification.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.oTPVerification.create.mockResolvedValue(makeOTP({ phone: '+213666777888' }) as any);
    const smsSpy = vi.spyOn(SMSService, 'sendSMS').mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login/request-code')
      .send({ phone: '+213666777888' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if this phone number is registered/i);
    expect(smsSpy).toHaveBeenCalledWith('+213666777888', expect.any(String));
  });

  it('should return 200 silently without sending OTP for an unregistered phone (prevents enumeration)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const smsSpy = vi.spyOn(SMSService, 'sendSMS').mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login/request-code')
      .send({ phone: '+213999000000' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if this phone number is registered/i);
    expect(smsSpy).not.toHaveBeenCalled();
  });
});

// ─── 6. POST /api/auth/login/verify ──────────────────────────────────────────

describe('POST /api/auth/login/verify — Login OTP Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify customer login OTP and return a valid auth JWT', async () => {
    const otp = makeOTP();
    prismaMock.oTPVerification.findFirst.mockResolvedValue(otp as any);
    vi.spyOn(argon2, 'verify').mockResolvedValue(true);
    prismaMock.oTPVerification.update.mockResolvedValue({ ...otp, verified: true } as any);
    prismaMock.user.findUnique.mockResolvedValue(makeUser() as any);
    prismaMock.user.update.mockResolvedValue(makeUser({ lastLoginAt: new Date() }) as any);

    const res = await request(app)
      .post('/api/auth/login/verify')
      .send({ phone: '+213555123456', code: '483921' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    const decoded: any = jwt.verify(res.body.data.token, process.env.JWT_SECRET || 'fallback_secret');
    expect(decoded.userId).toBeDefined();
    expect(decoded.role).toBe('CUSTOMER');
    expect(decoded.phone).toBe('+213555123456');
  });

  it('should verify driver login OTP and return JWT with role=DRIVER', async () => {
    const otp = makeOTP({ phone: '+213666777888' });
    prismaMock.oTPVerification.findFirst.mockResolvedValue(otp as any);
    vi.spyOn(argon2, 'verify').mockResolvedValue(true);
    prismaMock.oTPVerification.update.mockResolvedValue({ ...otp, verified: true } as any);
    prismaMock.user.findUnique.mockResolvedValue(makeDriverUser() as any);
    prismaMock.user.update.mockResolvedValue(makeDriverUser({ lastLoginAt: new Date() }) as any);

    const res = await request(app)
      .post('/api/auth/login/verify')
      .send({ phone: '+213666777888', code: '483921' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('DRIVER');
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject an invalid OTP code with 400 and increment attempts', async () => {
    const otp = makeOTP({ attempts: 0 });
    prismaMock.oTPVerification.findFirst.mockResolvedValue(otp as any);
    vi.spyOn(argon2, 'verify').mockResolvedValue(false);
    prismaMock.oTPVerification.update.mockResolvedValue({ ...otp, attempts: 1 } as any);

    const res = await request(app)
      .post('/api/auth/login/verify')
      .send({ phone: '+213555123456', code: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid phone or verification code/i);
    expect(prismaMock.oTPVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attempts: { increment: 1 } } })
    );
  });

  it('should reject an expired login OTP with 400', async () => {
    const expiredOtp = makeOTP({ expiresAt: new Date(Date.now() - 60000) });
    prismaMock.oTPVerification.findFirst.mockResolvedValue(expiredOtp as any);

    const res = await request(app)
      .post('/api/auth/login/verify')
      .send({ phone: '+213555123456', code: '483921' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('should reject after 5 failed attempts with 400', async () => {
    const lockedOtp = makeOTP({ attempts: 5 });
    prismaMock.oTPVerification.findFirst.mockResolvedValue(lockedOtp as any);

    const res = await request(app)
      .post('/api/auth/login/verify')
      .send({ phone: '+213555123456', code: '483921' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/too many/i);
  });

  it('should reject a reused/non-existent OTP with 400', async () => {
    prismaMock.oTPVerification.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login/verify')
      .send({ phone: '+213555123456', code: '483921' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid phone or verification code/i);
  });
});

// ─── 7. Privacy — Phone Number Visibility ────────────────────────────────────

describe('Phone Privacy — Driver/Customer visibility', () => {
  let customerToken: string;
  let otherToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    customerToken = jwt.sign(
      { userId: CUSTOMER_ID, role: Role.CUSTOMER, phone: '+213555123456' },
      process.env.JWT_SECRET || 'fallback_secret'
    );
    otherToken = jwt.sign(
      { userId: '999-other', role: Role.CUSTOMER, phone: '+213000000000' },
      process.env.JWT_SECRET || 'fallback_secret'
    );
  });

  it('should NOT expose driver phone on PENDING booking', async () => {
    const pendingBooking = {
      id: BOOKING_ID,
      status: BookingStatus.PENDING,
      customerId: CUSTOMER_ID,
      driverId: null,
      driver: null,
      pickupAddress: 'BBA',
      destinationAddress: 'Airport',
      pickupLatitude: 36.75,
      pickupLongitude: 3.04,
      destinationLatitude: 36.8,
      destinationLongitude: 3.06,
      distanceKm: 15,
      estimatedPrice: 2000,
      durationMinutes: 25,
      pricingType: 'DISTANCE',
      scheduledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.booking.findUnique.mockResolvedValue(pendingBooking as any);

    const res = await request(app)
      .get(`/api/bookings/${BOOKING_ID}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.booking.driver).toBeNull();
  });

  it('should expose driver phone on ACCEPTED booking', async () => {
    const acceptedBooking = {
      id: BOOKING_ID,
      status: BookingStatus.ACCEPTED,
      customerId: CUSTOMER_ID,
      driverId: DRIVER_ID,
      driver: { id: DRIVER_ID, name: 'Karim', phone: '+213666777888' },
      pickupAddress: 'BBA',
      destinationAddress: 'Airport',
      pickupLatitude: 36.75,
      pickupLongitude: 3.04,
      destinationLatitude: 36.8,
      destinationLongitude: 3.06,
      distanceKm: 15,
      estimatedPrice: 2000,
      durationMinutes: 25,
      pricingType: 'DISTANCE',
      scheduledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.booking.findUnique.mockResolvedValue(acceptedBooking as any);

    const res = await request(app)
      .get(`/api/bookings/${BOOKING_ID}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.booking.driver).not.toBeNull();
    expect(res.body.data.booking.driver.phone).toBe('+213666777888');
  });

  it('should return 404 for other customers accessing private booking', async () => {
    const booking = {
      id: BOOKING_ID,
      status: BookingStatus.PENDING,
      customerId: CUSTOMER_ID,
      driverId: null,
    };
    prismaMock.booking.findUnique.mockResolvedValue(booking as any);

    const res = await request(app)
      .get(`/api/bookings/${BOOKING_ID}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
  });
});
