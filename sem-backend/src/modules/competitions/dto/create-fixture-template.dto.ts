import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VenueSlotDto {
  @IsString()
  venueId: string;

  @IsInt()
  @Min(1)
  priority: number;
}

export class CreateFixtureTemplateDto {
  @ApiProperty({ example: 'Weekend Tournament Schedule' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '15:00',
    description: 'Default kickoff time HH:MM',
  })
  @IsOptional()
  @IsString()
  defaultKickoffTime?: string;

  @ApiPropertyOptional({ default: 1, description: 'Rest days between rounds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  matchIntervalDays?: number;

  @ApiPropertyOptional({ default: 1, description: 'Matches scheduled per day' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  matchesPerDay?: number;

  @ApiPropertyOptional({
    default: 90,
    description: 'Gap (minutes) between matches on same day',
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  gapBetweenMatchesMinutes?: number;

  @ApiPropertyOptional({ type: [VenueSlotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VenueSlotDto)
  venueSlots?: VenueSlotDto[];

  @ApiPropertyOptional({
    enum: ['round_robin', 'home_venue', 'single_venue'],
    default: 'round_robin',
  })
  @IsOptional()
  @IsString()
  venueStrategy?: string;
}
