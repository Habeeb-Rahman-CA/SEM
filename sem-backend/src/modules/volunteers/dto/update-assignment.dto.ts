import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export class UpdateAssignmentDto {
  @IsOptional()
  @IsIn(['assigned', 'attended', 'absent', 'cancelled'])
  status?: 'assigned' | 'attended' | 'absent' | 'cancelled';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  serviceHours?: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
