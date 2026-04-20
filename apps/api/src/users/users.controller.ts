import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { AddRoleDto } from './dto/add-role.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(ClerkAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user profile' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.clerkUserId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current authenticated user profile' })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() payload: UpdateMeDto) {
    return this.usersService.updateMe(user.clerkUserId, payload);
  }

  @Post('me/roles')
  @ApiOperation({ summary: 'Add a secondary role to the current authenticated user' })
  addRole(@CurrentUser() user: AuthenticatedUser, @Body() payload: AddRoleDto) {
    return this.usersService.addSecondaryRole(user.clerkUserId, payload.role);
  }

  @Post('me/kyc')
  @ApiOperation({ summary: 'Submit KYC information (National ID, TIN, company name)' })
  submitKyc(@CurrentUser() user: AuthenticatedUser, @Body() payload: SubmitKycDto) {
    return this.usersService.submitKyc(user.clerkUserId, payload);
  }

  @Get('me/kyc')
  @ApiOperation({ summary: 'Get the current KYC verification status' })
  getKycStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getKycStatus(user.clerkUserId);
  }
}
