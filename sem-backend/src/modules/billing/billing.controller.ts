import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import {
  RecordPaymentDto,
  UpdateBillingProfileDto,
  UpsertBillingContactDto,
} from './dto/update-billing-profile.dto';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Profile ─────────────────────────────────────────────────────────

  @Get('profile')
  @ApiOperation({ summary: 'Get billing profile (auto-provisions if missing)' })
  @ApiParam({ name: 'workspaceId' })
  async getProfile(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.billingService.getProfile(workspaceId, req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update billing profile (company, tax, address)' })
  async updateProfile(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateBillingProfileDto,
    @Request() req: any,
  ) {
    return this.billingService.updateProfile(workspaceId, dto, req.user.id);
  }

  // ─── Contacts ────────────────────────────────────────────────────────

  @Get('contacts')
  @ApiOperation({ summary: 'List billing contacts for the workspace' })
  async listContacts(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.billingService.listContacts(workspaceId, req.user.id);
  }

  @Post('contacts')
  @ApiOperation({ summary: 'Add a billing contact' })
  async createContact(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpsertBillingContactDto,
    @Request() req: any,
  ) {
    return this.billingService.createContact(workspaceId, dto, req.user.id);
  }

  @Patch('contacts/:contactId')
  @ApiOperation({ summary: 'Update a billing contact' })
  async updateContact(
    @Param('workspaceId') workspaceId: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpsertBillingContactDto,
    @Request() req: any,
  ) {
    return this.billingService.updateContact(
      workspaceId,
      contactId,
      dto,
      req.user.id,
    );
  }

  @Delete('contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a billing contact' })
  async removeContact(
    @Param('workspaceId') workspaceId: string,
    @Param('contactId') contactId: string,
    @Request() req: any,
  ) {
    return this.billingService.removeContact(
      workspaceId,
      contactId,
      req.user.id,
    );
  }

  // ─── Invoices ────────────────────────────────────────────────────────

  @Get('invoices')
  @ApiOperation({
    summary: 'List invoices for the workspace (most recent first)',
  })
  async listInvoices(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.billingService.listInvoices(workspaceId, req.user.id);
  }

  @Get('invoices/:invoiceId')
  @ApiOperation({ summary: 'Get an invoice (line items, payments, bill-to)' })
  @ApiResponse({ status: 200, description: 'Invoice detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getInvoice(
    @Param('workspaceId') workspaceId: string,
    @Param('invoiceId') invoiceId: string,
    @Request() req: any,
  ) {
    return this.billingService.getInvoice(workspaceId, invoiceId, req.user.id);
  }

  @Post('invoices/:invoiceId/payments')
  @ApiOperation({
    summary: 'Record a payment against an invoice',
    description:
      'Adds a payment record to the invoice. When the sum of successful payments meets or exceeds the invoice total, the invoice status flips to `paid`.',
  })
  async recordPayment(
    @Param('workspaceId') workspaceId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: RecordPaymentDto,
    @Request() req: any,
  ) {
    return this.billingService.recordPayment(
      workspaceId,
      invoiceId,
      dto,
      req.user.id,
    );
  }

  @Post('invoices/:invoiceId/void')
  @ApiOperation({ summary: 'Void an unpaid invoice' })
  async voidInvoice(
    @Param('workspaceId') workspaceId: string,
    @Param('invoiceId') invoiceId: string,
    @Request() req: any,
  ) {
    return this.billingService.voidInvoice(workspaceId, invoiceId, req.user.id);
  }
}
