import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export class UpdateBookingDto {
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsEnum(['pending', 'approved', 'active', 'returned', 'cancelled'])
  status?: 'pending' | 'approved' | 'active' | 'returned' | 'cancelled';

  @IsOptional()
  @IsString()
  notes?: string;
}
