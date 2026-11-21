import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CarHostType,
  CompanyPartnerApplicationStatus,
  type Prisma,
  RoleType,
} from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { assertAndRecordProviderAgreement } from '../common/provider-agreement.util';
import { prisma } from '../database/prisma';
import { NotificationsService } from '../notifications/notifications.service';
import type { SubmitCompanyPartnerDto } from './dto/submit-company-partner.dto';

function mapApplication(record: {
  id: string;
  companyName: string;
  contactPhone: string | null;
  workAddress: string | null;
  tinNumber: string | null;
  message: string | null;
  status: CompanyPartnerApplicationStatus;
  rejectionReason: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
}) {
  return {
    id: record.id,
    companyName: record.companyName,
    contactPhone: record.contactPhone,
    workAddress: record.workAddress,
    tinNumber: record.tinNumber,
    message: record.message,
    status: record.status,
    rejectionReason: record.rejectionReason,
    submittedAt: record.submittedAt,
    reviewedAt: record.reviewedAt,
  };
}

@Injectable()
export class CompanyPartnersService {
  constructor(private readonly notificationsService: NotificationsService) {}

  private async resolveUser(clerkUserId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, fullName: true, email: true, phone: true, deletedAt: true },
    });
    if (!user) throw new NotFoundException('User not found. Sync your account first.');
    if (user.deletedAt) throw new BadRequestException('This account has been deactivated.');
    return user;
  }

  async getMyApplication(clerkUserId: string) {
    const user = await this.resolveUser(clerkUserId);
    const application = await prisma.companyPartnerApplication.findUnique({
      where: { userId: user.id },
    });
    if (!application) return null;
    return mapApplication(application);
  }

  async submitApplication(clerkUserId: string, payload: SubmitCompanyPartnerDto) {
    const user = await this.resolveUser(clerkUserId);
    await assertAndRecordProviderAgreement(user.id, payload);

    const existing = await prisma.companyPartnerApplication.findUnique({
      where: { userId: user.id },
    });

    if (existing?.status === CompanyPartnerApplicationStatus.pending_approval) {
      throw new BadRequestException('Your partner request is already awaiting admin review.');
    }
    if (existing?.status === CompanyPartnerApplicationStatus.approved) {
      throw new BadRequestException('You are already an approved company partner.');
    }

    const contactPhone = payload.contactPhone?.trim() || user.phone || null;
    const data = {
      companyName: payload.companyName.trim(),
      contactPhone,
      workAddress: payload.workAddress?.trim() || null,
      tinNumber: payload.tinNumber?.trim() || null,
      message: payload.message?.trim() || null,
      status: CompanyPartnerApplicationStatus.pending_approval,
      rejectionReason: null,
      submittedAt: new Date(),
      reviewedAt: null,
    };

    const application = existing
      ? await prisma.companyPartnerApplication.update({
          where: { userId: user.id },
          data,
        })
      : await prisma.companyPartnerApplication.create({
          data: { userId: user.id, ...data },
        });

    const adminBase = (process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3002').replace(/\/$/, '');
    const subject = `New company partner request — ${application.companyName}`;
    const text = [
      `${user.fullName} (${user.email}) requested to become a car rental company partner.`,
      `Company: ${application.companyName}`,
      contactPhone ? `Phone: ${contactPhone}` : '',
      application.workAddress ? `Address: ${application.workAddress}` : '',
      application.tinNumber ? `TIN: ${application.tinNumber}` : '',
      application.message ? `Note: ${application.message}` : '',
      '',
      `Review in admin: ${adminBase}/en/partners`,
    ]
      .filter(Boolean)
      .join('\n');

    this.notificationsService.queueAdminDeskAlert(
      subject,
      text,
      `<p><strong>${user.fullName}</strong> (${user.email}) submitted a <strong>company partner</strong> request.</p>
       <ul>
         <li>Company: ${application.companyName}</li>
         ${contactPhone ? `<li>Phone: ${contactPhone}</li>` : ''}
         ${application.workAddress ? `<li>Address: ${application.workAddress}</li>` : ''}
         ${application.tinNumber ? `<li>TIN: ${application.tinNumber}</li>` : ''}
       </ul>
       ${application.message ? `<p>Note: ${application.message}</p>` : ''}
       <p><a href="${adminBase}/en/partners">Open partner requests</a></p>`,
    );

    return mapApplication(application);
  }

  async approveApplication(applicationId: string) {
    const application = await prisma.companyPartnerApplication.findUnique({
      where: { id: applicationId },
      include: { user: { select: { id: true, fullName: true, email: true, primaryRole: true } } },
    });
    if (!application) throw new NotFoundException('Partner application not found.');
    if (application.status !== CompanyPartnerApplicationStatus.pending_approval) {
      throw new BadRequestException('Only pending partner requests can be approved.');
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.companyPartnerApplication.update({
        where: { id: applicationId },
        data: {
          status: CompanyPartnerApplicationStatus.approved,
          reviewedAt: now,
          rejectionReason: null,
        },
      });

      const existingRole = await tx.userRole.findUnique({
        where: { userId_role: { userId: application.userId, role: RoleType.car_owner } },
      });
      if (!existingRole) {
        await tx.userRole.create({
          data: { userId: application.userId, role: RoleType.car_owner },
        });
      }

      await tx.carOwnerProfile.upsert({
        where: { userId: application.userId },
        create: {
          userId: application.userId,
          hostType: CarHostType.company,
          companyName: application.companyName,
          workAddress: application.workAddress,
          contactPhone: application.contactPhone,
          tinNumber: application.tinNumber,
        },
        update: {
          hostType: CarHostType.company,
          companyName: application.companyName,
          workAddress: application.workAddress ?? undefined,
          contactPhone: application.contactPhone ?? undefined,
          tinNumber: application.tinNumber ?? undefined,
        },
      });

      if (application.user.primaryRole === RoleType.renter) {
        await tx.user.update({
          where: { id: application.userId },
          data: { primaryRole: RoleType.car_owner },
        });
      }
    });

    this.notificationsService.queueEmailToUsers(
      [application.userId],
      'Company partner request approved — renting.rw',
      `Hi ${application.user.fullName}, your request to join as a company partner on renting.rw has been approved. You can list fleet vehicles from your dashboard.`,
      `<p>Hi ${application.user.fullName},</p>
       <p>Your request to join renting.rw as a <strong>company partner</strong> has been approved.</p>
       <p>Sign in to your dashboard to add car listings under <strong>${application.companyName}</strong>.</p>`,
    );

    const updated = await prisma.companyPartnerApplication.findUniqueOrThrow({
      where: { id: applicationId },
    });
    return mapApplication(updated);
  }

  async rejectApplication(applicationId: string, reason: string) {
    const application = await prisma.companyPartnerApplication.findUnique({
      where: { id: applicationId },
      include: { user: { select: { fullName: true } } },
    });
    if (!application) throw new NotFoundException('Partner application not found.');
    if (application.status !== CompanyPartnerApplicationStatus.pending_approval) {
      throw new BadRequestException('Only pending partner requests can be rejected.');
    }

    const trimmed = reason.trim();
    if (!trimmed) throw new BadRequestException('A rejection reason is required.');

    const updated = await prisma.companyPartnerApplication.update({
      where: { id: applicationId },
      data: {
        status: CompanyPartnerApplicationStatus.rejected,
        reviewedAt: new Date(),
        rejectionReason: trimmed,
      },
    });

    this.notificationsService.queueEmailToUsers(
      [application.userId],
      'Company partner request not approved — renting.rw',
      `Hi ${application.user.fullName}, your company partner request was not approved. Reason: ${trimmed}`,
      `<p>Hi ${application.user.fullName},</p>
       <p>Your company partner request was not approved.</p>
       <p><strong>Reason:</strong> ${trimmed}</p>
       <p>You may update your details and submit again from your dashboard.</p>`,
    );

    return mapApplication(updated);
  }

  async listApplications(params: {
    status?: CompanyPartnerApplicationStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.CompanyPartnerApplicationWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { companyName: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.companyPartnerApplication.findMany({
        where,
        skip,
        take: pageSize,
        orderBy:
          params.status === CompanyPartnerApplicationStatus.pending_approval
            ? { submittedAt: 'asc' }
            : { submittedAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
        },
      }),
      prisma.companyPartnerApplication.count({ where }),
    ]);

    return {
      items: items.map((row) => ({
        ...mapApplication(row),
        user: row.user,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getApplicationDetail(applicationId: string) {
    const row = await prisma.companyPartnerApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            whatsapp: true,
            createdAt: true,
            carOwnerProfile: {
              select: { hostType: true, companyName: true, workAddress: true, contactPhone: true, tinNumber: true },
            },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Partner application not found.');
    return {
      ...mapApplication(row),
      user: row.user,
    };
  }

}