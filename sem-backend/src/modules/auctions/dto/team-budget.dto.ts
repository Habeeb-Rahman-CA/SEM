import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class UpsertTeamBudgetDto {
  @IsNotEmpty()
  @IsUUID()
  teamId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  initialBudget?: number;
}
