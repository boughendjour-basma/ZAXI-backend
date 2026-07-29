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
  origin: process.env.CLIENT_URL || '*', // Update this in production
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(limiter);

// Parse JSON bodies
app.use(express.json());

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
