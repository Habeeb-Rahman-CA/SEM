import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly activeOnlineUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.log(`Guest client connected: ${client.id}`);
        return;
      }

      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'super-secret-key-12345',
      );
      try {
        const payload = await this.jwtService.verifyAsync(token, { secret });
        client.data.user = payload;

        const userId = payload.sub || payload.id;
        if (userId) {
          await client.join(`user:${userId}`);

          if (!this.activeOnlineUsers.has(userId)) {
            this.activeOnlineUsers.set(userId, new Set());
          }
          this.activeOnlineUsers.get(userId)!.add(client.id);

          this.logger.log(
            `Client authenticated: ${client.id} (User: ${userId})`,
          );

          if (this.server) {
            this.server.emit('user_presence_change', {
              userId,
              status: 'online',
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (authErr) {
        this.logger.warn(
          `WS connection authentication failed (connecting as guest): ${authErr.message}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Error in connection handling for client ${client.id}: ${err.message}`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const userId = client.data?.user?.sub || client.data?.user?.id;
    if (userId && this.activeOnlineUsers.has(userId)) {
      const userSockets = this.activeOnlineUsers.get(userId)!;
      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        this.activeOnlineUsers.delete(userId);
        if (this.server) {
          this.server.emit('user_presence_change', {
            userId,
            status: 'offline',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  isUserOnline(userId: string): boolean {
    return (
      this.activeOnlineUsers.has(userId) &&
      this.activeOnlineUsers.get(userId)!.size > 0
    );
  }

  @SubscribeMessage('subscribeMatch')
  async handleSubscribeMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    if (data?.matchId) {
      await client.join(`match:${data.matchId}`);
      this.logger.log(
        `Client ${client.id} subscribed to match: ${data.matchId}`,
      );
      return { status: 'ok', room: `match:${data.matchId}` };
    }
  }

  @SubscribeMessage('unsubscribeMatch')
  async handleUnsubscribeMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    if (data?.matchId) {
      await client.leave(`match:${data.matchId}`);
      this.logger.log(
        `Client ${client.id} unsubscribed from match: ${data.matchId}`,
      );
      return { status: 'ok', room: `match:${data.matchId}` };
    }
  }

  @SubscribeMessage('subscribeWorkspace')
  async handleSubscribeWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ) {
    if (data?.workspaceId) {
      await client.join(`workspace:${data.workspaceId}`);
      this.logger.log(
        `Client ${client.id} subscribed to workspace: ${data.workspaceId}`,
      );
      return { status: 'ok', room: `workspace:${data.workspaceId}` };
    }
  }

  @SubscribeMessage('unsubscribeWorkspace')
  async handleUnsubscribeWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ) {
    if (data?.workspaceId) {
      await client.leave(`workspace:${data.workspaceId}`);
      this.logger.log(
        `Client ${client.id} unsubscribed from workspace: ${data.workspaceId}`,
      );
      return { status: 'ok', room: `workspace:${data.workspaceId}` };
    }
  }

  // Real-time Direct Messages Socket Subscriptions
  @SubscribeMessage('dm_typing')
  handleDmTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      workspaceId: string;
      conversationId: string;
      recipientUserId: string;
    },
  ) {
    const senderId = client.data?.user?.sub || client.data?.user?.id;
    if (senderId && data.recipientUserId) {
      this.server.to(`user:${data.recipientUserId}`).emit('dm_user_typing', {
        senderId,
        conversationId: data.conversationId,
        workspaceId: data.workspaceId,
      });
    }
  }

  @SubscribeMessage('dm_stop_typing')
  handleDmStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      workspaceId: string;
      conversationId: string;
      recipientUserId: string;
    },
  ) {
    const senderId = client.data?.user?.sub || client.data?.user?.id;
    if (senderId && data.recipientUserId) {
      this.server
        .to(`user:${data.recipientUserId}`)
        .emit('dm_user_stop_typing', {
          senderId,
          conversationId: data.conversationId,
          workspaceId: data.workspaceId,
        });
    }
  }

  @SubscribeMessage('dm_read')
  handleDmRead(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      workspaceId: string;
      conversationId: string;
      partnerUserId: string;
      readAt: string;
    },
  ) {
    const readerUserId = client.data?.user?.sub || client.data?.user?.id;
    if (readerUserId && data.partnerUserId) {
      this.server.to(`user:${data.partnerUserId}`).emit('dm_read_receipt', {
        readerUserId,
        conversationId: data.conversationId,
        workspaceId: data.workspaceId,
        readAt: data.readAt,
      });
    }
  }

  // Helper method to emit direct messages
  sendDirectMessage(recipientUserId: string, message: any) {
    if (this.server) {
      this.server.to(`user:${recipientUserId}`).emit('dm_received', message);
    }
  }

  // Real-time Group Chat Socket Subscriptions
  @SubscribeMessage('subscribeGroupChat')
  async handleSubscribeGroupChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    if (data?.groupId) {
      await client.join(`group:${data.groupId}`);
      this.logger.log(`Client ${client.id} joined group room: ${data.groupId}`);
      return { status: 'ok', room: `group:${data.groupId}` };
    }
  }

  @SubscribeMessage('unsubscribeGroupChat')
  async handleUnsubscribeGroupChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    if (data?.groupId) {
      await client.leave(`group:${data.groupId}`);
      this.logger.log(`Client ${client.id} left group room: ${data.groupId}`);
      return { status: 'ok', room: `group:${data.groupId}` };
    }
  }

  @SubscribeMessage('group_typing')
  handleGroupTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; username: string },
  ) {
    const senderId = client.data?.user?.sub || client.data?.user?.id;
    if (data?.groupId) {
      client.to(`group:${data.groupId}`).emit('group_user_typing', {
        senderId,
        username: data.username,
        groupId: data.groupId,
      });
    }
  }

  @SubscribeMessage('group_stop_typing')
  handleGroupStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    const senderId = client.data?.user?.sub || client.data?.user?.id;
    if (data?.groupId) {
      client.to(`group:${data.groupId}`).emit('group_user_stop_typing', {
        senderId,
        groupId: data.groupId,
      });
    }
  }

  sendGroupMessage(groupId: string, message: any) {
    if (this.server) {
      this.server
        .to(`group:${groupId}`)
        .emit('group_message_received', message);
    }
  }

  // Helper method to emit notifications
  sendNotification(userId: string, notification: any) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('notification', notification);
    }
  }

  // Helper method to emit match updates
  sendMatchUpdate(matchId: string, workspaceId: string, match: any) {
    if (this.server) {
      this.server.to(`match:${matchId}`).emit('matchUpdated', match);
      if (workspaceId) {
        this.server.to(`workspace:${workspaceId}`).emit('matchUpdated', match);
      }
    }
  }

  // Helper method to emit global logout event across all connected clients
  emitGlobalLogout(logoutEventId: string) {
    if (this.server) {
      this.server.emit('global_logout_event', {
        logoutEventId,
        message: 'A global logout event was triggered by an administrator.',
      });
    }
  }
}
