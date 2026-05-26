import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OptionalClerkAuthGuard } from '../auth/guards/optional-clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { AddRoleDto } from './dto/add-role.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user profile' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.clerkUserId);
  }

  @Patch('me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current authenticated user profile' })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() payload: UpdateMeDto) {
    return this.usersService.updateMe(user.clerkUserId, payload);
  }

  @Post('me/roles')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a secondary role to the current authenticated user' })
  addRole(@CurrentUser() user: AuthenticatedUser, @Body() payload: AddRoleDto) {
    return this.usersService.addSecondaryRole(user.clerkUserId, payload.role);
  }

  @Post('me/kyc')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit KYC information (National ID, TIN, company name)' })
  submitKyc(@CurrentUser() user: AuthenticatedUser, @Body() payload: SubmitKycDto) {
    return this.usersService.submitKyc(user.clerkUserId, payload);
  }

  @Get('me/kyc')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current KYC verification status' })
  getKycStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getKycStatus(user.clerkUserId);
  }

  @Get(':id/public')
  @SkipThrottle()
  @UseGuards(OptionalClerkAuthGuard)
  @ApiOperation({ summary: 'Get a user\'s public profile (name, avatar, driver profile link)' })
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }
}
