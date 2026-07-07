import { IsNotEmpty, IsOptional, IsString, IsInt, Min, MaxLength } from 'class-validator';

export class CreateVenueDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;
}
