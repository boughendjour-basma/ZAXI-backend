import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import {
  registerSchema,
  loginSchema,
  forgotPasswordVerifySchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

export class AuthController {
  /**
   * POST /api/auth/register
   * Body: { phone, name, dateOfBirth, password }
   * Returns an auth JWT immediately after account creation.
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await AuthService.register(validatedData);
      res.status(201).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Body: { phone, password }
   * Returns auth JWT + user profile.
   * Works for both CUSTOMER and DRIVER.
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await AuthService.login(validatedData);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/forgot-password/verify
   * Body: { phone, name, dateOfBirth }
   * Verifies identity and returns short-lived resetToken.
   */
  static async forgotPasswordVerify(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = forgotPasswordVerifySchema.parse(req.body);
      const result = await AuthService.forgotPasswordVerify(validatedData);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/forgot-password/reset
   * Body: { resetToken, newPassword }
   * Resets password using resetToken.
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      const result = await AuthService.resetPassword(validatedData);
      res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const user = await AuthService.getCurrentUser(req.user.userId);
      res.status(200).json({ status: 'success', data: { user } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(_req: Request, res: Response, _next: NextFunction) {
    res.status(200).json({
      status: 'success',
      message: 'Successfully logged out. Please remove the token from your client.',
    });
  }
}

