import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

export class SearchEventDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  sport?: string;

  @IsOptional()
  @IsString()
  organizer?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  competitionName?: string;

  @IsOptional()
  @IsString()
  workspaceIdFilter?: string; // 'all', 'current', or a specific workspace uuid

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC', 'asc', 'desc', 'ASCENDING', 'DESCENDING'])
  sortOrder?: string;
}
