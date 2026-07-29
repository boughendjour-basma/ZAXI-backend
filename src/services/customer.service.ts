import prisma from '../config/database';
import argon2 from 'argon2';
import { safeUserSelect } from './auth.service';
import { UpdateProfileInput, ChangePasswordInput } from '../validators/customer.validator';

export class CustomerService {
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });

    if (!user) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const [totalTrips, ratingGiven] = await Promise.all([
      prisma.booking.count({
        where: { customerId: userId, status: 'COMPLETED' },
      }),
      prisma.rating.count({
        where: { customerId: userId },
      }),
    ]);

    return {
      ...user,
      totalTrips,
      ratingGiven,
    };
  }

  static async updateProfile(userId: string, data: UpdateProfileInput) {
    // Only permitted fields passed via data because of strict Zod validation
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: safeUserSelect,
    });

    return updatedUser;
  }

  static async changePassword(userId: string, data: ChangePasswordInput) {
    // We need to fetch the passwordHash to verify
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify current password
    const isPasswordValid = user.passwordHash
      ? await argon2.verify(user.passwordHash, data.currentPassword)
      : false;
    if (!isPasswordValid) {
      const error: any = new Error('Incorrect current password');
      error.statusCode = 401;
      throw error;
    }

    // Hash new password
    const newPasswordHash = await argon2.hash(data.newPassword);

    // Update the database
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
      // Important: Do not select/return passwordHash
      select: { id: true },
    });

    return { message: 'Password changed successfully' };
  }
}
