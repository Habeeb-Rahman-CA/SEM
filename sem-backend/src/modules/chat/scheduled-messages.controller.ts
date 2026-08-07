import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScheduledMessagesService } from './scheduled-messages.service';

@Controller('workspaces/:workspaceId/scheduled-messages')
@UseGuards(JwtAuthGuard)
export class ScheduledMessagesController {
  constructor(private readonly service: ScheduledMessagesService) {}

  @Get(':senderId')
  async getScheduled(
    @Param('workspaceId') workspaceId: string,
    @Param('senderId') senderId: string,
  ) {
    return await this.service.getScheduledMessages(workspaceId, senderId);
  }

  @Post()
  async createScheduled(
    @Param('workspaceId') workspaceId: string,
    @Body() body: any,
  ) {
    return await this.service.createScheduledMessage({ ...body, workspaceId });
  }

  @Delete(':id')
  async cancelScheduled(@Param('id') id: string) {
    return await this.service.cancelScheduledMessage(id);
  }
}
