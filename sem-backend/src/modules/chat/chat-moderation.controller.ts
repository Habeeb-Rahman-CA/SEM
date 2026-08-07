import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatModerationService } from './chat-moderation.service';

@Controller('workspaces/:workspaceId/chat/moderation')
@UseGuards(JwtAuthGuard)
export class ChatModerationController {
  constructor(private readonly modService: ChatModerationService) {}

  @Delete('media/:fileId')
  async deleteMedia(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Req() req: any,
    @Body('reason') reason?: string,
  ) {
    const adminId = req.user?.id || 'admin-1';
    return await this.modService.deleteMedia(
      workspaceId,
      fileId,
      adminId,
      reason,
    );
  }

  @Post('mute')
  async muteUser(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
    @Body('targetUserId') targetUserId: string,
    @Body('durationMinutes') durationMinutes?: number,
    @Body('reason') reason?: string,
    @Body('channelId') channelId?: string,
  ) {
    const adminId = req.user?.id || 'admin-1';
    return await this.modService.muteUser(
      workspaceId,
      targetUserId,
      adminId,
      durationMinutes,
      reason,
      channelId,
    );
  }

  @Post('unmute')
  async unmuteUser(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
    @Body('targetUserId') targetUserId: string,
    @Body('channelId') channelId?: string,
  ) {
    const adminId = req.user?.id || 'admin-1';
    return await this.modService.unmuteUser(
      workspaceId,
      targetUserId,
      adminId,
      channelId,
    );
  }

  @Post('ban')
  async banUser(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
    @Body('targetUserId') targetUserId: string,
    @Body('reason') reason?: string,
    @Body('channelId') channelId?: string,
  ) {
    const adminId = req.user?.id || 'admin-1';
    return await this.modService.banUser(
      workspaceId,
      targetUserId,
      adminId,
      reason,
      channelId,
    );
  }

  @Post('unban')
  async unbanUser(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
    @Body('targetUserId') targetUserId: string,
    @Body('channelId') channelId?: string,
  ) {
    const adminId = req.user?.id || 'admin-1';
    return await this.modService.unbanUser(
      workspaceId,
      targetUserId,
      adminId,
      channelId,
    );
  }

  @Post('channels/:channelId/lock')
  async lockChannel(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Req() req: any,
    @Body('isLocked') isLocked: boolean,
    @Body('reason') reason?: string,
  ) {
    const adminId = req.user?.id || 'admin-1';
    return await this.modService.setChannelLock(
      workspaceId,
      channelId,
      adminId,
      isLocked,
      reason,
    );
  }

  @Post('channels/:channelId/archive')
  async archiveChannel(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Req() req: any,
    @Body('isArchived') isArchived: boolean,
    @Body('reason') reason?: string,
  ) {
    const adminId = req.user?.id || 'admin-1';
    return await this.modService.setChannelArchive(
      workspaceId,
      channelId,
      adminId,
      isArchived,
      reason,
    );
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Param('workspaceId') workspaceId: string,
    @Query('channelId') channelId?: string,
    @Query('limit') limit?: number,
  ) {
    return await this.modService.getAuditLogs(
      workspaceId,
      channelId,
      limit ? Number(limit) : 50,
    );
  }
}
