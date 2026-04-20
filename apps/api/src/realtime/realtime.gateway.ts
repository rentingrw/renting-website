import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { prisma } from '../database/prisma';
import type { Server, Socket } from 'socket.io';

import { RealtimeEventsService } from './realtime-events.service';

@WebSocketGateway({
  cors: {
    origin: [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_ADMIN_URL].filter(Boolean),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  afterInit(server: Server) {
    this.realtimeEvents.attachServer(server);
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new Error('Missing bearer token.');
      }

      const claims = await verifyToken(token, {
        secretKey: this.configService.getOrThrow<string>('CLERK_SECRET_KEY'),
      });

      if (!claims.sub) {
        throw new Error('Invalid token subject.');
      }

      const user = await prisma.user.findUnique({
        where: { clerkId: claims.sub },
        select: { id: true },
      });

      if (!user) {
        throw new Error('User not found. Sync your account first.');
      }

      await client.join(this.realtimeEvents.userRoom(user.id));
      const publicMetadata = this.extractPublicMetadata(claims as Record<string, unknown>);
      if (publicMetadata?.role === 'admin') {
        await client.join('admin');
      }

      client.data.userId = user.id;
    } catch (error) {
      this.logger.warn(
        `Socket authentication failed for ${client.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      client.disconnect(true);
    }
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const authHeader = client.handshake.headers.authorization;
    if (typeof authHeader !== 'string') {
      return undefined;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }

  private extractPublicMetadata(
    payload: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const publicMetadata = payload.publicMetadata;
    if (this.isRecord(publicMetadata)) {
      return publicMetadata;
    }

    const publicMetadataSnakeCase = payload.public_metadata;
    if (this.isRecord(publicMetadataSnakeCase)) {
      return publicMetadataSnakeCase;
    }

    return undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
