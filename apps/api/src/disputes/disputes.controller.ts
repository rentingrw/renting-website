import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { DismissDisputeDto } from './dto/dismiss-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputesService } from './disputes.service';

@ApiTags('Disputes')
@ApiBearerAuth()
@Controller('disputes')
@UseGuards(ClerkAuthGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'Open a new dispute for a booking' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() payload: CreateDisputeDto) {
    return this.disputesService.create(user, payload);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a dispute by ID' })
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.disputesService.getById(user, id);
  }

  @Post(':id/resolve')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Resolve a dispute (admin only)' })
  resolve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() payload: ResolveDisputeDto) {
    return this.disputesService.resolve(user, id, payload);
  }

  @Post(':id/dismiss')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Dismiss a dispute without resolution (admin only)' })
  dismiss(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() payload: DismissDisputeDto) {
    return this.disputesService.dismiss(user, id, payload);
  }

  @Post(':id/escalate')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Escalate a dispute to a senior support tier (admin only)' })
  escalate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.disputesService.escalate(user, id);
  }
}
