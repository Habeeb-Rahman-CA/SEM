import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RateMatchPlayerItemDto {
  @IsUUID()
  playerId: string;

  /** Rating in the range 5.0–10.0 */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(5.0)
  @Max(10.0)
  rating: number;
}

export class RateMatchPlayersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RateMatchPlayerItemDto)
  ratings: RateMatchPlayerItemDto[];
}
