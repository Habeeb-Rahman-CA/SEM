import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateStageDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  sequence?: number;

  @IsOptional()
  config?: Record<string, any>;
}

export class TemplateCompetitionDto {
  @IsString()
  name: string;

  @IsString()
  sportId: string;

  @IsOptional()
  @IsArray()
  pointsConfig?: Array<{ position: number; label: string; points: number }>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateStageDto)
  stages?: TemplateStageDto[];
}

export class CreateTemplateDto {
  @ApiProperty({ example: 'Annual Football Cup' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sport?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizers?: string;

  @ApiPropertyOptional({ default: 'open' })
  @IsOptional()
  @IsString()
  defaultRegistrationStatus?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  defaultIsPublic?: boolean;

  @ApiPropertyOptional({ type: [TemplateCompetitionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateCompetitionDto)
  competitionBlueprints?: TemplateCompetitionDto[];
}
