import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateBillingProfileDto {
  @IsOptional() @IsString() @MaxLength(200) companyName?: string | null;
  @IsOptional() @IsString() @MaxLength(200) addressLine1?: string | null;
  @IsOptional() @IsString() @MaxLength(200) addressLine2?: string | null;
  @IsOptional() @IsString() @MaxLength(100) city?: string | null;
  @IsOptional() @IsString() @MaxLength(100) state?: string | null;
  @IsOptional() @IsString() @MaxLength(30) postalCode?: string | null;
  @IsOptional() @IsString() @MaxLength(100) country?: string | null;
  @IsOptional() @IsString() @MaxLength(60) taxId?: string | null;
  @IsOptional() @IsString() @MaxLength(20) taxIdType?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRatePercent?: number;

  @IsOptional() @IsString() @MaxLength(8) defaultCurrency?: string;
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional() @IsBoolean() _unused?: boolean; // placeholder to keep decorator import used
}

export class UpsertBillingContactDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsString()
  @MaxLength(200)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['primary', 'secondary', 'finance', 'legal'])
  role?: 'primary' | 'secondary' | 'finance' | 'legal';

  @IsOptional()
  @IsBoolean()
  receivesInvoices?: boolean;
}

export class RecordPaymentDto {
  @IsNumber()
  @Min(0)
  amountCents: number;

  @IsOptional()
  @IsString()
  @IsIn(['card', 'bank_transfer', 'manual', 'other'])
  method?: 'card' | 'bank_transfer' | 'manual' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
