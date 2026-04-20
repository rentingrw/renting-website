import { Module } from '@nestjs/common';

import { TrustScoreModule } from '../trust-score/trust-score.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [TrustScoreModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
