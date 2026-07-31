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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { CreateWindowDto, UpdateWindowDto } from './dto/create-window.dto';
import {
  CreateTransferRequestDto,
  ReviewTransferRequestDto,
} from './dto/create-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { TransferStatus } from './entities/transfer-request.entity';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const REQ = { name: 'id', description: 'Transfer request UUID' };
const WIN = { name: 'windowId', description: 'Transfer window UUID' };
const PLAYER = { name: 'playerId', description: 'Player UUID' };

@ApiTags('transfers')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  // ─── Summary ─────────────────────────────────────────────────────────

  @Get('transfers/summary')
  @ApiOperation({ summary: 'Transfer dashboard summary' })
  @ApiParam(WS)
  getSummary(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.service.getSummary(workspaceId, req.user.id);
  }

  // ─── Windows ─────────────────────────────────────────────────────────

  @Get('transfer-windows')
  @ApiOperation({ summary: 'List configured transfer windows' })
  @ApiParam(WS)
  getWindows(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.service.getWindows(workspaceId, req.user.id);
  }

  @Post('transfer-windows')
  @ApiOperation({ summary: 'Create a transfer window' })
  @ApiParam(WS)
  createWindow(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWindowDto,
    @Request() req: any,
  ) {
    return this.service.createWindow(workspaceId, dto, req.user.id);
  }

  @Patch('transfer-windows/:windowId')
  @ApiOperation({ summary: 'Update a transfer window' })
  @ApiParam(WS)
  @ApiParam(WIN)
  updateWindow(
    @Param('workspaceId') workspaceId: string,
    @Param('windowId') windowId: string,
    @Body() dto: UpdateWindowDto,
    @Request() req: any,
  ) {
    return this.service.updateWindow(workspaceId, windowId, dto, req.user.id);
  }

  @Delete('transfer-windows/:windowId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transfer window' })
  @ApiParam(WS)
  @ApiParam(WIN)
  deleteWindow(
    @Param('workspaceId') workspaceId: string,
    @Param('windowId') windowId: string,
    @Request() req: any,
  ) {
    return this.service.deleteWindow(workspaceId, windowId, req.user.id);
  }

  // ─── Requests ────────────────────────────────────────────────────────

  @Get('transfer-requests')
  @ApiOperation({ summary: 'List transfer requests' })
  @ApiParam(WS)
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'playerId', required: false })
  @ApiQuery({ name: 'windowId', required: false })
  getRequests(
    @Param('workspaceId') workspaceId: string,
    @Query('status') status: TransferStatus,
    @Query('teamId') teamId: string,
    @Query('playerId') playerId: string,
    @Query('windowId') windowId: string,
    @Request() req: any,
  ) {
    return this.service.getRequests(workspaceId, req.user.id, {
      status,
      teamId,
      playerId,
      windowId,
    });
  }

  @Get('transfer-requests/:id')
  @ApiOperation({ summary: 'Get a transfer request' })
  @ApiParam(WS)
  @ApiParam(REQ)
  getRequestById(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.getRequestById(workspaceId, id, req.user.id);
  }

  @Post('transfer-requests')
  @ApiOperation({ summary: 'Submit a transfer request' })
  @ApiParam(WS)
  submitRequest(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateTransferRequestDto,
    @Request() req: any,
  ) {
    return this.service.submitRequest(workspaceId, dto, req.user.id);
  }

  @Post('transfer-requests/:id/approve')
  @ApiOperation({
    summary:
      'Approve a transfer request — moves the player to the destination team',
  })
  @ApiParam(WS)
  @ApiParam(REQ)
  approveRequest(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: ReviewTransferRequestDto,
    @Request() req: any,
  ) {
    return this.service.approveRequest(workspaceId, id, dto, req.user.id);
  }

  @Post('transfer-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a transfer request' })
  @ApiParam(WS)
  @ApiParam(REQ)
  rejectRequest(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: ReviewTransferRequestDto,
    @Request() req: any,
  ) {
    return this.service.rejectRequest(workspaceId, id, dto, req.user.id);
  }

  @Post('transfer-requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending transfer request' })
  @ApiParam(WS)
  @ApiParam(REQ)
  cancelRequest(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.cancelRequest(workspaceId, id, req.user.id);
  }

  // ─── Player history ──────────────────────────────────────────────────

  @Get('players/:playerId/transfer-history')
  @ApiOperation({
    summary: 'Player transfer history — historical moves + all requests',
  })
  @ApiParam(WS)
  @ApiParam(PLAYER)
  getPlayerHistory(
    @Param('workspaceId') workspaceId: string,
    @Param('playerId') playerId: string,
    @Request() req: any,
  ) {
    return this.service.getPlayerHistory(workspaceId, playerId, req.user.id);
  }
}
