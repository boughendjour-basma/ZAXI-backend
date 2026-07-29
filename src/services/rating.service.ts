import prisma from '../config/database';
import { BookingStatus } from '@prisma/client';

const MAX_SCORE = 5;
const MIN_SCORE = 1;

export class RatingService {
  /**
   * Customer rates a completed ride.
   * Rules:
   * - Booking must be COMPLETED
   * - Customer must own the booking
   * - One rating per booking (enforced via @unique on bookingId)
   * - Score must be 1–5
   */
  static async createRating(
    customerId: string,
    bookingId: string,
    score: number,
    comment?: string
  ) {
    if (score < MIN_SCORE || score > MAX_SCORE || !Number.isInteger(score)) {
      const error: any = new Error(`Rating score must be an integer between ${MIN_SCORE} and ${MAX_SCORE}`);
      error.statusCode = 400;
      throw error;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { rating: true },
    });

    if (!booking || booking.customerId !== customerId) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      const error: any = new Error('Only completed rides can be rated');
      error.statusCode = 409;
      throw error;
    }

    if (booking.rating) {
      const error: any = new Error('You have already rated this ride');
      error.statusCode = 409;
      throw error;
    }

    if (!booking.driverId) {
      const error: any = new Error('No driver assigned to this booking');
      error.statusCode = 400;
      throw error;
    }

    try {
      const rating = await prisma.rating.create({
        data: {
          bookingId,
          customerId,
          driverId: booking.driverId,
          score,
          comment: comment ?? null,
        },
      });

      return rating;
    } catch (error: any) {
      if (error.code === 'P2002') {
        const conflict: any = new Error('You have already rated this ride');
        conflict.statusCode = 409;
        throw conflict;
      }
      throw error;
    }
  }

  /**
   * Get the aggregated rating stats for the driver.
   */
  static async getDriverRatingStats(driverId: string) {
    const ratings = await prisma.rating.findMany({
      where: { driverId },
      select: { score: true },
    });

    const totalRatings = ratings.length;
    const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
    const ratingAverage = totalRatings > 0 ? Math.round((totalScore / totalRatings) * 10) / 10 : 0;

    const totalTrips = await prisma.booking.count({
      where: { driverId, status: BookingStatus.COMPLETED },
    });

    return { ratingAverage, totalRatings, totalTrips };
  }

  /**
   * Get the rating for a specific booking.
   */
  static async getRating(userId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { rating: true },
    });

    if (!booking || (booking.customerId !== userId && booking.driverId !== userId)) {
      const error: any = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    return booking.rating ?? null;
  }
}
