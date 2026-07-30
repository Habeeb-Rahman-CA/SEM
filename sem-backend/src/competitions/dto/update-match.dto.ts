import { IsOptional, IsUUID, IsString, IsObject, IsInt } from 'class-validator';
import { MatchType } from '../../workspaces/entities/match.entity';

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
  status?: 'scheduled' | 'live' | 'completed' | 'inactive';

  @IsOptional()
  @IsObject()
  config?: {
    timerDuration?: number;
    overs?: number;
    setsToWin?: number;
    matchType?: MatchType;
  };

  @IsOptional()
  @IsObject()
  liveData?: any;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
