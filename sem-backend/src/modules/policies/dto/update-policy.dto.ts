import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdatePolicyDto {
  @IsOptional()
  @IsBoolean()
  preventDuplicateAuctionRegistration?: boolean;

  @IsOptional()
  @IsBoolean()
  blockAuctionBidOverBudget?: boolean;

  @IsOptional()
  @IsBoolean()
  preventDuplicateTransferRequest?: boolean;

  @IsOptional()
  @IsBoolean()
  requireOpenWindowForTransfers?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minTransferNoticeDays?: number;

  @IsOptional()
  @IsBoolean()
  enforceSquadCapsOnApprove?: boolean;

  @IsOptional()
  @IsBoolean()
  uniqueRegistrationPerSeason?: boolean;

  @IsOptional()
  @IsBoolean()
  uniqueJerseyPerTeamSeason?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  budgetAlertThresholdPct?: number;

  @IsOptional()
  @IsBoolean()
  blockNegativeBudgets?: boolean;

  @IsOptional()
  @IsBoolean()
  requireActiveContractForMatch?: boolean;

  @IsOptional()
  @IsBoolean()
  requireRegistrationForMatch?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
