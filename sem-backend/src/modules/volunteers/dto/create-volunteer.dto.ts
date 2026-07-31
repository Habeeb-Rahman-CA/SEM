import { IsOptional, IsString, IsArray, IsUUID } from 'class-validator';

export class CreateVolunteerDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
