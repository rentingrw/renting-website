import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { ApplyJobDto } from './dto/job-opening.dto';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsPublicController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'List open jobs shown on the careers page' })
  listActiveJobs() {
    return this.adminService.listActiveJobOpenings();
  }

  @Post('apply')
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Send an open application to the company email' })
  applyOpen(@Body() body: ApplyJobDto) {
    return this.adminService.applyToJob(null, body);
  }

  @Post(':id/apply')
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Send a job application to the company email' })
  apply(@Param('id', ParseUUIDPipe) id: string, @Body() body: ApplyJobDto) {
    return this.adminService.applyToJob(id, body);
  }
}
