import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BookingStatus, type User } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { TrustScoreService } from '../trust-score/trust-score.service';
import type { CreateReviewDto } from './dto/create-review.dto';

const REVIEWABLE_BOOKING_STATUSES = new Set<BookingStatus>([
  BookingStatus.completed,
  BookingStatus.auto_completed,
]);

@Injectable()
export class ReviewsService {
  constructor(private readonly trustScoreService: TrustScoreService) {}

  async create(authUser: AuthenticatedUser, payload: CreateReviewDto) {
    const reviewer = await this.requireUser(authUser.clerkUserId);

    if (!payload.carBookingId && !payload.driverBookingId) {
      throw new BadRequestException('carBookingId or driverBookingId is required.');
    }
    if (payload.carBookingId && payload.driverBookingId) {
      throw new BadRequestException('Provide only one booking identifier.');
    }
    if (reviewer.id === payload.toUserId) {
      throw new BadRequestException('You cannot review yourself.');
    }

    if (payload.carBookingId) {
      await this.assertCanReviewCarBooking(reviewer.id, payload.toUserId, payload.carBookingId);
    }
    if (payload.driverBookingId) {
      await this.assertCanReviewDriverBooking(reviewer.id, payload.toUserId, payload.driverBookingId);
    }

    const duplicate = await prisma.review.findFirst({
      where: {
        fromUserId: reviewer.id,
        ...(payload.carBookingId ? { carBookingId: payload.carBookingId } : {}),
        ...(payload.driverBookingId ? { driverBookingId: payload.driverBookingId } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException('You have already reviewed this booking.');
    }

    const review = await prisma.review.create({
      data: {
        fromUserId: reviewer.id,
        toUserId: payload.toUserId,
        carBookingId: payload.carBookingId,
        driverBookingId: payload.driverBookingId,
        rating: payload.rating,
        comment: payload.comment,
      },
      include: {
        fromUser: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        toUser: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });

    await this.trustScoreService.recordEvent({
      userId: reviewer.id,
      eventType: 'review_left',
      carBookingId: payload.carBookingId,
      driverBookingId: payload.driverBookingId,
    });

    if (payload.rating === 5) {
      await this.trustScoreService.recordEvent({
        userId: payload.toUserId,
        eventType: 'five_star_received',
        carBookingId: payload.carBookingId,
        driverBookingId: payload.driverBookingId,
      });
    }

    return review;
  }

  async getForUser(userId: string) {
    const reviews = await prisma.review.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });

    const ratingSummary = reviews.reduce(
      (acc, review) => {
        acc.total += 1;
        acc.sum += review.rating;
        return acc;
      },
      { total: 0, sum: 0 },
    );

    return {
      userId,
      averageRating: ratingSummary.total === 0 ? null : ratingSummary.sum / ratingSummary.total,
      totalReviews: ratingSummary.total,
      reviews,
    };
  }

  private async assertCanReviewCarBooking(reviewerId: string, toUserId: string, bookingId: string) {
    const booking = await prisma.carBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        renterId: true,
        ownerId: true,
        status: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Car booking not found.');
    }
    if (!REVIEWABLE_BOOKING_STATUSES.has(booking.status)) {
      throw new BadRequestException('Car booking is not reviewable yet.');
    }

    const isParticipant = booking.renterId === reviewerId || booking.ownerId === reviewerId;
    if (!isParticipant) {
      throw new ForbiddenException('Only booking participants can leave reviews.');
    }

    const expectedCounterpartyId = booking.renterId === reviewerId ? booking.ownerId : booking.renterId;
    if (expectedCounterpartyId !== toUserId) {
      throw new BadRequestException('toUserId must be the booking counterparty.');
    }
  }

  private async assertCanReviewDriverBooking(reviewerId: string, toUserId: string, bookingId: string) {
    const booking = await prisma.driverBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        renterId: true,
        driverId: true,
        status: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Driver booking not found.');
    }
    if (!REVIEWABLE_BOOKING_STATUSES.has(booking.status)) {
      throw new BadRequestException('Driver booking is not reviewable yet.');
    }

    const isParticipant = booking.renterId === reviewerId || booking.driverId === reviewerId;
    if (!isParticipant) {
      throw new ForbiddenException('Only booking participants can leave reviews.');
    }

    const expectedCounterpartyId = booking.renterId === reviewerId ? booking.driverId : booking.renterId;
    if (expectedCounterpartyId !== toUserId) {
      throw new BadRequestException('toUserId must be the booking counterparty.');
    }
  }

  private async requireUser(clerkUserId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Sync your account first.');
    }

    return user;
  }
}
