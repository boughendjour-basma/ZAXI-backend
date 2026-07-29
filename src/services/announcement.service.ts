import prisma from '../config/database';
import { AnnouncementCategory } from '@prisma/client';
import { SocketService } from '../sockets/socket.service';

export interface CreateAnnouncementInput {
  title: string;
  description: string;
  category: AnnouncementCategory;
  price?: number | null;
  image?: string | null;
  departureLocation?: string | null;
  destinationLocation?: string | null;
  availableDate?: string | null;
}

export interface UpdateAnnouncementInput {
  title?: string;
  description?: string;
  category?: AnnouncementCategory;
  price?: number | null;
  image?: string | null;
  departureLocation?: string | null;
  destinationLocation?: string | null;
  availableDate?: string | null;
}

export interface GetAnnouncementsFilters {
  page: number;
  limit: number;
  category?: AnnouncementCategory;
}

export class AnnouncementService {
  /**
   * Creates a new announcement for the driver.
   * Emits a real-time 'announcement:new' Socket.IO event to all connected clients.
   */
  static async createAnnouncement(driverId: string, data: CreateAnnouncementInput) {
    const announcement = await prisma.announcement.create({
      data: {
        driverId,
        title: data.title,
        description: data.description,
        category: data.category,
        price: data.price ?? null,
        image: data.image ?? null,
        departureLocation: data.departureLocation ?? null,
        destinationLocation: data.destinationLocation ?? null,
        availableDate: data.availableDate ? new Date(data.availableDate) : null,
        isActive: true,
      },
    });

    // Emit real-time event to all connected clients
    SocketService.emitAnnouncementNew(this.toPublicShape(announcement));

    return announcement;
  }

  /**
   * Updates an existing announcement. Only the owner driver may update it.
   * Emits a real-time 'announcement:updated' Socket.IO event.
   */
  static async updateAnnouncement(driverId: string, announcementId: string, data: UpdateAnnouncementInput) {
    // Verify ownership
    const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!existing || existing.driverId !== driverId) {
      const error: any = new Error('Announcement not found');
      error.statusCode = 404;
      throw error;
    }

    if (!existing.isActive) {
      const error: any = new Error('Cannot update a deleted announcement');
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.image !== undefined ? { image: data.image } : {}),
        ...(data.departureLocation !== undefined ? { departureLocation: data.departureLocation } : {}),
        ...(data.destinationLocation !== undefined ? { destinationLocation: data.destinationLocation } : {}),
        ...(data.availableDate !== undefined ? { availableDate: data.availableDate ? new Date(data.availableDate) : null } : {}),
      },
    });

    // Emit real-time event
    SocketService.emitAnnouncementUpdated(this.toPublicShape(updated));

    return updated;
  }

  /**
   * Soft-deletes an announcement by setting isActive=false.
   * Only the owner driver may delete it.
   * Emits a real-time 'announcement:removed' Socket.IO event.
   */
  static async deleteAnnouncement(driverId: string, announcementId: string) {
    const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!existing || existing.driverId !== driverId) {
      const error: any = new Error('Announcement not found');
      error.statusCode = 404;
      throw error;
    }

    const deleted = await prisma.announcement.update({
      where: { id: announcementId },
      data: { isActive: false },
    });

    // Emit real-time event
    SocketService.emitAnnouncementRemoved(announcementId);

    return deleted;
  }

  /**
   * Retrieves paginated active announcements for customers.
   * Supports optional category filtering.
   */
  static async getActiveAnnouncements(filters: GetAnnouncementsFilters) {
    const { page, limit, category } = filters;
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      ...(category ? { category } : {}),
    };

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          price: true,
          image: true,
          departureLocation: true,
          destinationLocation: true,
          availableDate: true,
          createdAt: true,
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    return {
      announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Map announcement to a public-safe shape for Socket.IO broadcast. */
  private static toPublicShape(announcement: any) {
    return {
      id: announcement.id,
      title: announcement.title,
      description: announcement.description,
      category: announcement.category,
      price: announcement.price,
      image: announcement.image,
      departureLocation: announcement.departureLocation,
      destinationLocation: announcement.destinationLocation,
      availableDate: announcement.availableDate,
    };
  }
}
