import { Request, Response, NextFunction } from 'express';
import { FavoriteService } from '../services/favorite.service';
import { createFavoriteSchema, updateFavoriteSchema } from '../validators/customer.validator';

export class FavoriteController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const favorites = await FavoriteService.list(userId);
      res.status(200).json({ status: 'success', data: { favorites } });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const data = createFavoriteSchema.parse(req.body);
      const favorite = await FavoriteService.create(userId, data);
      res.status(201).json({ status: 'success', data: { favorite } });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const id = req.params.id as string;
      const data = updateFavoriteSchema.parse(req.body);
      const favorite = await FavoriteService.update(userId, id, data);
      res.status(200).json({ status: 'success', data: { favorite } });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const id = req.params.id as string;
      const result = await FavoriteService.remove(userId, id);
      res.status(200).json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  }
}
