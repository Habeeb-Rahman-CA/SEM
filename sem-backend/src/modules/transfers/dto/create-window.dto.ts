import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWindowDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  startAt: string;

  @IsNotEmpty()
  @IsString()
  endAt: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(['permanent', 'loan'], { each: true })
  allowedTypes?: Array<'permanent' | 'loan'>;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxTransfersPerTeam?: number;
}

export class UpdateWindowDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  startAt?: string;

  @IsOptional()
  @IsString()
  endAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(['permanent', 'loan'], { each: true })
  allowedTypes?: Array<'permanent' | 'loan'>;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxTransfersPerTeam?: number;
}
