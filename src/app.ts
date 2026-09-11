import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { loggerMiddleware } from './middleware/logger.middleware';
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import bookingRoutes from './routes/booking.routes';
import driverRoutes from './routes/driver.routes';
import driverBookingRoutes from './routes/driver-booking.routes';
import publicRoutes from './routes/public.routes';
import driverManagementRoutes from './routes/driver-management.routes';

import { setupSwagger } from './docs/swagger';
import prisma from './config/database';

const app: Express = express();

// Request logging middleware
app.use(loggerMiddleware);

// Setup Swagger API Documentation at /api/docs
setupSwagger(app);

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    const clientUrl = process.env.CLIENT_URL?.trim();
    const corsOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
      : [];
    const allowedList = [clientUrl, ...corsOrigins].filter(Boolean) as string[];

    // Normalize origins by removing trailing slashes for comparison
    const normalizedOrigin = origin.replace(/\/+$/, '');
    const isAllowed = allowedList.some((allowed) => {
      if (allowed === '*') return true;
      return allowed.replace(/\/+$/, '') === normalizedOrigin;
    });

    if (isAllowed || allowedList.length === 0) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate Limiting — set higher threshold to support 5s polling from active client/driver dashboards
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: process.env.NODE_ENV === 'production' ? 2000 : 10000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(limiter);

// Parse JSON and URL-encoded bodies (up to 15MB for vehicle photos and documents)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Basic health check route
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Deployment readiness probe
app.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unavailable',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/driver/bookings', driverBookingRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/driver', driverManagementRoutes);
app.use('/api/public', publicRoutes);

// Centralized Error Handling
app.use(errorHandler);

export default app;
