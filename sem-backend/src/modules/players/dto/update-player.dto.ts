import { IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';

export class UpdatePlayerDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  jerseyNumber?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
