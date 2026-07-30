import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(RedisIoAdapter.name);

  async connectToRedis(
    host: string,
    port: number,
    password?: string,
  ): Promise<boolean> {
    try {
      const pubClient = new Redis({
        host,
        port,
        password: password || undefined,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
      });

      const subClient = pubClient.duplicate();

      // Simple connectivity check
      await new Promise<void>((resolve, reject) => {
        let finished = false;
        pubClient.on('connect', () => {
          if (!finished) {
            finished = true;
            resolve();
          }
        });
        pubClient.on('error', (err) => {
          if (!finished) {
            finished = true;
            reject(err);
          }
        });
      });

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log(
        'Connected to Redis successfully for Socket.IO clustering.',
      );
      return true;
    } catch (err: any) {
      this.logger.warn(
        `Failed to connect to Redis: ${err.message}. Real-time will fall back to single-instance adapter.`,
      );
      return false;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
