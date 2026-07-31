import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';

/**
 * Public webhook receiver. No auth, no /api prefix (mounted separately in
 * main.ts) so gateways can post directly to /webhooks/:provider.
 *
 * Raw body preservation is critical for Stripe signature verification —
 * see main.ts where a JSON parser is skipped for /webhooks/* routes.
 */
@ApiExcludeController()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  async ingest(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: Request,
  ) {
    const rawBody: Buffer | string =
      (req as any).rawBody ??
      (Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body ?? ''));
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
      req.socket?.remoteAddress ??
      null;
    return this.paymentsService.handleWebhook(provider, rawBody, headers, ip);
  }
}
