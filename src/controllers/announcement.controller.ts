import { Request, Response, NextFunction } from 'express';
import { AnnouncementService } from '../services/announcement.service';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  listAnnouncementsQuerySchema,
} from '../validators/announcement.validator';

export class AnnouncementController {
  /**
   * POST /api/driver/announcements
   * Creates a new announcement. Protected: DRIVER only.
   */
  static async createAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = (req as any).user.id;
      const validatedData = createAnnouncementSchema.parse(req.body);
      const announcement = await AnnouncementService.createAnnouncement(driverId, validatedData);
      res.status(201).json(announcement);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/driver/announcements/:id
   * Updates an existing announcement. Protected: DRIVER only.
   */
  static async updateAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = (req as any).user.id;
      const id = req.params['id'] as string;
      const validatedData = updateAnnouncementSchema.parse(req.body);
      const updated = await AnnouncementService.updateAnnouncement(driverId, id, validatedData);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/driver/announcements/:id
   * Soft-deletes an announcement (sets isActive=false). Protected: DRIVER only.
   */
  static async deleteAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = (req as any).user.id;
      const id = req.params['id'] as string;
      await AnnouncementService.deleteAnnouncement(driverId, id);
      res.status(200).json({ message: 'Announcement removed successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/public/announcements
   * Retrieves paginated active announcements for customers. No auth required.
   */
  static async getAnnouncements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, category } = listAnnouncementsQuerySchema.parse(req.query);
      const result = await AnnouncementService.getActiveAnnouncements({ page, limit, category });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
