import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatMobileService } from './chat-mobile.service';

@Controller('chat/mobile')
@UseGuards(JwtAuthGuard)
export class ChatMobileController {
  constructor(private readonly mobileService: ChatMobileService) {}

  @Post('push-tokens')
  async registerPushToken(
    @Req() req: any,
    @Body('deviceToken') deviceToken: string,
    @Body('platform') platform: 'ios' | 'android' | 'web',
  ) {
    const userId = req.user?.id || 'user-1';
    return await this.mobileService.registerDeviceToken(
      userId,
      deviceToken,
      platform,
    );
  }

  @Post('push-notifications/send')
  async sendNotification(
    @Body('targetUserId') targetUserId: string,
    @Body('title') title: string,
    @Body('body') body: string,
    @Body('payload') payload?: Record<string, any>,
  ) {
    return await this.mobileService.sendPushNotification(
      targetUserId,
      title,
      body,
      payload,
    );
  }
}
