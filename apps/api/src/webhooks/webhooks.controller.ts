import { Body, Controller, Headers, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { WebhooksService } from './webhooks.service';

@SkipThrottle()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('clerk')
  async clerk(
    @Body() body: Buffer,
    @Headers('svix-id') svixId?: string,
    @Headers('svix-timestamp') svixTimestamp?: string,
    @Headers('svix-signature') svixSignature?: string,
  ) {
    const payload = Buffer.isBuffer(body) ? body.toString('utf8') : JSON.stringify(body);

    return this.webhooksService.handleClerkWebhook(payload, {
      'svix-id': svixId ?? '',
      'svix-timestamp': svixTimestamp ?? '',
      'svix-signature': svixSignature ?? '',
    });
  }
}
