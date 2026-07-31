import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCredentialDto {
  @IsNotEmpty()
  @IsEnum(['player', 'official', 'volunteer', 'media', 'guest', 'staff'])
  holderType: 'player' | 'official' | 'volunteer' | 'media' | 'guest' | 'staff';

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  holderName: string;

  @IsOptional()
  @IsUUID()
  holderUserId?: string;

  @IsOptional()
  @IsUUID()
  holderPlayerId?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  holderRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  organization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @IsOptional()
  @IsEnum(['general', 'restricted', 'vip', 'all_areas'])
  accessLevel?: 'general' | 'restricted' | 'vip' | 'all_areas';

  @IsNotEmpty()
  @IsString()
  validFrom: string;

  @IsNotEmpty()
  @IsString()
  validUntil: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  zoneIds?: string[];
}
