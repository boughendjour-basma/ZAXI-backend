import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { paginationQuerySchema } from '../validators/customer.validator';

export class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const { page, limit } = paginationQuerySchema.parse(req.query);

      const result = await NotificationService.list(userId, page, limit);

      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const id = req.params.id as string;

      const notification = await NotificationService.markRead(userId, id);

      res.status(200).json({ status: 'success', data: { notification } });
    } catch (error) {
      next(error);
    }
  }

  static async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const result = await NotificationService.markAllRead(userId);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }
}
