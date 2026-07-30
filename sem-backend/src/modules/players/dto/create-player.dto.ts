import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreatePlayerDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  jerseyNumber?: string;

  @IsNotEmpty()
  @IsUUID()
  teamId: string;
}
