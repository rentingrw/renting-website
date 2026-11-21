import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { CompanyPartnersService } from './company-partners.service';
import { SubmitCompanyPartnerDto } from './dto/submit-company-partner.dto';

@ApiTags('Company partners')
@Controller('company-partners')
export class CompanyPartnersController {
  constructor(private readonly companyPartnersService: CompanyPartnersService) {}

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user’s company partner application, if any' })
  getMyApplication(@CurrentUser() user: AuthenticatedUser) {
    return this.companyPartnersService.getMyApplication(user.clerkUserId);
  }

  @Post('apply')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a company partner request for admin approval' })
  submitApplication(@CurrentUser() user: AuthenticatedUser, @Body() payload: SubmitCompanyPartnerDto) {
    return this.companyPartnersService.submitApplication(user.clerkUserId, payload);
  }
}