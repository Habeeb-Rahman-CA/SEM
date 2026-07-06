import { IsNotEmpty, IsString, IsUUID, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateCompetitionDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsNotEmpty()
  @IsUUID()
  sportId: string;

  @IsOptional()
  @IsString()
  status?: string; // 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
}
