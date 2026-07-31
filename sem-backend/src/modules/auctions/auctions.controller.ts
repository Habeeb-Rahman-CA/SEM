import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto, UpdateAuctionDto } from './dto/create-auction.dto';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/create-category.dto';
import {
  RegisterPlayersDto,
  UpdateAuctionPlayerDto,
} from './dto/register-players.dto';
import { PlaceBidDto, StartBiddingDto } from './dto/place-bid.dto';
import { UpsertTeamBudgetDto } from './dto/team-budget.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const AUCTION = { name: 'auctionId', description: 'Auction UUID' };
const CAT = { name: 'categoryId', description: 'Auction category UUID' };
const AP = { name: 'auctionPlayerId', description: 'Auction player UUID' };
const BUDGET = { name: 'budgetId', description: 'Team budget UUID' };

@ApiTags('auctions')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class AuctionsController {
  constructor(private readonly service: AuctionsService) {}

  // ─── Workspace summary ───────────────────────────────────────────────

  @Get('auctions/summary')
  @ApiOperation({ summary: 'Auctions dashboard summary (workspace-wide)' })
  @ApiParam(WS)
  getWorkspaceSummary(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.service.getWorkspaceSummary(workspaceId, req.user.id);
  }

  // ─── Auctions CRUD ───────────────────────────────────────────────────

  @Get('auctions')
  @ApiOperation({ summary: 'List auctions' })
  @ApiParam(WS)
  getAuctions(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.service.getAuctions(workspaceId, req.user.id);
  }

  @Get('auctions/:auctionId')
  @ApiOperation({ summary: 'Get auction with categories, players, budgets' })
  @ApiParam(WS)
  @ApiParam(AUCTION)
  getAuctionById(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionId') auctionId: string,
    @Request() req: any,
  ) {
    return this.service.getAuctionById(workspaceId, auctionId, req.user.id);
  }

  @Post('auctions')
  @ApiOperation({ summary: 'Create a new auction' })
  @ApiParam(WS)
  createAuction(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateAuctionDto,
    @Request() req: any,
  ) {
    return this.service.createAuction(workspaceId, dto, req.user.id);
  }

  @Patch('auctions/:auctionId')
  @ApiOperation({
    summary: 'Update auction settings or status (draft/scheduled/live/etc.)',
  })
  @ApiParam(WS)
  @ApiParam(AUCTION)
  updateAuction(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionId') auctionId: string,
    @Body() dto: UpdateAuctionDto,
    @Request() req: any,
  ) {
    return this.service.updateAuction(workspaceId, auctionId, dto, req.user.id);
  }

  @Delete('auctions/:auctionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an auction' })
  @ApiParam(WS)
  @ApiParam(AUCTION)
  deleteAuction(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionId') auctionId: string,
    @Request() req: any,
  ) {
    return this.service.deleteAuction(workspaceId, auctionId, req.user.id);
  }

  // ─── Categories ──────────────────────────────────────────────────────

  @Post('auctions/:auctionId/categories')
  @ApiOperation({ summary: 'Create a player category with base price' })
  @ApiParam(WS)
  @ApiParam(AUCTION)
  createCategory(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionId') auctionId: string,
    @Body() dto: CreateCategoryDto,
    @Request() req: any,
  ) {
    return this.service.createCategory(
      workspaceId,
      auctionId,
      dto,
      req.user.id,
    );
  }

  @Patch('auction-categories/:categoryId')
  @ApiOperation({ summary: 'Update a player category' })
  @ApiParam(WS)
  @ApiParam(CAT)
  updateCategory(
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
    @Request() req: any,
  ) {
    return this.service.updateCategory(
      workspaceId,
      categoryId,
      dto,
      req.user.id,
    );
  }

  @Delete('auction-categories/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a player category' })
  @ApiParam(WS)
  @ApiParam(CAT)
  deleteCategory(
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
    @Request() req: any,
  ) {
    return this.service.deleteCategory(workspaceId, categoryId, req.user.id);
  }

  // ─── Players ─────────────────────────────────────────────────────────

  @Post('auctions/:auctionId/players')
  @ApiOperation({ summary: 'Register one or more players for auction' })
  @ApiParam(WS)
  @ApiParam(AUCTION)
  registerPlayers(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionId') auctionId: string,
    @Body() dto: RegisterPlayersDto,
    @Request() req: any,
  ) {
    return this.service.registerPlayers(
      workspaceId,
      auctionId,
      dto,
      req.user.id,
    );
  }

  @Patch('auction-players/:auctionPlayerId')
  @ApiOperation({ summary: 'Update auction player (category, base price)' })
  @ApiParam(WS)
  @ApiParam(AP)
  updateAuctionPlayer(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionPlayerId') auctionPlayerId: string,
    @Body() dto: UpdateAuctionPlayerDto,
    @Request() req: any,
  ) {
    return this.service.updateAuctionPlayer(
      workspaceId,
      auctionPlayerId,
      dto,
      req.user.id,
    );
  }

  @Delete('auction-players/:auctionPlayerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Withdraw a player from an auction' })
  @ApiParam(WS)
  @ApiParam(AP)
  removeAuctionPlayer(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionPlayerId') auctionPlayerId: string,
    @Request() req: any,
  ) {
    return this.service.removeAuctionPlayer(
      workspaceId,
      auctionPlayerId,
      req.user.id,
    );
  }

  // ─── Team Budgets ────────────────────────────────────────────────────

  @Post('auctions/:auctionId/team-budgets')
  @ApiOperation({
    summary: 'Register or update a team budget for the auction',
  })
  @ApiParam(WS)
  @ApiParam(AUCTION)
  upsertTeamBudget(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionId') auctionId: string,
    @Body() dto: UpsertTeamBudgetDto,
    @Request() req: any,
  ) {
    return this.service.upsertTeamBudget(
      workspaceId,
      auctionId,
      dto,
      req.user.id,
    );
  }

  @Delete('auction-team-budgets/:budgetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a team from an auction' })
  @ApiParam(WS)
  @ApiParam(BUDGET)
  removeTeamBudget(
    @Param('workspaceId') workspaceId: string,
    @Param('budgetId') budgetId: string,
    @Request() req: any,
  ) {
    return this.service.removeTeamBudget(workspaceId, budgetId, req.user.id);
  }

  // ─── Bidding ─────────────────────────────────────────────────────────

  @Post('auctions/:auctionId/start-bidding')
  @ApiOperation({ summary: 'Open the bidding window for a specific player' })
  @ApiParam(WS)
  @ApiParam(AUCTION)
  startBidding(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionId') auctionId: string,
    @Body() dto: StartBiddingDto,
    @Request() req: any,
  ) {
    return this.service.startBidding(workspaceId, auctionId, dto, req.user.id);
  }

  @Post('auctions/:auctionId/bid')
  @ApiOperation({ summary: 'Place a bid on the current player' })
  @ApiParam(WS)
  @ApiParam(AUCTION)
  placeBid(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionId') auctionId: string,
    @Body() dto: PlaceBidDto,
    @Request() req: any,
  ) {
    return this.service.placeBid(workspaceId, auctionId, dto, req.user.id);
  }

  @Post('auctions/:auctionId/close-bidding')
  @ApiOperation({
    summary:
      'Close the current bidding round — auto-assign to highest bidder or mark unsold',
  })
  @ApiParam(WS)
  @ApiParam(AUCTION)
  closeBidding(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionId') auctionId: string,
    @Request() req: any,
  ) {
    return this.service.closeBidding(workspaceId, auctionId, req.user.id);
  }

  @Post('auctions/:auctionId/cancel-round')
  @ApiOperation({
    summary: 'Cancel the current bidding round (withdraw bids, no assignment)',
  })
  @ApiParam(WS)
  @ApiParam(AUCTION)
  cancelRound(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionId') auctionId: string,
    @Request() req: any,
  ) {
    return this.service.cancelCurrentRound(workspaceId, auctionId, req.user.id);
  }

  @Get('auctions/:auctionId/live')
  @ApiOperation({
    summary:
      'Live auction status — current player, recent bids, remaining team budgets',
  })
  @ApiParam(WS)
  @ApiParam(AUCTION)
  getLiveStatus(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionId') auctionId: string,
    @Request() req: any,
  ) {
    return this.service.getLiveStatus(workspaceId, auctionId, req.user.id);
  }

  @Get('auctions/:auctionId/summary')
  @ApiOperation({ summary: 'Auction summary report' })
  @ApiParam(WS)
  @ApiParam(AUCTION)
  getSummary(
    @Param('workspaceId') workspaceId: string,
    @Param('auctionId') auctionId: string,
    @Request() req: any,
  ) {
    return this.service.getSummary(workspaceId, auctionId, req.user.id);
  }
}
