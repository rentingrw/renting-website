import { Injectable } from '@nestjs/common';
import { Language, RoleType, type User } from '@prisma/client';
import { prisma } from '../database/prisma';
import { NotificationsService } from '../notifications/notifications.service';

import type { SyncUserDto } from './dto/sync-user.dto';

@Injectable()
export class AuthService {
  constructor(private readonly notificationsService: NotificationsService) {}

  async syncUser(clerkUserId: string, payload: SyncUserDto): Promise<User> {
    const existingByClerkId = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (existingByClerkId) {
      const updated = await prisma.user.update({
        where: { id: existingByClerkId.id },
        data: {
          email: payload.email,
          phone: payload.phone,
          fullName: payload.fullName,
          avatarUrl: payload.profilePhotoUrl,
          primaryRole: payload.primaryRole,
          languagePreference: payload.languagePreference ?? existingByClerkId.languagePreference,
        },
      });
      await this.ensureRole(updated.id, payload.primaryRole);
      return updated;
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingByEmail) {
      const updated = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          clerkId: clerkUserId,
          phone: payload.phone,
          fullName: payload.fullName,
          avatarUrl: payload.profilePhotoUrl,
          primaryRole: payload.primaryRole,
          languagePreference: payload.languagePreference ?? existingByEmail.languagePreference,
        },
      });
      await this.ensureRole(updated.id, payload.primaryRole);
      return updated;
    }

    const user = await prisma.user.create({
      data: {
        clerkId: clerkUserId,
        email: payload.email,
        phone: payload.phone,
        fullName: payload.fullName,
        avatarUrl: payload.profilePhotoUrl,
        primaryRole: payload.primaryRole,
        languagePreference: payload.languagePreference ?? Language.en,
        roles: {
          create: {
            role: payload.primaryRole,
          },
        },
      },
    });

    this.notificationsService.queueWelcomeEmail(user.id);

    return user;
  }

  async syncUserFromWebhook(input: {
    clerkUserId: string;
    email: string;
    phone?: string;
    fullName: string;
    profilePhotoUrl?: string;
    languagePreference?: Language;
    primaryRole?: RoleType;
  }): Promise<User> {
    return this.syncUser(input.clerkUserId, {
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
      profilePhotoUrl: input.profilePhotoUrl,
      languagePreference: input.languagePreference,
      primaryRole: input.primaryRole ?? RoleType.renter,
    });
  }

  private async ensureRole(userId: string, role: RoleType): Promise<void> {
    await prisma.userRole.upsert({
      where: {
        userId_role: {
          userId,
          role,
        },
      },
      update: {},
      create: {
        userId,
        role,
      },
    });
  }
}
