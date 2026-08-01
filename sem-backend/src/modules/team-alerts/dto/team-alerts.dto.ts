import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class BroadcastAlertDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  teamIds: string[];

  @IsOptional()
  @IsEnum([
    'auction_event',
    'auction_bid',
    'auction_purchase',
    'transfer_submitted',
    'transfer_approved',
    'transfer_rejected',
    'budget_warning',
    'budget_exceeded',
    'deadline_approaching',
    'contract_expiring',
    'general',
  ])
  category?:
    | 'auction_event'
    | 'auction_bid'
    | 'auction_purchase'
    | 'transfer_submitted'
    | 'transfer_approved'
    | 'transfer_rejected'
    | 'budget_warning'
    | 'budget_exceeded'
    | 'deadline_approaching'
    | 'contract_expiring'
    | 'general';

  @IsOptional()
  @IsEnum(['info', 'success', 'warning', 'critical'])
  severity?: 'info' | 'success' | 'warning' | 'critical';

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateAlertPreferenceDto {
  @IsOptional()
  @IsBoolean()
  auctionEvents?: boolean;

  @IsOptional()
  @IsBoolean()
  auctionBids?: boolean;

  @IsOptional()
  @IsBoolean()
  auctionPurchases?: boolean;

  @IsOptional()
  @IsBoolean()
  transferUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  budgetAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  deadlineAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  contractExpiryAlerts?: boolean;
}

export class AcknowledgeAlertDto {
  @IsOptional()
  @IsString()
  note?: string;
}
