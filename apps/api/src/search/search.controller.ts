import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { OptionalClerkAuthGuard } from '../auth/guards/optional-clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
@UseGuards(OptionalClerkAuthGuard)
@SkipThrottle()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search for available cars and drivers' })
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
  search(@Query() query: SearchQueryDto, @Req() request: { user?: AuthenticatedUser }) {
    return this.searchService.search(query, request.user);
  }
}
