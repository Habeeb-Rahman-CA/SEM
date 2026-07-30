import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class ChangePlanDto {
  /** Target plan code (e.g. 'standard'). */
  @IsString()
  @IsIn(['free', 'standard', 'professional', 'enterprise'])
  planCode: string;

  /** If true, request a trial when the plan supports one. */
  @IsOptional()
  @IsBoolean()
  startTrial?: boolean;
}
