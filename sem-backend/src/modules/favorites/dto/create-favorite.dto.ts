import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { FavoriteEntityType } from '../entities/favorite.entity';

export class ToggleFavoriteDto {
  @IsNotEmpty()
  @IsEnum([
    'dashboard',
    'team',
    'event',
    'report',
    'competition',
    'form',
    'workflow',
    'custom',
  ])
  entityType: FavoriteEntityType;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  entityId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;
}
