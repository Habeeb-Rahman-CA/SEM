import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateShiftDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  role: string;

  @IsNotEmpty()
  @IsDateString()
  startAt: string;

  @IsNotEmpty()
  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxVolunteers?: number;
}
