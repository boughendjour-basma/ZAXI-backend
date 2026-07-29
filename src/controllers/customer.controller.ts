import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';
import { updateProfileSchema, changePasswordSchema } from '../validators/customer.validator';

export class CustomerController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const user = await CustomerService.getProfile(req.user.userId);
      
      res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      // Validates and strictly prevents forbidden fields
      const validatedData = updateProfileSchema.parse(req.body);
      
      const updatedUser = await CustomerService.updateProfile(req.user.userId, validatedData);
      
      res.status(200).json({
        status: 'success',
        data: { user: updatedUser },
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const validatedData = changePasswordSchema.parse(req.body);
      
      const result = await CustomerService.changePassword(req.user.userId, validatedData);
      
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
