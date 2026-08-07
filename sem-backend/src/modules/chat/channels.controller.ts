import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { AddChannelMemberDto } from './dto/add-channel-member.dto';

@Controller('workspaces/:workspaceId/channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  async listChannels(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    return this.channelsService.listChannels(workspaceId, req.user.id);
  }

  @Post()
  async createChannel(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateChannelDto,
    @Req() req: any,
  ) {
    return this.channelsService.createChannel(workspaceId, dto, req.user.id);
  }

  @Post('seed-defaults')
  async seedDefaults(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    return this.channelsService.ensureDefaultChannels(workspaceId, req.user.id);
  }

  @Get(':channelId')
  async getChannel(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Req() req: any,
  ) {
    return this.channelsService.getChannel(workspaceId, channelId, req.user.id);
  }

  @Patch(':channelId')
  async updateChannel(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateChannelDto,
    @Req() req: any,
  ) {
    return this.channelsService.updateChannel(
      workspaceId,
      channelId,
      dto,
      req.user.id,
    );
  }

  @Delete(':channelId')
  async deleteChannel(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Req() req: any,
  ) {
    return this.channelsService.deleteChannel(
      workspaceId,
      channelId,
      req.user.id,
    );
  }

  @Post(':channelId/join')
  async joinChannel(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Req() req: any,
  ) {
    return this.channelsService.joinChannel(
      workspaceId,
      channelId,
      req.user.id,
    );
  }

  @Post(':channelId/leave')
  async leaveChannel(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Req() req: any,
  ) {
    return this.channelsService.leaveChannel(
      workspaceId,
      channelId,
      req.user.id,
    );
  }

  @Post(':channelId/members')
  async addMember(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Body() dto: AddChannelMemberDto,
    @Req() req: any,
  ) {
    return this.channelsService.addMember(
      workspaceId,
      channelId,
      dto,
      req.user.id,
    );
  }

  @Delete(':channelId/members/:userId')
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Param('userId') targetUserId: string,
    @Req() req: any,
  ) {
    return this.channelsService.removeMember(
      workspaceId,
      channelId,
      targetUserId,
      req.user.id,
    );
  }
}
