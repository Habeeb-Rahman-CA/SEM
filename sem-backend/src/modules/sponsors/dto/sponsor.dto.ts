import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { SponsorTier } from '../entities/sponsor.entity';

const TIERS: SponsorTier[] = [
  'title',
  'platinum',
  'gold',
  'silver',
  'bronze',
  'partner',
];

export class CreateSponsorDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(500) websiteUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(60) category?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(TIERS)
  tier?: SponsorTier;

  @IsOptional() @IsString() @MaxLength(200) contactName?: string | null;
  @IsOptional() @IsString() @MaxLength(200) contactEmail?: string | null;

  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional() @IsDateString() startDate?: string | null;
  @IsOptional() @IsDateString() endDate?: string | null;

  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}

export class UpdateSponsorDto extends CreateSponsorDto {
  // Same shape — name becomes optional in service via Object.assign.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  declare name: string;
}

export class AttachSponsorDto {
  @IsString()
  sponsorId: string;

  @IsOptional()
  @IsString()
  @IsIn(TIERS)
  tier?: SponsorTier;

  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}
