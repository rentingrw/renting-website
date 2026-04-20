import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a review for a completed booking' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() payload: CreateReviewDto) {
    return this.reviewsService.create(user, payload);
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Get all reviews for a specific user' })
  getByUser(@Param('id') id: string) {
    return this.reviewsService.getForUser(id);
  }
}
