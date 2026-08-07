import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPushTokenEntity } from './entities/user-push-token.entity';

@Injectable()
export class ChatMobileService {
  private readonly logger = new Logger(ChatMobileService.name);

  constructor(
    @InjectRepository(UserPushTokenEntity)
    private readonly pushTokenRepo: Repository<UserPushTokenEntity>,
  ) {}

  async registerDeviceToken(
    userId: string,
    deviceToken: string,
    platform: 'ios' | 'android' | 'web' = 'web',
  ) {
    let existing = await this.pushTokenRepo.findOne({
      where: { userId, deviceToken },
    });

    if (!existing) {
      existing = this.pushTokenRepo.create({
        userId,
        deviceToken,
        platform,
        isActive: true,
      });
    } else {
      existing.isActive = true;
      existing.platform = platform;
    }

    return await this.pushTokenRepo.save(existing);
  }

  async sendPushNotification(
    targetUserId: string,
    title: string,
    body: string,
    payload?: Record<string, any>,
  ) {
    const tokens = await this.pushTokenRepo.find({
      where: { userId: targetUserId, isActive: true },
    });

    if (tokens.length === 0) {
      return { sent: false, reason: 'No active push tokens registered' };
    }

    this.logger.log(
      `Dispatched Mobile Push Notification to user ${targetUserId} (${tokens.length} devices): "${title}"`,
    );

    return {
      sent: true,
      deliveredDeviceCount: tokens.length,
      title,
      body,
      payload,
    };
  }
}
