import { ForbiddenException, Injectable } from '@nestjs/common';

import { ClerkAuthGuard } from './clerk-auth.guard';
import type { AuthenticatedRequest } from '../types/authenticated-request.interface';
import type { ExecutionContext } from '@nestjs/common';

@Injectable()
export class AdminGuard extends ClerkAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user.role !== 'admin') {
      throw new ForbiddenException('Admin role required.');
    }

    return true;
  }
}
