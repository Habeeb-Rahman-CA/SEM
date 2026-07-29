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

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from multiple possible places
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.log(`Guest client connected: ${client.id}`);
        return;
      }

      // Verify token
      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'super-secret-key-12345',
      );
      try {
        const payload = await this.jwtService.verifyAsync(token, { secret });
        client.data.user = payload;

        const userId = payload.sub || payload.id;
        if (userId) {
          // Join a room for the user to receive private notifications
          await client.join(`user:${userId}`);
          this.logger.log(`Client authenticated: ${client.id} (User: ${userId})`);
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

  // Helper method to emit notifications
  sendNotification(userId: string, notification: any) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('notification', notification);
    }
  }

  // Helper method to emit match updates
  sendMatchUpdate(matchId: string, workspaceId: string, match: any) {
    if (this.server) {
      // Emit to match room
      this.server.to(`match:${matchId}`).emit('matchUpdated', match);
      // Emit to workspace room
      if (workspaceId) {
        this.server.to(`workspace:${workspaceId}`).emit('matchUpdated', match);
      }
    }
  }
}
