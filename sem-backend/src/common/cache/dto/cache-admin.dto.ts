import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCacheConfigDto {
  @IsOptional()
  @IsBoolean()
  globallyEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  namespace?: string;

  @IsOptional()
  @IsObject()
  domainSettings?: Record<string, { enabled: boolean; ttlSec: number }>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpsertDomainDto {
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  @Min(0)
  ttlSec: number;
}
