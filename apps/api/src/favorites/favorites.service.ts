import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';

@Injectable()
export class FavoritesService {
  async add(authUser: AuthenticatedUser, carListingId: string) {
    const user = await this.requireUser(authUser.clerkUserId);

    const listing = await prisma.carListing.findUnique({
      where: { id: carListingId },
      select: { id: true, status: true },
    });
    if (!listing || listing.status === 'deleted' || listing.status === 'archived') {
      throw new NotFoundException('Listing not found.');
    }

    try {
      const fav = await prisma.favorite.create({
        data: { userId: user.id, carListingId },
        select: { id: true, carListingId: true, createdAt: true },
      });
      return fav;
    } catch {
      throw new ConflictException('Already in favorites.');
    }
  }

  async remove(authUser: AuthenticatedUser, carListingId: string) {
    const user = await this.requireUser(authUser.clerkUserId);
    const deleted = await prisma.favorite.deleteMany({
      where: { userId: user.id, carListingId },
    });
    if (deleted.count === 0) {
      throw new NotFoundException('Favorite not found.');
    }
    return { removed: true, carListingId };
  }

  async getMine(authUser: AuthenticatedUser) {
    const user = await this.requireUser(authUser.clerkUserId);
    return prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        carListing: {
          select: {
            id: true,
            title: true,
            brand: true,
            model: true,
            year: true,
            photos: true,
            locationText: true,
            status: true,
            owner: { select: { id: true, fullName: true } },
          },
        },
      },
    });
  }

  private async requireUser(clerkUserId: string) {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!user) throw new UnauthorizedException('User not found. Sync your account first.');
    return user;
  }
}
