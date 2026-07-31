import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import type { AdPlacement } from '../entities/advertisement.entity';

const PLACEMENTS: AdPlacement[] = [
  'public-portal',
  'public-event',
  'live-hub',
  'live-match',
];

export class CreateAdvertisementDto {
  @IsString() @MaxLength(200) name: string;

  @IsOptional() @IsString() @MaxLength(200) title?: string | null;

  @IsString() @MaxLength(500) imageUrl: string;
  @IsString() @MaxLength(500) targetUrl: string;

  @IsString()
  @IsIn(PLACEMENTS)
  placement: AdPlacement;

  @IsOptional() @IsUUID() eventId?: string | null;
  @IsOptional() @IsUUID() sponsorId?: string | null;

  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional() @IsDateString() startDate?: string | null;
  @IsOptional() @IsDateString() endDate?: string | null;

  @IsOptional() @IsInt() @Min(1) weight?: number;
}

export class UpdateAdvertisementDto extends CreateAdvertisementDto {
  @IsOptional() @IsString() @MaxLength(200) declare name: string;
  @IsOptional() @IsString() @MaxLength(500) declare imageUrl: string;
  @IsOptional() @IsString() @MaxLength(500) declare targetUrl: string;

  @IsOptional()
  @IsString()
  @IsIn(PLACEMENTS)
  declare placement: AdPlacement;
}
