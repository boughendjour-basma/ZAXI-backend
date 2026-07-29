import prisma from '../config/database';

export interface LogActionInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, any> | null;
}

export class AuditLogService {
  /**
   * Persists an audit log entry for system or administrative actions.
   */
  static async logAction(data: LogActionInput) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: data.userId ?? null,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId ?? null,
          metadata: data.metadata ?? undefined,
        },
      });
    } catch (error) {
      console.error('[AuditLog] Failed to record audit log:', error);
      // Non-blocking for the primary operation
      return null;
    }
  }

  /**
   * Retrieves paginated audit logs with optional filtering.
   */
  static async list(filters: { page: number; limit: number; action?: string; entity?: string; userId?: string }) {
    const { page, limit, action, entity, userId } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, phone: true, role: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
