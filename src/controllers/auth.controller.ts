import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema, resetPasswordSchema } from '../validators/auth.validator';
import { requestCodeSchema, verifyCodeSchema } from '../validators/phone.validator';

export class AuthController {
  /**
   * POST /api/auth/request-code
   * Step 1 of sign-up: send OTP to phone.
   */
  static async requestCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = requestCodeSchema.parse(req.body);
      const result = await AuthService.requestCode(phone);
      res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/verify-code
   * Step 2 of sign-up: verify OTP.
   * New phone  → 200 { isNewUser: true, verificationToken }
   * Existing   → 200 { isNewUser: false }
   */
  static async verifyCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, code } = verifyCodeSchema.parse(req.body);
      const result = await AuthService.verifyCode(phone, code);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/register
   * Step 3 of sign-up: create account using the verificationToken.
   * Body: { verificationToken, name, password }
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
   * Normal login for both CUSTOMER and DRIVER. Never sends OTP.
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
   * Stateless logout — instructs the client to discard the JWT.
   */
  static async logout(_req: Request, res: Response, _next: NextFunction) {
    res.status(200).json({
      status: 'success',
      message: 'Successfully logged out. Please remove the token from your client.',
    });
  }

  /**
   * POST /api/auth/forgot-password/request-code
   * Sends a reset OTP. Returns success regardless of whether the phone is registered.
   */
  static async forgotPasswordRequestCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = requestCodeSchema.parse(req.body);
      const result = await AuthService.forgotPasswordRequestCode(phone);
      res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/forgot-password/reset
   * Body: { phone, code, newPassword }
   * Verifies OTP and replaces the password hash.
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
}
