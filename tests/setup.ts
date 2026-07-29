import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { vi, beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

// Create a deep mock of PrismaClient
const prismaMock = mockDeep<PrismaClient>();

// Mock the database module so that any import of it returns our mock
vi.mock('../src/config/database', () => {
  return {
    __esModule: true,
    default: prismaMock,
    prisma: prismaMock,
  };
});

beforeEach(() => {
  // Reset the mock before each test
  mockReset(prismaMock);
});

export { prismaMock };
