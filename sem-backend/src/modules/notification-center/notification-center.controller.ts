import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  NotificationCenterService,
  NotificationTab,
} from './notification-center.service';

@ApiTags('notification-center')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationCenterController {
  constructor(
    private readonly notificationCenterService: NotificationCenterService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List workspace notifications filtered by tab (unread, mentions, support, archived, snoozed)',
  })
  async getNotifications(
    @Param('workspaceId') workspaceId: string,
    @Query('tab') tab?: string,
    @Request() req?: any,
  ) {
    return this.notificationCenterService.getNotifications(
      workspaceId,
      (tab as NotificationTab) || 'all',
      req?.user?.id,
    );
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Toggle read/unread status for a notification' })
  async toggleReadStatus(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: { isRead: boolean },
    @Request() req?: any,
  ) {
    return this.notificationCenterService.toggleReadStatus(
      workspaceId,
      id,
      dto.isRead,
      req?.user?.id,
    );
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a notification' })
  async archiveNotification(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req?: any,
  ) {
    return this.notificationCenterService.archiveNotification(
      workspaceId,
      id,
      req?.user?.id,
    );
  }

  @Post(':id/snooze')
  @ApiOperation({
    summary: 'Snooze a notification for a specified duration in minutes',
  })
  async snoozeNotification(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: { minutes: number },
    @Request() req?: any,
  ) {
    return this.notificationCenterService.snoozeNotification(
      workspaceId,
      id,
      dto.minutes || 60,
      req?.user?.id,
    );
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all workspace notifications as read' })
  async markAllAsRead(
    @Param('workspaceId') workspaceId: string,
    @Request() req?: any,
  ) {
    return this.notificationCenterService.markAllAsRead(
      workspaceId,
      req?.user?.id,
    );
  }
}
