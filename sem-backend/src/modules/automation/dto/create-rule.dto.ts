import {
  ArrayNotEmpty,
  IsArray,
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

export class AutomationActionDto {
  @IsNotEmpty()
  @IsEnum([
    'send_notification',
    'generate_fixtures',
    'allocate_referees',
    'reserve_equipment',
    'issue_certificates',
    'generate_report',
    'archive_event',
  ])
  type: ActionType;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
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
  @IsEnum([
    'manual',
    'schedule',
    'event_created',
    'event_started',
    'event_ended',
    'competition_started',
    'competition_ended',
    'match_completed',
  ])
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
