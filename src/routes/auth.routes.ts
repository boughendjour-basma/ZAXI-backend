import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Rate limiter for OTP endpoints: max 5 requests per 15 minutes
// Bypassed in test environment to avoid inter-test collisions
const otpLimiter =
  process.env.NODE_ENV === 'test'
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

// ─── Sign-Up Flow ─────────────────────────────────────────────────────────────
// Step 1: request-code → Step 2: verify-code → Step 3: register
router.post('/request-code', otpLimiter, AuthController.requestCode);
router.post('/verify-code', AuthController.verifyCode);
router.post('/register', AuthController.register);

// ─── Normal Login / Session ───────────────────────────────────────────────────
router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.getCurrentUser);
router.post('/logout', authenticate, AuthController.logout);

// ─── Password Recovery ────────────────────────────────────────────────────────
router.post('/forgot-password/request-code', otpLimiter, AuthController.forgotPasswordRequestCode);
router.post('/forgot-password/reset', AuthController.resetPassword);

export default router;
