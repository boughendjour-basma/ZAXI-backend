import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './setup';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AuditLogService } from '../src/services/audit-log.service';

const DRIVER_ID = '123e4567-e89b-42d3-a456-426614174002';

const driverToken = jwt.sign(
  { userId: DRIVER_ID, role: Role.DRIVER, phone: '+213666777888' },
  process.env.JWT_SECRET || 'fallback_secret'
);

describe('Step 13 — System Audit Logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records audit log when driver updates pricing settings', async () => {
    prismaMock.pricingSettings.upsert.mockResolvedValue({
      id: 1,
      cityFlatFare: 200,
      outsideRatePerKm: 50,
      updatedAt: new Date(),
    } as any);

    prismaMock.auditLog.create.mockResolvedValue({
      id: 'log-1',
      action: 'DRIVER_PRICING_UPDATED',
      entity: 'PricingSettings',
      entityId: '1',
      createdAt: new Date(),
    } as any);

    const res = await request(app)
      .patch('/api/driver/pricing')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ cityFlatFare: 200, outsideRatePerKm: 50 });

    expect(res.status).toBe(200);
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'DRIVER_PRICING_UPDATED',
          entity: 'PricingSettings',
        }),
      })
    );
  });

  it('GET /api/driver/audit-logs lists audit logs for the driver', async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        action: 'DRIVER_STATUS_TOGGLED',
        entity: 'User',
        entityId: DRIVER_ID,
        userId: DRIVER_ID,
        createdAt: new Date(),
        user: { id: DRIVER_ID, name: 'Driver', phone: '+213666777888', role: Role.DRIVER },
      },
    ] as any);
    prismaMock.auditLog.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/driver/audit-logs?page=1&limit=10')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].action).toBe('DRIVER_STATUS_TOGGLED');
  });

  it('safely handles audit log creation errors without breaking main flow', async () => {
    prismaMock.auditLog.create.mockRejectedValue(new Error('DB failure'));

    const result = await AuditLogService.logAction({
      action: 'TEST_ACTION',
      entity: 'TestEntity',
    });

    expect(result).toBeNull();
  });
});
