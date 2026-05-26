import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminService } from './admin.service';

@ApiTags('Banners')
@Controller('banners')
@SkipThrottle()
export class BannersPublicController {
  constructor(private readonly adminService: AdminService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get the currently active site banner (public)' })
  getActiveBanner() {
    return this.adminService.getActiveBanner();
  }
}
