import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { RecentEntityType } from '../entities/recently-viewed.entity';

export class RecordViewedDto {
  @IsNotEmpty()
  @IsEnum([
    'player',
    'event',
    'report',
    'invoice',
    'team',
    'venue',
    'form',
    'competition',
    'custom',
  ])
  entityType: RecentEntityType;

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
