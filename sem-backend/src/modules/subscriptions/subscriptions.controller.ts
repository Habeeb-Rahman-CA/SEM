import {
  Body,
  Controller,
  Get,
  Param,
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
import { SubscriptionsService } from './subscriptions.service';
import { ChangePlanDto } from './dto/change-plan.dto';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current subscription, plan, and usage snapshot',
  })
  @ApiParam({ name: 'workspaceId' })
  @ApiResponse({
    status: 200,
    description:
      'Current subscription + plan + usage snapshot + enforcement flag',
  })
  async get(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.subscriptionsService.getWorkspaceSubscriptionWithUsage(
      workspaceId,
      req.user.id,
    );
  }

  @Post('change')
  @ApiOperation({
    summary: 'Change plan (upgrade / downgrade / start trial)',
    description:
      'Switches the workspace subscription to the specified plan code. When `startTrial=true` and the target plan supports a trial, the subscription is put in the trialing state with a trial end date.',
  })
  async change(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ChangePlanDto,
    @Request() req: any,
  ) {
    return this.subscriptionsService.changePlan(workspaceId, dto, req.user.id);
  }

  @Post('cancel')
  @ApiOperation({
    summary: 'Cancel at period end',
    description:
      'Marks the subscription for cancellation when the current period ends. The workspace keeps its plan features until then. Use POST /resume to undo before the period ends.',
  })
  async cancel(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.subscriptionsService.cancelSubscription(
      workspaceId,
      req.user.id,
    );
  }

  @Post('resume')
  @ApiOperation({ summary: 'Undo a pending cancellation' })
  async resume(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.subscriptionsService.resumeSubscription(
      workspaceId,
      req.user.id,
    );
  }
}
