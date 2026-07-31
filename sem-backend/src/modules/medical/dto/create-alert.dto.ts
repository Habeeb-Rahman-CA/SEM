import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAlertDto {
  @IsNotEmpty()
  @IsUUID()
  profileId: string;

  @IsOptional()
  @IsEnum(['info', 'warning', 'critical'])
  severity?: 'info' | 'warning' | 'critical';

  @IsOptional()
  @IsEnum([
    'injury',
    'fitness',
    'checkup_due',
    'clearance',
    'allergy',
    'general',
  ])
  source?:
    'injury' | 'fitness' | 'checkup_due' | 'clearance' | 'allergy' | 'general';

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class UpdateAlertStatusDto {
  @IsNotEmpty()
  @IsEnum(['open', 'acknowledged', 'resolved', 'dismissed'])
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
}
