import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Rate limiter for auth endpoints: max 50 requests per 15 minutes
const authLimiter =
  process.env.NODE_ENV === 'test'
    ? (_req: any, _res: any, next: any) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 50,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: {
          status: 'error',
          message: 'Too many authentication attempts. Please try again after 15 minutes',
        },
      });

// Strict rate limiter for forgot password verification: max 5 requests per 15 minutes
const forgotPasswordLimiter =
  process.env.NODE_ENV === 'test'
    ? (_req: any, _res: any, next: any) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 5,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: {
          status: 'error',
          message: 'Too many verification attempts. Please try again after 15 minutes',
        },
      });

// ─── Password Authentication ──────────────────────────────────────────────────
router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);

// ─── Password Recovery ────────────────────────────────────────────────────────
router.post('/forgot-password/verify', forgotPasswordLimiter, AuthController.forgotPasswordVerify);
router.post('/forgot-password/reset', authLimiter, AuthController.resetPassword);

// ─── Session ──────────────────────────────────────────────────────────────────
router.get('/me', authenticate, AuthController.getCurrentUser);
router.post('/logout', authenticate, AuthController.logout);

export default router;

