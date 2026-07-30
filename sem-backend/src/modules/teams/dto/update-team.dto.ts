import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsArray,
} from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  secondaryColor?: string;

  @IsOptional()
  @IsArray()
  coaches?: Array<{
    id: string;
    name: string;
    role?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
  }>;

  @IsOptional()
  @IsArray()
  achievements?: Array<{
    id: string;
    title: string;
    year?: number | null;
    competitionName?: string | null;
    description?: string | null;
  }>;
}
