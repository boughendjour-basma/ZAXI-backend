import { Request, Response, NextFunction } from 'express';
import { RatingService } from '../services/rating.service';
import { createRatingSchema } from '../validators/customer.validator';

export class RatingController {
  static async createRating(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const bookingId = req.params.id as string;
      const { score, comment } = createRatingSchema.parse(req.body);

      const rating = await RatingService.createRating(userId, bookingId, score, comment);

      res.status(201).json({
        status: 'success',
        message: 'Rating submitted successfully',
        data: { rating },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRating(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const bookingId = req.params.id as string;

      const rating = await RatingService.getRating(userId, bookingId);

      res.status(200).json({ status: 'success', data: { rating } });
    } catch (error) {
      next(error);
    }
  }
}
