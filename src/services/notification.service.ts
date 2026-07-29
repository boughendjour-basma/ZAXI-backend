import prisma from '../config/database';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
}

export class NotificationService {
  /**
   * Creates and persists a notification for a user.
   * Called internally by booking lifecycle hooks.
   */
  static async create(data: CreateNotificationInput) {
    return prisma.notification.create({ data });
  }

  /**
   * List notifications for a user, newest first.
   * Unread notifications appear first.
   */
  static async list(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Marks a single notification as read.
   * Scoped to the user who owns it.
   */
  static async markRead(userId: string, notificationId: string) {
    const existing = await prisma.notification.findUnique({ where: { id: notificationId } });

    if (!existing || existing.userId !== userId) {
      const error: any = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  /**
   * Marks all unread notifications as read for a user.
   */
  static async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { updated: result.count };
  }
}
