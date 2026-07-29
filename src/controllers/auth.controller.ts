import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { requestCodeSchema, verifyCodeSchema } from '../validators/phone.validator';

export class AuthController {
  /**
   * POST /api/auth/request-code
   * Request an SMS OTP verification code.
   */
  static async requestCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = requestCodeSchema.parse(req.body);
      const result = await AuthService.requestCode(phone);

      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/verify-code
   * Verify SMS OTP code and log in / create user.
   */
  static async verifyCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, code } = verifyCodeSchema.parse(req.body);
      const result = await AuthService.verifyCode(phone, code);

      res.status(200).json({
        status: 'success',
        data: {
          accessToken: result.token,
          token: result.token,
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/register (Legacy/Compatibility)
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await AuthService.register(validatedData);

      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login (Legacy/Compatibility)
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await AuthService.login(validatedData);

      res.status(200).json({
        status: 'success',
        data: result,
      });
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

      res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response, next: NextFunction) {
    res.status(200).json({
      status: 'success',
      message: 'Successfully logged out. Please remove the token from your client.',
    });
  }
}
