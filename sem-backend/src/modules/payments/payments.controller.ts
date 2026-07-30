import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import {
  ConfirmMockIntentDto,
  CreateIntentForInvoiceDto,
  RefundInvoiceDto,
} from './dto/payment.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('payments/provider')
  @ApiOperation({
    summary: 'Get active payment provider info (code, displayName, isLive)',
  })
  activeProvider() {
    return this.paymentsService.activeProviderInfo();
  }

  @Post('billing/invoices/:invoiceId/pay')
  @ApiOperation({
    summary: 'Create a payment intent for an invoice',
    description:
      "Creates an intent with the active PAYMENT_PROVIDER. The response contains the provider's client secret / checkout URL in `metadata` — the frontend uses it to finalise the charge.",
  })
  @ApiParam({ name: 'workspaceId' })
  @ApiParam({ name: 'invoiceId' })
  async createIntent(
    @Param('workspaceId') workspaceId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreateIntentForInvoiceDto,
    @Request() req: any,
  ) {
    return this.paymentsService.createIntentForInvoice(
      workspaceId,
      invoiceId,
      req.user.id,
      dto.returnUrl,
    );
  }

  @Post('payments/confirm-mock')
  @ApiOperation({
    summary: 'Mock-only: force a payment intent to succeed',
    description:
      'Available when PAYMENT_PROVIDER=mock. Feeds a synthetic webhook through the same handler real gateways use, so the invoice, audit log, and downstream side-effects behave identically.',
  })
  async confirmMock(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ConfirmMockIntentDto,
    @Request() req: any,
  ) {
    const ip = req.ip ?? req.socket?.remoteAddress ?? null;
    return this.paymentsService.confirmMockIntent(
      workspaceId,
      dto.providerRef,
      req.user.id,
      ip,
    );
  }

  @Post('billing/invoices/:invoiceId/refund')
  @ApiOperation({ summary: 'Refund the invoice (full or partial)' })
  async refund(
    @Param('workspaceId') workspaceId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: RefundInvoiceDto,
    @Request() req: any,
  ) {
    return this.paymentsService.refundInvoice(
      workspaceId,
      invoiceId,
      dto.amountCents,
      dto.reason,
      req.user.id,
    );
  }

  @Get('billing/invoices/:invoiceId/payment-intents')
  @ApiOperation({ summary: 'List payment intents for an invoice' })
  async listIntents(
    @Param('workspaceId') workspaceId: string,
    @Param('invoiceId') invoiceId: string,
    @Request() req: any,
  ) {
    return this.paymentsService.listIntents(
      workspaceId,
      invoiceId,
      req.user.id,
    );
  }

  @Get('payments/audit')
  @ApiOperation({ summary: 'List recent payment audit log entries' })
  async audit(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit: string | undefined,
    @Request() req: any,
  ) {
    const n = limit ? Number(limit) : 100;
    return this.paymentsService.listAudit(workspaceId, req.user.id, n);
  }
}
