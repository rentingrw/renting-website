import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WebhookEvent } from '@clerk/backend/webhooks';
import { Webhook } from 'svix';

import { AuthService } from '../auth/auth.service';

type ClerkUserPayload = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  email_addresses?: Array<{ email_address?: string }>;
  phone_numbers?: Array<{ phone_number?: string }>;
};

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async handleClerkWebhook(payload: string, headers: Record<string, string>) {
    const secret = this.configService.getOrThrow<string>('CLERK_WEBHOOK_SECRET');
    const wh = new Webhook(secret);

    let event: WebhookEvent;
    try {
      event = wh.verify(payload, headers) as WebhookEvent;
    } catch (error) {
      throw new BadRequestException('Invalid webhook signature.');
    }

    if (event.type === 'user.created' || event.type === 'user.updated') {
      const userData = event.data as unknown as ClerkUserPayload;
      const email = this.extractPrimaryEmail(userData);

      if (!email) {
        this.logger.warn(`Skipping ${event.type} for ${userData.id}: missing email address.`);
        return { ok: true, skipped: true };
      }

      const fullName = this.buildFullName(userData, email);
      await this.authService.syncUserFromWebhook({
        clerkUserId: userData.id,
        email,
        phone: this.extractPrimaryPhone(userData),
        fullName,
        profilePhotoUrl: userData.image_url ?? undefined,
      });
    }

    return { ok: true };
  }

  private extractPrimaryEmail(data: ClerkUserPayload): string | undefined {
    return data.email_addresses?.find((item) => Boolean(item.email_address))?.email_address;
  }

  private extractPrimaryPhone(data: ClerkUserPayload): string | undefined {
    return data.phone_numbers?.find((item) => Boolean(item.phone_number))?.phone_number;
  }

  private buildFullName(data: ClerkUserPayload, fallbackEmail: string): string {
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
    return fullName || fallbackEmail.split('@')[0] || 'Rentingi User';
  }
}
