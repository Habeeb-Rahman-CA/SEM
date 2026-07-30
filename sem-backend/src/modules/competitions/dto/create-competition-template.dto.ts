import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CompetitionTemplateStageDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  sequence?: number;

  @IsOptional()
  config?: Record<string, any>;
}

export class CreateCompetitionTemplateDto {
  @ApiProperty({ example: 'Premier League Format' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Sport UUID' })
  @IsOptional()
  @IsUUID()
  sportId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  pointsConfig?: Array<{ position: number; label: string; points: number }>;

  @ApiPropertyOptional({ type: [CompetitionTemplateStageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetitionTemplateStageDto)
  stageBlueprints?: CompetitionTemplateStageDto[];
}
