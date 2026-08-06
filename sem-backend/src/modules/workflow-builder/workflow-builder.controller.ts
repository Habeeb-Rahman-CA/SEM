import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  WorkflowBuilderService,
  WorkflowModuleType,
} from './workflow-builder.service';

interface AuthenticatedRequest {
  user?: {
    id?: string;
  };
}

@ApiTags('workflow-builder')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowBuilderController {
  constructor(
    private readonly workflowBuilderService: WorkflowBuilderService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List workspace active reusable workflow pipelines',
  })
  async listWorkflows(
    @Param('workspaceId') workspaceId: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.workflowBuilderService.listWorkflows(
      workspaceId,
      req?.user?.id,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new reusable workflow pipeline for an item',
  })
  async createWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Body()
    dto: {
      module: WorkflowModuleType;
      itemName: string;
      itemRefId: string;
      authorName?: string;
      reviewerName?: string;
      approverName?: string;
    },
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.workflowBuilderService.createWorkflow(
      workspaceId,
      dto,
      req?.user?.id,
    );
  }

  @Post(':id/transition')
  @ApiOperation({
    summary:
      'Advance or reject workflow stage (Create → Review → Approve → Publish)',
  })
  async transitionWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body()
    dto: {
      action: 'submit' | 'approve' | 'reject' | 'publish';
      actorName?: string;
      comment?: string;
    },
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.workflowBuilderService.transitionWorkflow(
      workspaceId,
      id,
      dto.action,
      dto.actorName || 'Workspace User',
      dto.comment,
      req?.user?.id,
    );
  }
}
