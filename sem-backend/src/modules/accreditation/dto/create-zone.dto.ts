import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateZoneDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  allowedHolderTypes?: Array<
    'player' | 'official' | 'volunteer' | 'media' | 'guest' | 'staff'
  >;

  @IsOptional()
  allowedAccessLevels?: Array<'general' | 'restricted' | 'vip' | 'all_areas'>;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  venueId?: string | null;

  @IsOptional()
  allowedHolderTypes?: Array<
    'player' | 'official' | 'volunteer' | 'media' | 'guest' | 'staff'
  >;

  @IsOptional()
  allowedAccessLevels?: Array<'general' | 'restricted' | 'vip' | 'all_areas'>;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
