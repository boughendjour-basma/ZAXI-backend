import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { validateEnv } from '../src/config/env';
import { createDatabaseBackup } from '../scripts/database-backup';
import { QueueManager } from '../src/jobs';
import { prismaMock } from './setup';

describe('Step 14 — Production Deployment, Ops & DevOps Infrastructure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. Health & Readiness Probes ─────────────────────────────────────────
  describe('System Health & Readiness Probes', () => {
    it('GET /health returns uptime and 200 OK', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /ready returns 200 ready when DB is connected', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as any);

      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.database).toBe('connected');
    });

    it('GET /ready returns 503 unavailable when DB connection fails', async () => {
      prismaMock.$queryRaw.mockRejectedValue(new Error('Connection lost'));

      const res = await request(app).get('/ready');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unavailable');
      expect(res.body.database).toBe('disconnected');
    });
  });

  // ─── 2. Environment Configuration Validation ─────────────────────────────
  describe('Environment Configuration System', () => {
    it('validates environment schema successfully with valid options', () => {
      const config = validateEnv({
        NODE_ENV: 'test',
        PORT: 3000,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: '32_bytes_super_secret_jwt_key_testing',
        SMS_PROVIDER: 'mock',
      });

      expect(config.NODE_ENV).toBe('test');
      expect(config.PORT).toBe(3000);
      expect(config.SMS_PROVIDER).toBe('mock');
    });

    it('throws error when critical required environment variables are missing', () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'production',
          // Missing DATABASE_URL and short JWT_SECRET
          JWT_SECRET: 'short',
        })
      ).toThrow();
    });
  });

  // ─── 3. OpenAPI / Swagger Documentation ──────────────────────────────────
  describe('API Documentation', () => {
    it('GET /api/docs.json serves valid OpenAPI specification JSON', async () => {
      const res = await request(app).get('/api/docs.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.0');
      expect(res.body.info.title).toMatch(/ZAXI/i);
    });
  });

  // ─── 4. Database Backup Script ──────────────────────────────────────────
  describe('Database Backup System', () => {
    it('creates database backup file with timestamp in backups directory', async () => {
      const result = await createDatabaseBackup({
        outputDir: './test-backups',
      });

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.sizeBytes).toBeGreaterThan(0);
    });
  });

  // ─── 5. Background Jobs System ──────────────────────────────────────────
  describe('Background Queue Manager', () => {
    it('enqueues jobs and reports queue status', async () => {
      const res = await QueueManager.enqueue('NOTIFICATION_DISPATCH', { userId: '123' });
      expect(res.enqueued).toBe(true);

      const status = QueueManager.getStatus();
      expect(status).toHaveProperty('isProcessing');
      expect(status).toHaveProperty('pendingJobs');
    });
  });
});
