import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTransferRequestDto {
  @IsNotEmpty()
  @IsUUID()
  playerId: string;

  @IsNotEmpty()
  @IsUUID()
  toTeamId: string;

  @IsOptional()
  @IsEnum(['permanent', 'loan'])
  transferType?: 'permanent' | 'loan';

  @IsOptional()
  @IsInt()
  @Min(0)
  fee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  loanStartDate?: string;

  @IsOptional()
  @IsString()
  loanEndDate?: string;

  @IsOptional()
  @IsUUID()
  windowId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviewTransferRequestDto {
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
