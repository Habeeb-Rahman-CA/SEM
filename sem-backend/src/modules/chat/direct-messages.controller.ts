import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DirectMessagesService } from './direct-messages.service';
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';
import { UpdateDmSettingsDto } from './dto/update-dm-settings.dto';

@Controller('workspaces/:workspaceId/direct-messages')
@UseGuards(JwtAuthGuard)
export class DirectMessagesController {
  constructor(private readonly dmService: DirectMessagesService) {}

  @Get('conversations')
  async listConversations(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.dmService.listConversations(workspaceId, userId);
  }

  @Post('conversations')
  async getOrCreateConversation(
    @Param('workspaceId') workspaceId: string,
    @Body('recipientUserId') recipientUserId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.dmService.getOrCreateConversation(
      workspaceId,
      userId,
      recipientUserId,
    );
  }

  @Get('conversations/:conversationId/messages')
  async getMessages(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.dmService.getMessages(
      workspaceId,
      conversationId,
      userId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('messages')
  async sendMessage(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateDirectMessageDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.dmService.sendMessage(workspaceId, userId, dto);
  }

  @Patch('conversations/:conversationId/settings')
  async updateParticipantSettings(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: UpdateDmSettingsDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.dmService.updateParticipantSettings(
      workspaceId,
      conversationId,
      userId,
      dto,
    );
  }

  @Post('conversations/:conversationId/read')
  async markAsRead(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.dmService.markAsRead(workspaceId, conversationId, userId);
  }

  @Get('search')
  async searchMessages(
    @Param('workspaceId') workspaceId: string,
    @Query('q') query: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.dmService.searchMessages(workspaceId, userId, query);
  }
}
