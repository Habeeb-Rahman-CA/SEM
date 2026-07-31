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
import { FinanceService } from './finance.service';
import { UpsertAccountDto } from './dto/account.dto';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { PaymentCategory, PaymentStatus } from './entities/payment.entity';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const TEAM = { name: 'teamId', description: 'Team UUID' };
const ACCOUNT = { name: 'accountId', description: 'Financial account UUID' };
const PAYMENT = { name: 'paymentId', description: 'Payment UUID' };

@ApiTags('finance')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  // ─── Workspace summary ───────────────────────────────────────────────

  @Get('finance/summary')
  @ApiOperation({ summary: 'Workspace-wide financial summary' })
  @ApiParam(WS)
  @ApiQuery({ name: 'season', required: false })
  getWorkspaceSummary(
    @Param('workspaceId') workspaceId: string,
    @Query('season') season: string,
    @Request() req: any,
  ) {
    return this.service.getWorkspaceSummary(workspaceId, req.user.id, season);
  }

  // ─── Accounts ────────────────────────────────────────────────────────

  @Get('finance/accounts')
  @ApiOperation({ summary: 'List team financial accounts' })
  @ApiParam(WS)
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'season', required: false })
  getAccounts(
    @Param('workspaceId') workspaceId: string,
    @Query('teamId') teamId: string,
    @Query('season') season: string,
    @Request() req: any,
  ) {
    return this.service.getAccounts(workspaceId, req.user.id, {
      teamId,
      season,
    });
  }

  @Post('finance/accounts')
  @ApiOperation({
    summary: 'Create or update a team financial account (per season)',
  })
  @ApiParam(WS)
  upsertAccount(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpsertAccountDto,
    @Request() req: any,
  ) {
    return this.service.upsertAccount(workspaceId, dto, req.user.id);
  }

  @Delete('finance/accounts/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a team financial account' })
  @ApiParam(WS)
  @ApiParam(ACCOUNT)
  deleteAccount(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @Request() req: any,
  ) {
    return this.service.deleteAccount(workspaceId, accountId, req.user.id);
  }

  // ─── Payments ────────────────────────────────────────────────────────

  @Get('finance/payments')
  @ApiOperation({ summary: 'List payment ledger entries' })
  @ApiParam(WS)
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'season', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  getPayments(
    @Param('workspaceId') workspaceId: string,
    @Query('teamId') teamId: string,
    @Query('season') season: string,
    @Query('category') category: PaymentCategory,
    @Query('status') status: PaymentStatus,
    @Request() req: any,
  ) {
    return this.service.getPayments(workspaceId, req.user.id, {
      teamId,
      season,
      category,
      status,
    });
  }

  @Post('finance/payments')
  @ApiOperation({ summary: 'Record a payment (incoming or outgoing)' })
  @ApiParam(WS)
  createPayment(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreatePaymentDto,
    @Request() req: any,
  ) {
    return this.service.createPayment(workspaceId, dto, req.user.id);
  }

  @Patch('finance/payments/:paymentId')
  @ApiOperation({ summary: 'Update a payment (status, amount, notes)' })
  @ApiParam(WS)
  @ApiParam(PAYMENT)
  updatePayment(
    @Param('workspaceId') workspaceId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdatePaymentDto,
    @Request() req: any,
  ) {
    return this.service.updatePayment(workspaceId, paymentId, dto, req.user.id);
  }

  @Delete('finance/payments/:paymentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a payment record' })
  @ApiParam(WS)
  @ApiParam(PAYMENT)
  deletePayment(
    @Param('workspaceId') workspaceId: string,
    @Param('paymentId') paymentId: string,
    @Request() req: any,
  ) {
    return this.service.deletePayment(workspaceId, paymentId, req.user.id);
  }

  // ─── Team report ─────────────────────────────────────────────────────

  @Get('finance/team-report/:teamId')
  @ApiOperation({
    summary:
      'Team financial report — auction spend, transfer fees, salary commitment, payments',
  })
  @ApiParam(WS)
  @ApiParam(TEAM)
  @ApiQuery({ name: 'season', required: true })
  getTeamReport(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Query('season') season: string,
    @Request() req: any,
  ) {
    return this.service.getTeamReport(workspaceId, teamId, season, req.user.id);
  }

  // ─── Sync from sources ───────────────────────────────────────────────

  @Post('finance/sync')
  @ApiOperation({
    summary:
      'Materialize completed transfer fees & active contract salaries into payment ledger for a season',
  })
  @ApiParam(WS)
  @ApiQuery({ name: 'season', required: true })
  syncFromSources(
    @Param('workspaceId') workspaceId: string,
    @Query('season') season: string,
    @Request() req: any,
  ) {
    return this.service.syncFromSources(workspaceId, season, req.user.id);
  }
}
