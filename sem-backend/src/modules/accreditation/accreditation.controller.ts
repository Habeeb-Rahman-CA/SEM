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
import { AccreditationService } from './accreditation.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto';
import { ScanCredentialDto } from './dto/scan-credential.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CredentialHolderType } from './entities/credential.entity';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const CRED = { name: 'id', description: 'Credential UUID' };
const ZONE = { name: 'zoneId', description: 'Access zone UUID' };

@ApiTags('accreditation')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class AccreditationController {
  constructor(private readonly service: AccreditationService) {}

  // ─── Summary ─────────────────────────────────────────────────────────────

  @Get('accreditation/summary')
  @ApiOperation({ summary: 'Accreditation dashboard summary' })
  @ApiParam(WS)
  getSummary(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.service.getSummary(workspaceId, req.user.id);
  }

  // ─── Credentials ─────────────────────────────────────────────────────────

  @Get('accreditation/credentials')
  @ApiOperation({ summary: 'List digital credentials' })
  @ApiParam(WS)
  @ApiQuery({ name: 'holderType', required: false })
  @ApiQuery({ name: 'eventId', required: false })
  getCredentials(
    @Param('workspaceId') workspaceId: string,
    @Query('holderType') holderType: CredentialHolderType,
    @Query('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.service.getCredentials(workspaceId, req.user.id, {
      holderType,
      eventId,
    });
  }

  @Get('accreditation/credentials/:id')
  @ApiOperation({ summary: 'Get a credential with full history' })
  @ApiParam(WS)
  @ApiParam(CRED)
  getCredentialById(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.getCredentialById(workspaceId, id, req.user.id);
  }

  @Get('accreditation/verify/:code')
  @ApiOperation({
    summary: 'Verify a QR/badge code — read-only lookup (no attendance log)',
  })
  @ApiParam(WS)
  @ApiParam({ name: 'code', description: 'Encoded credential code' })
  verify(
    @Param('workspaceId') workspaceId: string,
    @Param('code') code: string,
    @Request() req: any,
  ) {
    return this.service.verifyByCode(workspaceId, code, req.user.id);
  }

  @Post('accreditation/credentials')
  @ApiOperation({ summary: 'Issue a new digital credential with QR code' })
  @ApiParam(WS)
  createCredential(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateCredentialDto,
    @Request() req: any,
  ) {
    return this.service.createCredential(workspaceId, dto, req.user.id);
  }

  @Patch('accreditation/credentials/:id')
  @ApiOperation({ summary: 'Update credential details or access grants' })
  @ApiParam(WS)
  @ApiParam(CRED)
  updateCredential(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCredentialDto,
    @Request() req: any,
  ) {
    return this.service.updateCredential(workspaceId, id, dto, req.user.id);
  }

  @Post('accreditation/credentials/:id/revoke')
  @ApiOperation({ summary: 'Revoke a credential (immediate)' })
  @ApiParam(WS)
  @ApiParam(CRED)
  revokeCredential(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.revokeCredential(workspaceId, id, req.user.id);
  }

  @Delete('accreditation/credentials/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a credential permanently' })
  @ApiParam(WS)
  @ApiParam(CRED)
  deleteCredential(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.deleteCredential(workspaceId, id, req.user.id);
  }

  // ─── Access Zones ────────────────────────────────────────────────────────

  @Get('accreditation/zones')
  @ApiOperation({ summary: 'List access zones' })
  @ApiParam(WS)
  getZones(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.service.getZones(workspaceId, req.user.id);
  }

  @Post('accreditation/zones')
  @ApiOperation({ summary: 'Create an access zone' })
  @ApiParam(WS)
  createZone(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateZoneDto,
    @Request() req: any,
  ) {
    return this.service.createZone(workspaceId, dto, req.user.id);
  }

  @Patch('accreditation/zones/:zoneId')
  @ApiOperation({ summary: 'Update an access zone' })
  @ApiParam(WS)
  @ApiParam(ZONE)
  updateZone(
    @Param('workspaceId') workspaceId: string,
    @Param('zoneId') zoneId: string,
    @Body() dto: UpdateZoneDto,
    @Request() req: any,
  ) {
    return this.service.updateZone(workspaceId, zoneId, dto, req.user.id);
  }

  @Delete('accreditation/zones/:zoneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an access zone' })
  @ApiParam(WS)
  @ApiParam(ZONE)
  deleteZone(
    @Param('workspaceId') workspaceId: string,
    @Param('zoneId') zoneId: string,
    @Request() req: any,
  ) {
    return this.service.deleteZone(workspaceId, zoneId, req.user.id);
  }

  // ─── Scanning & Attendance ───────────────────────────────────────────────

  @Post('accreditation/scan')
  @ApiOperation({
    summary: 'Scan a QR code at a gate — validates and records attendance',
  })
  @ApiParam(WS)
  scan(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ScanCredentialDto,
    @Request() req: any,
  ) {
    return this.service.scan(workspaceId, dto, req.user.id);
  }

  @Get('accreditation/attendance')
  @ApiOperation({ summary: 'List attendance logs' })
  @ApiParam(WS)
  @ApiQuery({ name: 'credentialId', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAttendance(
    @Param('workspaceId') workspaceId: string,
    @Query('credentialId') credentialId: string,
    @Query('zoneId') zoneId: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    return this.service.getAttendance(workspaceId, req.user.id, {
      credentialId,
      zoneId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('accreditation/expire-stale')
  @ApiOperation({
    summary: 'Mark all past-due active credentials as expired (housekeeping)',
  })
  @ApiParam(WS)
  expireStale(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.service
      .expireStale(workspaceId, req.user.id)
      .then((count) => ({ expired: count }));
  }
}
