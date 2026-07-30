import {
  IsOptional,
  IsUUID,
  IsString,
  IsObject,
  IsInt,
  IsArray,
  MaxLength,
} from 'class-validator';
import { MatchType } from '../entities/match.entity';

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

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string | null;

  @IsOptional()
  @IsArray()
  highlightVideos?: Array<{
    id: string;
    platform: 'youtube' | 'vimeo' | 'other';
    url: string;
    title?: string | null;
    thumbnailUrl?: string | null;
  }>;
}
