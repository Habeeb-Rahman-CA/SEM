import { IsOptional, IsString, IsArray, IsIn } from 'class-validator';

export class UpdateVolunteerDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
