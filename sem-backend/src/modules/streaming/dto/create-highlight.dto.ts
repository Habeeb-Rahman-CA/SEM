import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateHighlightDto {
  @IsNotEmpty()
  @IsUUID()
  sessionId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  timestampSec: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSec?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  clipUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsEnum(['moment', 'goal', 'save', 'card', 'wicket', 'try', 'other'])
  clipType?: 'moment' | 'goal' | 'save' | 'card' | 'wicket' | 'try' | 'other';
}

export class UpdateHighlightDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  timestampSec?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSec?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  clipUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsEnum(['moment', 'goal', 'save', 'card', 'wicket', 'try', 'other'])
  clipType?: 'moment' | 'goal' | 'save' | 'card' | 'wicket' | 'try' | 'other';
}
