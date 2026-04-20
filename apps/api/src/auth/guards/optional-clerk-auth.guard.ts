import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';

import type { AuthenticatedRequest } from '../types/authenticated-request.interface';

@Injectable()
export class OptionalClerkAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Partial<AuthenticatedRequest>>();
    const authHeader = request.headers?.authorization;
    const token = this.extractBearerToken(authHeader);

    if (!token) {
      return true;
    }

    try {
      const payload = await verifyToken(token, {
        secretKey: this.configService.getOrThrow<string>('CLERK_SECRET_KEY'),
      });

      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid session token subject.');
      }

      const publicMetadata = this.extractPublicMetadata(payload as Record<string, unknown>);
      request.user = {
        clerkUserId: payload.sub,
        role: typeof publicMetadata?.role === 'string' ? publicMetadata.role : undefined,
        publicMetadata,
        sessionClaims: payload as Record<string, unknown>,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired Clerk token.');
    }
  }

  private extractBearerToken(authHeader?: string): string | undefined {
    if (!authHeader) {
      return undefined;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }

  private extractPublicMetadata(payload: Record<string, unknown>): Record<string, unknown> | undefined {
    const direct = payload.publicMetadata;
    if (this.isRecord(direct)) {
      return direct;
    }

    const snakeCase = payload.public_metadata;
    if (this.isRecord(snakeCase)) {
      return snakeCase;
    }

    return undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
