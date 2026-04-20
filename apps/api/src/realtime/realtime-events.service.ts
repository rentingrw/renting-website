import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

import type { RealtimeEventName } from './realtime.events';

@Injectable()
export class RealtimeEventsService {
  private readonly logger = new Logger(RealtimeEventsService.name);
  private server?: Server;

  attachServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: RealtimeEventName, payload: unknown) {
    this.getServer()?.to(this.userRoom(userId)).emit(event, payload);
  }

  emitToUsers(userIds: string[], event: RealtimeEventName, payload: unknown) {
    const uniqueIds = Array.from(new Set(userIds.filter((id) => id.trim().length > 0)));
    for (const userId of uniqueIds) {
      this.emitToUser(userId, event, payload);
    }
  }

  emitToAdmin(event: RealtimeEventName, payload: unknown) {
    this.getServer()?.to('admin').emit(event, payload);
  }

  userRoom(userId: string) {
    return `user:${userId}`;
  }

  private getServer() {
    if (!this.server) {
      this.logger.warn('Socket.io server not initialized yet; skipping event emit.');
      return undefined;
    }

    return this.server;
  }
}
