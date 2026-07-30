import { IsOptional, IsUUID } from 'class-validator';

export class ListGalleryDto {
  @IsOptional()
  @IsUUID()
  competitionId?: string;

  @IsOptional()
  @IsUUID()
  matchId?: string;
}
