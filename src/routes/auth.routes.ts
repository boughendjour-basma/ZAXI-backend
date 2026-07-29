import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Rate limiter for OTP requests: max 5 requests per 15 minutes
// Disabled in test environment to avoid inter-test collisions
const otpLimiter = process.env.NODE_ENV === 'test'
  ? (_req: any, _res: any, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 5,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        status: 'error',
        message: 'Too many OTP requests. Please try again after 15 minutes',
      },
    });

// Public OTP routes
router.post('/request-code', otpLimiter, AuthController.requestCode);
router.post('/verify-code', AuthController.verifyCode);

// Public legacy routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes
router.get('/me', authenticate, AuthController.getCurrentUser);
router.post('/logout', authenticate, AuthController.logout);

export default router;
