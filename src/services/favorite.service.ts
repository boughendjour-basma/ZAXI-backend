import prisma from '../config/database';

export interface CreateFavoriteInput {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface UpdateFavoriteInput {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export class FavoriteService {
  static async list(userId: string) {
    return prisma.favoriteLocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async create(userId: string, data: CreateFavoriteInput) {
    return prisma.favoriteLocation.create({
      data: { userId, ...data },
    });
  }

  static async update(userId: string, favoriteId: string, data: UpdateFavoriteInput) {
    const existing = await prisma.favoriteLocation.findUnique({ where: { id: favoriteId } });
    if (!existing || existing.userId !== userId) {
      const error: any = new Error('Favorite location not found');
      error.statusCode = 404;
      throw error;
    }
    return prisma.favoriteLocation.update({
      where: { id: favoriteId },
      data,
    });
  }

  static async remove(userId: string, favoriteId: string) {
    const existing = await prisma.favoriteLocation.findUnique({ where: { id: favoriteId } });
    if (!existing || existing.userId !== userId) {
      const error: any = new Error('Favorite location not found');
      error.statusCode = 404;
      throw error;
    }
    await prisma.favoriteLocation.delete({ where: { id: favoriteId } });
    return { message: 'Favorite location deleted' };
  }
}
