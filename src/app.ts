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
    const allowed = process.env.CLIENT_URL;
    if (allowed && (allowed === '*' || origin === allowed)) {
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

// Parse JSON and URL-encoded bodies with strict limits (1MB) to protect against payload inflation DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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
