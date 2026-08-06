import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  ActionType,
  TriggerType,
} from '../entities/automation-rule.entity';

const ALL_ACTION_TYPES: ActionType[] = [
  'send_notification',
  'generate_invoice',
  'send_email',
  'notify_admin',
  'send_webhook',
  'generate_fixtures',
  'allocate_referees',
  'reserve_equipment',
  'issue_certificates',
  'generate_report',
  'auto_grant_accreditation',
  'trigger_workflow_stage',
  'archive_event',
];

const ALL_TRIGGER_TYPES: TriggerType[] = [
  'manual',
  'schedule',
  'payment_completed',
  'payment_failed',
  'form_submitted',
  'workflow_approved',
  'workflow_rejected',
  'event_created',
  'event_started',
  'event_ended',
  'competition_started',
  'competition_ended',
  'match_completed',
  'transfer_requested',
  'equipment_booking_requested',
  'accreditation_granted',
];

export class AutomationActionDto {
  @IsNotEmpty()
  @IsEnum(ALL_ACTION_TYPES)
  type: ActionType;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;
}

export class CreateRuleDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(ALL_TRIGGER_TYPES)
  triggerType: TriggerType;

  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  actions: AutomationActionDto[];

  @IsOptional()
  @IsEnum(['active', 'paused'])
  status?: 'active' | 'paused';
}
