import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ComplaintsService } from './complaints.service';
import { SubmitComplaintDto } from './dto/submit-complaint.dto';

@ApiTags('Complaints')
@Controller('complaints')
export class ComplaintsPublicController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Submit a complaint from the public website' })
  submit(@Body() body: SubmitComplaintDto) {
    return this.complaintsService.submitPublic(body);
  }
}