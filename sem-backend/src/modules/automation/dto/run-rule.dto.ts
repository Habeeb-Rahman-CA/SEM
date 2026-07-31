import { IsObject, IsOptional } from 'class-validator';

export class RunRuleDto {
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
