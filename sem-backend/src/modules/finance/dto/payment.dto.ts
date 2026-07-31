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

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsUUID()
  teamId: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  season?: string;

  @IsOptional()
  @IsEnum([
    'auction_purchase',
    'transfer_fee',
    'salary',
    'signing_bonus',
    'penalty',
    'refund',
    'other',
  ])
  category?:
    | 'auction_purchase'
    | 'transfer_fee'
    | 'salary'
    | 'signing_bonus'
    | 'penalty'
    | 'refund'
    | 'other';

  @IsOptional()
  @IsEnum(['outgoing', 'incoming'])
  direction?: 'outgoing' | 'incoming';

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsEnum(['pending', 'paid', 'overdue', 'cancelled'])
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  paidAt?: string;

  @IsOptional()
  @IsEnum(['transfer_request', 'contract', 'auction', 'manual'])
  referenceType?: 'transfer_request' | 'contract' | 'auction' | 'manual';

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsUUID()
  counterpartyTeamId?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  description: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsEnum(['pending', 'paid', 'overdue', 'cancelled'])
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';

  @IsOptional()
  @IsString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
