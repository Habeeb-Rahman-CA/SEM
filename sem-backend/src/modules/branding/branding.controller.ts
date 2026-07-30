import {
  Body,
  Controller,
  Get,
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
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BrandingService } from './branding.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';

@ApiTags('branding')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/branding')
@UseGuards(JwtAuthGuard)
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get()
  @ApiOperation({
    summary: 'Get white-label branding config for the workspace',
  })
  @ApiParam({ name: 'workspaceId' })
  get(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.brandingService.get(workspaceId, req.user.id);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update branding config',
    description:
      'Gated by the workspace subscription plan (Professional / Enterprise). Custom domain changes reset the verification token — the domain must be re-verified via POST /verify-domain after updating.',
  })
  update(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateBrandingDto,
    @Request() req: any,
  ) {
    return this.brandingService.update(workspaceId, dto, req.user.id);
  }

  @Post('verify-domain')
  @ApiOperation({
    summary: 'Confirm ownership of the configured custom domain',
    description:
      'Checks the DNS TXT record `_sem-verify.<domain>` for the current token. In this build the check is a stubbed manual-verify; wire real DNS resolution before shipping to production.',
  })
  verifyDomain(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.brandingService.verifyDomain(workspaceId, req.user.id);
  }
}
