import {
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
  IsArray,
} from 'class-validator';

export class UpdatePlayerDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  jerseyNumber?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @IsOptional()
  @IsArray()
  achievements?: Array<{
    id: string;
    title: string;
    description?: string | null;
    year?: number | null;
  }>;
}
