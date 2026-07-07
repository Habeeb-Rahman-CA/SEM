import { IsOptional, IsUUID, IsString, IsObject, IsInt } from 'class-validator';

export class UpdateMatchDto {
  @IsOptional()
  @IsUUID()
  homeTeamId?: string;

  @IsOptional()
  @IsUUID()
  awayTeamId?: string;

  @IsOptional()
  @IsInt()
  homeScore?: number;

  @IsOptional()
  @IsInt()
  awayScore?: number;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsString()
  status?: 'scheduled' | 'live' | 'completed';

  @IsOptional()
  @IsObject()
  config?: {
    timerDuration?: number;
    overs?: number;
    setsToWin?: number;
  };

  @IsOptional()
  @IsObject()
  liveData?: any;
}
