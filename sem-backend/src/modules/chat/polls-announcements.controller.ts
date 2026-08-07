import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PollsAnnouncementsService } from './polls-announcements.service';

@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class PollsAnnouncementsController {
  constructor(private readonly service: PollsAnnouncementsService) {}

  @Post('polls')
  async createPoll(
    @Param('workspaceId') workspaceId: string,
    @Body() body: any,
  ) {
    return await this.service.createPoll({ ...body, workspaceId });
  }

  @Post('polls/:id/vote')
  async votePoll(
    @Param('id') id: string,
    @Body() body: { userId: string; optionId: string },
  ) {
    return await this.service.votePoll(id, body.userId, body.optionId);
  }

  @Post('announcements')
  async createAnnouncement(
    @Param('workspaceId') workspaceId: string,
    @Body() body: any,
  ) {
    return await this.service.createAnnouncement({ ...body, workspaceId });
  }

  @Patch('announcements/:id/acknowledge')
  async acknowledgeAnnouncement(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return await this.service.acknowledgeAnnouncement(id, body.userId);
  }
}
