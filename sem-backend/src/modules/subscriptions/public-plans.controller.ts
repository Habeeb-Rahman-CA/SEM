import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';

/**
 * Public pricing catalog — powers the /pricing marketing page. No auth,
 * no gates; returns the same seeded plans that the app enforces
 * internally, so pricing shown to prospects is guaranteed to match what
 * they'll actually get after signing up.
 */
@ApiTags('public-plans')
@Controller('public/plans')
export class PublicPlansController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'List active subscription plans' })
  @ApiResponse({
    status: 200,
    description: 'Array of active plans, sorted by tier',
  })
  async list() {
    return this.subscriptionsService.listPlans();
  }
}
