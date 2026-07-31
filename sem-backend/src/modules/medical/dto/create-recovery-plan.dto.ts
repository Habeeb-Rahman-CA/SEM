import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RecoveryMilestone } from '../entities/recovery-plan.entity';

export class CreateRecoveryPlanDto {
  @IsNotEmpty()
  @IsUUID()
  injuryId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  protocol?: string;

  @IsNotEmpty()
  @IsString()
  startDate: string;

  @IsOptional()
  @IsString()
  expectedReturnDate?: string;

  @IsOptional()
  @IsString()
  actualReturnDate?: string;

  @IsOptional()
  milestones?: RecoveryMilestone[];

  @IsOptional()
  @IsEnum(['in_progress', 'on_track', 'delayed', 'completed', 'cancelled'])
  status?: 'in_progress' | 'on_track' | 'delayed' | 'completed' | 'cancelled';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
