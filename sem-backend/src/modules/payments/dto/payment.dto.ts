import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateIntentForInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  returnUrl?: string;
}

export class ConfirmMockIntentDto {
  @IsString()
  providerRef: string;
}

export class RefundInvoiceDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
