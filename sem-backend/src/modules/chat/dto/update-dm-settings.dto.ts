import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateDmSettingsDto {
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;
}
