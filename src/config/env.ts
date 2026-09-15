import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV if not already loaded
const envFile = process.env.NODE_ENV === 'test'
  ? '.env.test'
  : process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env';

dotenv.config({ path: envFile });

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  SOCKET_PORT: z.coerce.number().optional().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  SMS_PROVIDER: z.enum(['mock', 'twilio']).default('mock'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  OSRM_ROUTING_URL: z.string().url().default('https://router.project-osrm.org'),
  GOOGLE_MAPS_API_KEY: z.string().optional(),

  CORS_ORIGINS: z.string().default('*'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(customEnv?: Record<string, any>): EnvConfig {
  const result = envSchema.safeParse(customEnv || process.env);

  if (!result.success) {
    console.error('❌ Invalid Environment Variables Configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error('Environment variable validation failed');
  }

  return result.data;
}

export const env = validateEnv();
