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
import { MedicalService } from './medical.service';
import { CreateMedicalProfileDto } from './dto/create-medical-profile.dto';
import { UpdateMedicalProfileDto } from './dto/update-medical-profile.dto';
import { CreateInjuryDto } from './dto/create-injury.dto';
import { UpdateInjuryDto } from './dto/update-injury.dto';
import { CreateRecoveryPlanDto } from './dto/create-recovery-plan.dto';
import { UpdateRecoveryPlanDto } from './dto/update-recovery-plan.dto';
import { CreateFitnessStatusDto } from './dto/create-fitness-status.dto';
import { CreateAlertDto, UpdateAlertStatusDto } from './dto/create-alert.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const PROFILE = { name: 'id', description: 'Medical profile UUID' };
const INJURY = { name: 'injuryId', description: 'Injury record UUID' };
const PLAN = { name: 'planId', description: 'Recovery plan UUID' };
const ALERT = { name: 'alertId', description: 'Medical alert UUID' };
const PLAYER = { name: 'playerId', description: 'Player UUID' };

@ApiTags('medical')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class MedicalController {
  constructor(private readonly medicalService: MedicalService) {}

  // ─── Summary ─────────────────────────────────────────────────────────────

  @Get('medical/summary')
  @ApiOperation({ summary: 'Get medical dashboard summary for coaches/staff' })
  @ApiParam(WS)
  getSummary(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.medicalService.getSummary(workspaceId, req.user.id);
  }

  // ─── Medical Profiles ────────────────────────────────────────────────────

  @Get('medical/profiles')
  @ApiOperation({ summary: 'List medical profiles for all players' })
  @ApiParam(WS)
  getProfiles(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.medicalService.getProfiles(workspaceId, req.user.id);
  }

  @Get('medical/profiles/by-player/:playerId')
  @ApiOperation({ summary: 'Get medical profile by player ID' })
  @ApiParam(WS)
  @ApiParam(PLAYER)
  getProfileByPlayer(
    @Param('workspaceId') workspaceId: string,
    @Param('playerId') playerId: string,
    @Request() req: any,
  ) {
    return this.medicalService.getProfileByPlayer(
      workspaceId,
      playerId,
      req.user.id,
    );
  }

  @Get('medical/profiles/:id')
  @ApiOperation({
    summary: 'Get full medical profile with injuries, fitness, alerts',
  })
  @ApiParam(WS)
  @ApiParam(PROFILE)
  getProfileById(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.medicalService.getProfileById(workspaceId, id, req.user.id);
  }

  @Post('medical/profiles')
  @ApiOperation({ summary: 'Create a medical profile for a player' })
  @ApiParam(WS)
  createProfile(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateMedicalProfileDto,
    @Request() req: any,
  ) {
    return this.medicalService.createProfile(workspaceId, dto, req.user.id);
  }

  @Patch('medical/profiles/:id')
  @ApiOperation({ summary: 'Update a player medical profile' })
  @ApiParam(WS)
  @ApiParam(PROFILE)
  updateProfile(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMedicalProfileDto,
    @Request() req: any,
  ) {
    return this.medicalService.updateProfile(workspaceId, id, dto, req.user.id);
  }

  @Delete('medical/profiles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a player medical profile' })
  @ApiParam(WS)
  @ApiParam(PROFILE)
  deleteProfile(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.medicalService.deleteProfile(workspaceId, id, req.user.id);
  }

  // ─── Injuries ────────────────────────────────────────────────────────────

  @Post('medical/injuries')
  @ApiOperation({ summary: 'Log a new injury for a player' })
  @ApiParam(WS)
  createInjury(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateInjuryDto,
    @Request() req: any,
  ) {
    return this.medicalService.createInjury(workspaceId, dto, req.user.id);
  }

  @Patch('medical/injuries/:injuryId')
  @ApiOperation({ summary: 'Update injury status, diagnosis, or treatment' })
  @ApiParam(WS)
  @ApiParam(INJURY)
  updateInjury(
    @Param('workspaceId') workspaceId: string,
    @Param('injuryId') injuryId: string,
    @Body() dto: UpdateInjuryDto,
    @Request() req: any,
  ) {
    return this.medicalService.updateInjury(
      workspaceId,
      injuryId,
      dto,
      req.user.id,
    );
  }

  @Delete('medical/injuries/:injuryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an injury record' })
  @ApiParam(WS)
  @ApiParam(INJURY)
  deleteInjury(
    @Param('workspaceId') workspaceId: string,
    @Param('injuryId') injuryId: string,
    @Request() req: any,
  ) {
    return this.medicalService.deleteInjury(workspaceId, injuryId, req.user.id);
  }

  // ─── Recovery Plans ──────────────────────────────────────────────────────

  @Post('medical/recovery-plans')
  @ApiOperation({ summary: 'Create a recovery plan tied to an injury' })
  @ApiParam(WS)
  createRecoveryPlan(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateRecoveryPlanDto,
    @Request() req: any,
  ) {
    return this.medicalService.createRecoveryPlan(
      workspaceId,
      dto,
      req.user.id,
    );
  }

  @Patch('medical/recovery-plans/:planId')
  @ApiOperation({ summary: 'Update recovery plan progress and milestones' })
  @ApiParam(WS)
  @ApiParam(PLAN)
  updateRecoveryPlan(
    @Param('workspaceId') workspaceId: string,
    @Param('planId') planId: string,
    @Body() dto: UpdateRecoveryPlanDto,
    @Request() req: any,
  ) {
    return this.medicalService.updateRecoveryPlan(
      workspaceId,
      planId,
      dto,
      req.user.id,
    );
  }

  // ─── Fitness Status ──────────────────────────────────────────────────────

  @Post('medical/fitness-assessments')
  @ApiOperation({ summary: 'Record a new fitness assessment for a player' })
  @ApiParam(WS)
  createFitnessStatus(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateFitnessStatusDto,
    @Request() req: any,
  ) {
    return this.medicalService.createFitnessStatus(
      workspaceId,
      dto,
      req.user.id,
    );
  }

  // ─── Medical Alerts ──────────────────────────────────────────────────────

  @Get('medical/alerts')
  @ApiOperation({ summary: 'List health alerts for coaches and staff' })
  @ApiParam(WS)
  @ApiQuery({
    name: 'openOnly',
    required: false,
    description: 'When true, return only open (unacknowledged) alerts',
  })
  getAlerts(
    @Param('workspaceId') workspaceId: string,
    @Query('openOnly') openOnly: string,
    @Request() req: any,
  ) {
    return this.medicalService.getAlerts(workspaceId, req.user.id, {
      openOnly: openOnly === 'true',
    });
  }

  @Post('medical/alerts')
  @ApiOperation({ summary: 'Raise a manual health alert' })
  @ApiParam(WS)
  createAlert(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateAlertDto,
    @Request() req: any,
  ) {
    return this.medicalService.createAlert(workspaceId, dto, req.user.id);
  }

  @Patch('medical/alerts/:alertId')
  @ApiOperation({
    summary: 'Acknowledge, resolve, or dismiss a medical alert',
  })
  @ApiParam(WS)
  @ApiParam(ALERT)
  updateAlertStatus(
    @Param('workspaceId') workspaceId: string,
    @Param('alertId') alertId: string,
    @Body() dto: UpdateAlertStatusDto,
    @Request() req: any,
  ) {
    return this.medicalService.updateAlertStatus(
      workspaceId,
      alertId,
      dto,
      req.user.id,
    );
  }
}
