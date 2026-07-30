import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class InstantiateTemplateDto {
  @ApiProperty({ example: 'Summer Football Cup 2027' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: '2027-06-01T09:00:00.000Z' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-06-30T18:00:00.000Z' })
  @IsOptional()
  @IsString()
  endDate?: string;
}
