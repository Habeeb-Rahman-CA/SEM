import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSportDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;
}
