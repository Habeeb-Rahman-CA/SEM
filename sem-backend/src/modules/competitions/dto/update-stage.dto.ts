import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateStageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(['league', 'group', 'knockout', 'group_knockout'])
  type?: 'league' | 'group' | 'knockout' | 'group_knockout';

  @IsOptional()
  @IsInt()
  sequence?: number;

  @IsOptional()
  @IsObject()
  config?: {
    winPoint?: number;
    drawPoint?: number;
    twoLegged?: boolean;
    groupsCount?: number;
    advancingCount?: number;
    gamesPerTeam?: number;
    legs?: number;
    groupKnockoutSubtype?: 'single_group' | 'multiple_groups';
    advancingType?: 'winner' | 'winner_and_runner';
    singleGroupAdvancing?: number;
  };
}
