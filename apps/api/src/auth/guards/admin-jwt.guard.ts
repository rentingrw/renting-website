import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

import type { AuthenticatedRequest } from '../types/authenticated-request.interface';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing admin token.');
    }

    const token = authHeader.slice(7);
    const secret =
      this.configService.get<string>('ADMIN_JWT_SECRET') ?? process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Admin auth is not configured (ADMIN_JWT_SECRET).');
    }

    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;

      if (payload['role'] !== 'admin') {
        throw new ForbiddenException('Admin role required.');
      }

      request.user = {
        clerkUserId: 'admin:system',
        role: 'admin',
        publicMetadata: { role: 'admin' },
        sessionClaims: payload as Record<string, unknown>,
      };

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Invalid or expired admin token.');
    }
  }
}
