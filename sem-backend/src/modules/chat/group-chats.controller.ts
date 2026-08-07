import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupChatsService } from './group-chats.service';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { UpdateGroupChatDto } from './dto/update-group-chat.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';

@Controller('workspaces/:workspaceId/group-chats')
@UseGuards(JwtAuthGuard)
export class GroupChatsController {
  constructor(private readonly groupChatsService: GroupChatsService) {}

  @Get()
  async listUserGroupChats(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.groupChatsService.listUserGroupChats(workspaceId, userId);
  }

  @Post()
  async createGroupChat(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateGroupChatDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.groupChatsService.createGroupChat(workspaceId, userId, dto);
  }

  @Get(':groupId')
  async getGroupChatDetails(
    @Param('workspaceId') workspaceId: string,
    @Param('groupId') groupId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.groupChatsService.getGroupChatDetails(
      workspaceId,
      groupId,
      userId,
    );
  }

  @Patch(':groupId')
  async updateGroupChat(
    @Param('workspaceId') workspaceId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupChatDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.groupChatsService.updateGroupChat(
      workspaceId,
      groupId,
      dto,
      userId,
    );
  }

  @Delete(':groupId')
  async deleteGroupChat(
    @Param('workspaceId') workspaceId: string,
    @Param('groupId') groupId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.groupChatsService.deleteGroupChat(workspaceId, groupId, userId);
  }

  @Post(':groupId/members')
  async addMember(
    @Param('workspaceId') workspaceId: string,
    @Param('groupId') groupId: string,
    @Body('userId') targetUserId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.groupChatsService.addMember(
      workspaceId,
      groupId,
      targetUserId,
      userId,
    );
  }

  @Delete(':groupId/members/:targetUserId')
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('groupId') groupId: string,
    @Param('targetUserId') targetUserId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.groupChatsService.removeMember(
      workspaceId,
      groupId,
      targetUserId,
      userId,
    );
  }

  @Post(':groupId/leave')
  async leaveGroup(
    @Param('workspaceId') workspaceId: string,
    @Param('groupId') groupId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.groupChatsService.leaveGroup(workspaceId, groupId, userId);
  }

  @Get(':groupId/messages')
  async getMessages(
    @Param('workspaceId') workspaceId: string,
    @Param('groupId') groupId: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.groupChatsService.getMessages(
      workspaceId,
      groupId,
      userId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post(':groupId/messages')
  async sendMessage(
    @Param('workspaceId') workspaceId: string,
    @Param('groupId') groupId: string,
    @Body() dto: SendGroupMessageDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.groupChatsService.sendMessage(
      workspaceId,
      groupId,
      userId,
      dto,
    );
  }

  @Post(':groupId/read')
  async markAsRead(
    @Param('workspaceId') workspaceId: string,
    @Param('groupId') groupId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.groupChatsService.markAsRead(workspaceId, groupId, userId);
  }
}
