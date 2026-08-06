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
import { TrashService, TrashedItemType } from './trash.service';
import { UndoService } from './undo.service';

@ApiTags('trash')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/trash')
@UseGuards(JwtAuthGuard)
export class TrashController {
  constructor(
    private readonly trashService: TrashService,
    private readonly undoService: UndoService,
  ) {}

  @Post('undo')
  @ApiOperation({
    summary: 'Perform an Undo action for the last workspace operation',
  })
  async undo(@Param('workspaceId') workspaceId: string) {
    return this.undoService.performUndo(workspaceId);
  }

  @Post('redo')
  @ApiOperation({
    summary: 'Perform a Redo action for the last undone workspace operation',
  })
  async redo(@Param('workspaceId') workspaceId: string) {
    return this.undoService.performRedo(workspaceId);
  }

  @Get()
  @ApiOperation({
    summary: 'List all soft-deleted workspace items in Recycle Bin',
  })
  async listTrash(
    @Param('workspaceId') workspaceId: string,
    @Request() req?: any,
  ) {
    return this.trashService.listTrash(workspaceId, req?.user?.id);
  }

  @Post('move')
  @ApiOperation({ summary: 'Move an item to the Recycle Bin (Soft Delete)' })
  async moveToTrash(
    @Param('workspaceId') workspaceId: string,
    @Body()
    dto: {
      itemType: TrashedItemType;
      itemId: string;
      itemName: string;
      deletedBy?: string;
      itemData?: Record<string, any>;
    },
    @Request() req?: any,
  ) {
    return this.trashService.moveToTrash(workspaceId, dto, req?.user?.id);
  }

  @Post(':trashId/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted item from Recycle Bin' })
  async restoreFromTrash(
    @Param('workspaceId') workspaceId: string,
    @Param('trashId') trashId: string,
    @Request() req?: any,
  ) {
    return this.trashService.restoreFromTrash(
      workspaceId,
      trashId,
      req?.user?.id,
    );
  }

  @Delete(':trashId/permanent')
  @ApiOperation({
    summary: 'Permanently purge a soft-deleted item from Recycle Bin',
  })
  async purgeFromTrash(
    @Param('workspaceId') workspaceId: string,
    @Param('trashId') trashId: string,
    @Request() req?: any,
  ) {
    return this.trashService.purgeFromTrash(
      workspaceId,
      trashId,
      req?.user?.id,
    );
  }

  @Delete('empty')
  @ApiOperation({ summary: 'Empty all soft-deleted items from Recycle Bin' })
  async emptyTrash(
    @Param('workspaceId') workspaceId: string,
    @Request() req?: any,
  ) {
    return this.trashService.emptyTrash(workspaceId, req?.user?.id);
  }
}
