import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateShiftDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  role?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxVolunteers?: number;
}
