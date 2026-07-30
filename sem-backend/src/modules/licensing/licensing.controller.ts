import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { LicensingService } from './licensing.service';
import { FEATURE_REGISTRY } from './feature-codes';
import type { FeatureCode } from './feature-codes';

class SetOverrideDto {
  @IsString()
  @IsIn(Object.keys(FEATURE_REGISTRY))
  featureCode: FeatureCode;

  @IsBoolean()
  enabled: boolean;

  /** ISO date string; omit for "no expiry". */
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('licensing')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class LicensingController {
  constructor(private readonly licensing: LicensingService) {}

  @Get('entitlements')
  @ApiOperation({
    summary: 'Get full entitlement snapshot for the workspace',
    description:
      'Single response with every registered feature (allowed/source), quota (current/max), and active override — the frontend uses this to gate UI + show upgrade prompts.',
  })
  @ApiParam({ name: 'workspaceId' })
  getEntitlements(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.licensing.getEntitlements(workspaceId, req.user.id);
  }

  @Get('feature-overrides')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'List feature overrides (super-admin)' })
  listOverrides(@Param('workspaceId') workspaceId: string) {
    return this.licensing.listOverrides(workspaceId);
  }

  @Post('feature-overrides')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Grant / revoke a feature for the workspace (super-admin)',
    description:
      "Upsert per-workspace override. `enabled=true` grants a feature the plan wouldn't normally include; `enabled=false` revokes one the plan would grant. `expiresAt` is honoured at read-time so no cron is needed for promo cleanup.",
  })
  setOverride(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: SetOverrideDto,
    @Request() req: any,
  ) {
    return this.licensing.setOverride(
      workspaceId,
      dto.featureCode,
      dto.enabled,
      {
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        reason: dto.reason ?? null,
        userId: req.user?.id ?? null,
      },
    );
  }

  @Delete('feature-overrides/:overrideId')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an override (super-admin)' })
  removeOverride(
    @Param('workspaceId') workspaceId: string,
    @Param('overrideId') overrideId: string,
  ) {
    return this.licensing.removeOverride(workspaceId, overrideId);
  }
}
