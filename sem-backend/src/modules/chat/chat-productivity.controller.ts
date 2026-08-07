import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatProductivityService } from './chat-productivity.service';

@Controller('workspaces/:workspaceId/chat/productivity')
@UseGuards(JwtAuthGuard)
export class ChatProductivityController {
  constructor(private readonly productivityService: ChatProductivityService) {}

  // 1. Star Messages
  @Post('star')
  async toggleStarMessage(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
    @Body('messageId') messageId: string,
    @Body('messageType') messageType?: string,
  ) {
    const userId = req.user?.id || 'user-1';
    return await this.productivityService.toggleStarMessage(
      workspaceId,
      userId,
      messageId,
      messageType,
    );
  }

  @Get('starred')
  async getStarredMessages(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'user-1';
    return await this.productivityService.getStarredMessages(
      workspaceId,
      userId,
    );
  }

  // 2. Message Reminders
  @Post('reminders')
  async createReminder(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
    @Body('messageId') messageId: string,
    @Body('remindAt') remindAt: string,
    @Body('note') note?: string,
  ) {
    const userId = req.user?.id || 'user-1';
    return await this.productivityService.createReminder(
      workspaceId,
      userId,
      messageId,
      new Date(remindAt),
      note,
    );
  }

  @Get('reminders')
  async getReminders(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'user-1';
    return await this.productivityService.getReminders(workspaceId, userId);
  }

  // 3. Tasks from Messages & Calendar Integration
  @Post('tasks')
  async createTask(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
    @Body('messageId') messageId: string,
    @Body('taskTitle') taskTitle: string,
    @Body('assigneeId') assigneeId?: string,
    @Body('dueDate') dueDate?: string,
  ) {
    const userId = req.user?.id || 'user-1';
    return await this.productivityService.createTaskFromMessage(
      workspaceId,
      userId,
      messageId,
      taskTitle,
      assigneeId,
      dueDate ? new Date(dueDate) : undefined,
    );
  }

  @Get('tasks')
  async getTasks(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    const userId = req.user?.id || 'user-1';
    return await this.productivityService.getTasks(workspaceId, userId);
  }

  @Get('calendar')
  async getCalendarEvents(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'user-1';
    return await this.productivityService.exportCalendarEvents(
      workspaceId,
      userId,
    );
  }

  // 4. Bookmark Conversations
  @Post('bookmarks')
  async toggleBookmark(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
    @Body('targetId') targetId: string,
    @Body('targetType') targetType?: string,
    @Body('label') label?: string,
  ) {
    const userId = req.user?.id || 'user-1';
    return await this.productivityService.toggleBookmark(
      workspaceId,
      userId,
      targetId,
      targetType,
      label,
    );
  }

  @Get('bookmarks')
  async getBookmarks(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'user-1';
    return await this.productivityService.getBookmarks(workspaceId, userId);
  }

  // 5. Jump to First Unread
  @Get('unread-marker')
  async getUnreadMarker(
    @Param('workspaceId') workspaceId: string,
    @Query('channelId') channelId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'user-1';
    return await this.productivityService.getFirstUnreadMarker(
      workspaceId,
      channelId,
      userId,
    );
  }

  // 6. Recently Shared Files
  @Get('recent-files')
  async getRecentlySharedFiles(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: number,
  ) {
    return await this.productivityService.getRecentlySharedFiles(
      workspaceId,
      limit ? Number(limit) : 10,
    );
  }
}
