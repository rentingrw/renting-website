import { Injectable, Logger } from '@nestjs/common';

import { prisma } from '../database/prisma';
import type { RealtimeEventName } from '../realtime/realtime.events';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { welcomeEmailHtml } from './email-templates';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly realtimeEvents: RealtimeEventsService) {}

  emitInAppToUsers(userIds: string[], event: RealtimeEventName, payload: unknown) {
    this.realtimeEvents.emitToUsers(userIds, event, payload);
  }

  emitInAppToAdmin(event: RealtimeEventName, payload: unknown) {
    this.realtimeEvents.emitToAdmin(event, payload);
  }

  queueSmsToUsers(userIds: string[], message: string) {
    void this.sendSmsToUsers(userIds, message).catch((error: unknown) => {
      this.logger.warn(
        `SMS dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    });
  }

  queueEmailToUsers(userIds: string[], subject: string, text: string, html?: string) {
    void this.sendEmailToUsers(userIds, subject, text, html).catch((error: unknown) => {
      this.logger.warn(
        `Email dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    });
  }

  queueEmailToAddresses(emails: string[], subject: string, text: string, html?: string) {
    void this.sendEmailToAddresses(emails, subject, text, html).catch((error: unknown) => {
      this.logger.warn(
        `Email dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    });
  }

  queueSmsToPhones(phones: string[], message: string) {
    void this.sendSmsToPhones(phones, message).catch((error: unknown) => {
      this.logger.warn(
        `SMS dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    });
  }

  queueAdminDeskAlert(subject: string, text: string, html?: string) {
    const adminEmail = process.env.ADMIN_ALERT_EMAIL ?? 'renting.rw@gmail.com';
    this.queueEmailToAddresses([adminEmail], subject, text, html);
  }

  async queueWelcomeEmail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });

    if (!user?.email) {
      return;
    }

    const subject = 'Welcome to renting.rw';
    const text = `Hi ${user.fullName}, welcome to renting.rw. You can now browse listings and create bookings.`;
    const html = welcomeEmailHtml(user.fullName);
    this.queueEmailToUsers([userId], subject, text, html);
  }

  private async sendSmsToUsers(userIds: string[], message: string) {
    const uniqueIds = Array.from(new Set(userIds.filter((value) => value.trim().length > 0)));
    if (uniqueIds.length === 0 || message.trim().length === 0) {
      return;
    }

    const users = await prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, phone: true },
    });

    const phones = users.map((user) => user.phone).filter((phone): phone is string => Boolean(phone));
    await this.sendSmsToPhones(phones, message);
  }

  private async sendSmsToPhones(phones: string[], message: string) {
    const unique = Array.from(new Set(phones.map((item) => item.trim()).filter(Boolean)));
    if (unique.length === 0 || message.trim().length === 0) {
      return;
    }

    const apiKey = process.env.AT_API_KEY;
    const username = process.env.AT_USERNAME;
    if (!apiKey || !username) {
      this.logger.warn('Africa\'s Talking credentials missing; skipping SMS dispatch.');
      return;
    }

    const body = new URLSearchParams({
      username,
      to: unique.join(','),
      message,
    });

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        apiKey,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Africa's Talking SMS API returned status ${response.status}.`);
    }
  }

  private async sendEmailToUsers(userIds: string[], subject: string, text: string, html?: string) {
    const uniqueIds = Array.from(new Set(userIds.filter((value) => value.trim().length > 0)));
    if (uniqueIds.length === 0) {
      return;
    }

    const users = await prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, email: true },
    });
    const recipients = users.map((user) => user.email).filter((email): email is string => Boolean(email));
    await this.sendEmailToAddresses(recipients, subject, text, html);
  }

  private async sendEmailToAddresses(emails: string[], subject: string, text: string, html?: string) {
    const recipients = Array.from(new Set(emails.map((item) => item.trim()).filter(Boolean)));
    if (recipients.length === 0) {
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || 'renting.rw <noreply@renting.rw>';
    if (!apiKey) {
      this.logger.warn('Resend API key missing; skipping email dispatch.');
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        text,
        ...(html ? { html } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend API returned status ${response.status}.`);
    }
  }
}
