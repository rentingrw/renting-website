import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma, type RoleType } from '@prisma/client';
import { prisma } from '../database/prisma';

import type { UpdateMeDto } from './dto/update-me.dto';
import type { SubmitKycDto } from './dto/submit-kyc.dto';
import { deriveTrustTier } from './trust-tier';

@Injectable()
export class UsersService {
  async getMe(clerkUserId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include: { roles: true },
    });

    if (!user) {
      throw new NotFoundException('User not found. Sync your account first.');
    }
    if (user.deletedAt) {
      throw new ForbiddenException('This account has been deactivated.');
    }

    const score = Number(user.trustScore);
    const roles = new Set<RoleType>([user.primaryRole, ...user.roles.map((item) => item.role)]);

    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      profilePhotoUrl: user.avatarUrl,
      status: user.status,
      trustScore: score,
      trustTier: deriveTrustTier(score),
      primaryRole: user.primaryRole,
      roles: Array.from(roles),
      languagePreference: user.languagePreference,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateMe(clerkUserId: string, payload: UpdateMeDto) {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found. Sync your account first.');
    }
    if (user.deletedAt) {
      throw new ForbiddenException('This account has been deactivated.');
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (payload.fullName !== undefined) {
      updateData.fullName = payload.fullName;
    }
    if (payload.profilePhotoUrl !== undefined) {
      updateData.avatarUrl = payload.profilePhotoUrl;
    }
    if (payload.languagePreference !== undefined) {
      updateData.languagePreference = payload.languagePreference;
    }

    return prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        languagePreference: true,
        updatedAt: true,
      },
    });
  }

  async submitKyc(clerkUserId: string, payload: SubmitKycDto) {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, deletedAt: true, primaryRole: true },
    });

    if (!user) throw new NotFoundException('User not found. Sync your account first.');
    if (user.deletedAt) throw new ForbiddenException('This account has been deactivated.');

    const profile = await prisma.carOwnerProfile.upsert({
      where: { userId: user.id },
      update: {
        ...(payload.nationalIdNumber !== undefined && { nationalIdNumber: payload.nationalIdNumber }),
        ...(payload.tinNumber !== undefined && { tinNumber: payload.tinNumber }),
        ...(payload.companyName !== undefined && { companyName: payload.companyName }),
      },
      create: {
        userId: user.id,
        nationalIdNumber: payload.nationalIdNumber,
        tinNumber: payload.tinNumber,
        companyName: payload.companyName,
      },
    });

    return {
      id: profile.id,
      nationalIdNumber: profile.nationalIdNumber,
      tinNumber: profile.tinNumber,
      companyName: profile.companyName,
      verifiedAt: profile.verifiedAt,
      isVerified: profile.verifiedAt !== null,
    };
  }

  async getKycStatus(clerkUserId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, deletedAt: true, isVerified: true },
    });

    if (!user) throw new NotFoundException('User not found. Sync your account first.');
    if (user.deletedAt) throw new ForbiddenException('This account has been deactivated.');

    const profile = await prisma.carOwnerProfile.findUnique({
      where: { userId: user.id },
      select: {
        nationalIdNumber: true,
        tinNumber: true,
        companyName: true,
        verifiedAt: true,
      },
    });

    return {
      isVerified: user.isVerified,
      hasSubmittedKyc: profile !== null && (!!profile.nationalIdNumber || !!profile.tinNumber),
      verifiedAt: profile?.verifiedAt ?? null,
      companyName: profile?.companyName ?? null,
      nationalIdSubmitted: !!profile?.nationalIdNumber,
      tinSubmitted: !!profile?.tinNumber,
    };
  }

  async adminVerifyUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const profile = await prisma.carOwnerProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('User has not submitted KYC information.');

    await prisma.$transaction([
      prisma.carOwnerProfile.update({
        where: { userId },
        data: { verifiedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { isVerified: true },
      }),
    ]);

    return { userId, isVerified: true, verifiedAt: new Date() };
  }

  async addSecondaryRole(clerkUserId: string, role: RoleType) {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, primaryRole: true, deletedAt: true },
    });

    if (!user) {
      throw new NotFoundException('User not found. Sync your account first.');
    }
    if (user.deletedAt) {
      throw new ForbiddenException('This account has been deactivated.');
    }

    const existingRole = await prisma.userRole.findUnique({
      where: {
        userId_role: {
          userId: user.id,
          role,
        },
      },
    });

    if (!existingRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          role,
        },
      });
    }

    const roles = await prisma.userRole.findMany({
      where: { userId: user.id },
      select: { role: true },
    });

    const allRoles = new Set<RoleType>([user.primaryRole, ...roles.map((item) => item.role)]);

    return {
      roles: Array.from(allRoles),
      roleAdded: !existingRole,
    };
  }
}
