import { IsArray, ValidateNested, IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class MatchPlayerLineupItemDto {
  @IsUUID()
  playerId: string;

  @IsBoolean()
  isPlaying: boolean;

  @IsUUID()
  teamId: string;

  @IsBoolean()
  @IsOptional()
  isGoalkeeper?: boolean;
}

export class UpdateMatchLineupDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchPlayerLineupItemDto)
  lineups: MatchPlayerLineupItemDto[];
}
