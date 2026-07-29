import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsDateString,
  IsIn,
  IsArray,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['upcoming', 'ongoing', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  teamIds?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @IsOptional()
  @IsArray()
  announcements?: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
  }>;

  @IsOptional()
  @IsString()
  @IsIn(['open', 'closed', 'not_started'])
  registrationStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  venue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sport?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  organizers?: string;
}
