import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginRequestCodeSchema, loginVerifySchema } from '../validators/auth.validator';
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
   * Step 3 of sign-up: create CUSTOMER account using the verificationToken.
   * Body: { verificationToken, name }
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
   * POST /api/auth/login/request-code
   * Step 1 of login: request a login OTP for any registered phone (customer or driver).
   * Always returns generic success — never reveals whether the phone is registered.
   */
  static async loginRequestCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = loginRequestCodeSchema.parse(req.body);
      const result = await AuthService.loginRequestCode(phone);
      res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login/verify
   * Step 2 of login: verify the login OTP and return auth JWT + user profile.
   * Works identically for CUSTOMER and DRIVER.
   */
  static async loginVerify(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, code } = loginVerifySchema.parse(req.body);
      const result = await AuthService.loginVerify(phone, code);
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
}
