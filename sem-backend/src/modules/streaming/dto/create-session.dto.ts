import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSessionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  matchId?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsNotEmpty()
  @IsEnum(['youtube', 'twitch', 'facebook', 'vimeo', 'custom'])
  platform: 'youtube' | 'twitch' | 'facebook' | 'vimeo' | 'custom';

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  streamUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  embedUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  streamKey?: string;

  @IsOptional()
  @IsString()
  scheduledStart?: string;

  @IsOptional()
  @IsBoolean()
  showScoreOverlay?: boolean;

  @IsOptional()
  @IsBoolean()
  showStats?: boolean;

  @IsOptional()
  @IsBoolean()
  showTeamNames?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  overlayColor?: string;
}

export class UpdateSessionStatusDto {
  @IsNotEmpty()
  @IsEnum(['scheduled', 'live', 'ended', 'error'])
  status: 'scheduled' | 'live' | 'ended' | 'error';
}

export class UpdateViewerCountDto {
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  viewerCount: number;
}
