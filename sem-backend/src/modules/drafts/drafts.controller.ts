import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DraftFormType, DraftsService } from './drafts.service';

@ApiTags('drafts')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/drafts')
@UseGuards(JwtAuthGuard)
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Get()
  @ApiOperation({ summary: 'List all saved drafts for unfinished work' })
  async listDrafts(
    @Param('workspaceId') workspaceId: string,
    @Request() req?: any,
  ) {
    return this.draftsService.listDrafts(workspaceId, req?.user?.id);
  }

  @Get(':draftId')
  @ApiOperation({ summary: 'Get a single saved draft payload by ID' })
  async getDraft(
    @Param('workspaceId') workspaceId: string,
    @Param('draftId') draftId: string,
    @Request() req?: any,
  ) {
    return this.draftsService.getDraft(workspaceId, draftId, req?.user?.id);
  }

  @Post()
  @ApiOperation({ summary: 'Save or update unfinished work as a draft' })
  async saveDraft(
    @Param('workspaceId') workspaceId: string,
    @Body()
    dto: {
      id?: string;
      title: string;
      formType: DraftFormType;
      progressPercent?: number;
      formData: Record<string, any>;
      updatedBy?: string;
    },
    @Request() req?: any,
  ) {
    return this.draftsService.saveDraft(workspaceId, dto, req?.user?.id);
  }

  @Delete(':draftId')
  @ApiOperation({ summary: 'Discard or delete a saved draft' })
  async deleteDraft(
    @Param('workspaceId') workspaceId: string,
    @Param('draftId') draftId: string,
    @Request() req?: any,
  ) {
    return this.draftsService.deleteDraft(workspaceId, draftId, req?.user?.id);
  }
}
