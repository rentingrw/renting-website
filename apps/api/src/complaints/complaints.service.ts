import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SiteComplaintStatus } from '@prisma/client';

import { prisma } from '../database/prisma';
import { NotificationsService } from '../notifications/notifications.service';
import { adminComplaintsUrl, siteComplaintEmailHtml } from '../notifications/site-complaint-email';
import { realtimeEvents } from '../realtime/realtime.events';
import type { ListSiteComplaintsQueryDto } from './dto/list-site-complaints.query.dto';
import type { SubmitComplaintDto } from './dto/submit-complaint.dto';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) {
    throw new BadRequestException('Enter a valid phone number.');
  }
  return phone.trim();
}

@Injectable()
export class ComplaintsService {
  constructor(private readonly notificationsService: NotificationsService) {}

  async submitPublic(payload: SubmitComplaintDto) {
    const phone = normalizePhone(payload.phone);
    const complaint = await prisma.siteComplaint.create({
      data: {
        fullName: payload.fullName.trim(),
        phone,
        email: payload.email?.trim() || null,
        message: payload.message.trim(),
      },
    });

    const subject = `Complaint from ${complaint.fullName}`;
    const text = [
      `New complaint from ${complaint.fullName}`,
      `Phone: ${phone}`,
      complaint.email ? `Email: ${complaint.email}` : '',
      '',
      complaint.message,
      '',
      `Admin: ${adminComplaintsUrl()}`,
    ]
      .filter(Boolean)
      .join('\n');

    const whatsappText = [
      '📣 New customer complaint',
      '',
      complaint.fullName,
      `Phone: ${phone}`,
      complaint.email ? `Email: ${complaint.email}` : '',
      '',
      complaint.message.slice(0, 500),
      '',
      adminComplaintsUrl(),
    ]
      .filter(Boolean)
      .join('\n');

    this.notificationsService.queueAdminDeskAlert(
      subject,
      text,
      siteComplaintEmailHtml({
        fullName: complaint.fullName,
        phone,
        email: complaint.email,
        message: complaint.message,
        complaintId: complaint.id,
      }),
      { whatsappText, smsText: `${complaint.fullName} complaint — call ${phone}. Admin: ${adminComplaintsUrl()}` },
    );
    this.notificationsService.emitInAppToAdmin(realtimeEvents.siteComplaintNew, {
      complaintId: complaint.id,
      fullName: complaint.fullName,
      phone,
    });

    return { success: true, id: complaint.id };
  }

  async listForAdmin(query: ListSiteComplaintsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.SiteComplaintWhereInput = {};
    if (query.status) {
      where.status = query.status;
    } else if (query.openOnly !== false) {
      where.status = SiteComplaintStatus.open;
    }

    const [total, rows] = await Promise.all([
      prisma.siteComplaint.count({ where }),
      prisma.siteComplaint.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: rows.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        phone: row.phone,
        email: row.email,
        message: row.message,
        status: row.status,
        adminNotes: row.adminNotes,
        resolvedAt: row.resolvedAt,
        createdAt: row.createdAt,
      })),
    };
  }

  async resolve(id: string, adminNotes?: string) {
    const existing = await prisma.siteComplaint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Complaint not found.');
    return prisma.siteComplaint.update({
      where: { id },
      data: {
        status: SiteComplaintStatus.resolved,
        resolvedAt: new Date(),
        ...(adminNotes !== undefined ? { adminNotes: adminNotes.trim() || null } : {}),
      },
    });
  }

  async dismiss(id: string, adminNotes?: string) {
    const existing = await prisma.siteComplaint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Complaint not found.');
    return prisma.siteComplaint.update({
      where: { id },
      data: {
        status: SiteComplaintStatus.dismissed,
        resolvedAt: new Date(),
        ...(adminNotes !== undefined ? { adminNotes: adminNotes.trim() || null } : {}),
      },
    });
  }
}