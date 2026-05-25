import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';

@Injectable()
export class DriverFavoritesService {
  async add(authUser: AuthenticatedUser, driverProfileId: string) {
    const user = await this.requireUser(authUser.clerkUserId);

    const profile = await prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Driver profile not found.');

    try {
      const fav = await prisma.driverFavorite.create({
        data: { userId: user.id, driverProfileId },
        select: { id: true, driverProfileId: true, createdAt: true },
      });
      return fav;
    } catch {
      throw new ConflictException('Already in favorites.');
    }
  }

  async remove(authUser: AuthenticatedUser, driverProfileId: string) {
    const user = await this.requireUser(authUser.clerkUserId);
    const deleted = await prisma.driverFavorite.deleteMany({
      where: { userId: user.id, driverProfileId },
    });
    if (deleted.count === 0) throw new NotFoundException('Favorite not found.');
    return { removed: true, driverProfileId };
  }

  async getMine(authUser: AuthenticatedUser) {
    const user = await this.requireUser(authUser.clerkUserId);
    return prisma.driverFavorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        driverProfile: {
          select: {
            id: true,
            driverCategory: true,
            primaryCity: true,
            dailyRateRwf: true,
            rating: true,
            completedTrips: true,
            user: { select: { id: true, fullName: true, avatarUrl: true } },
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
