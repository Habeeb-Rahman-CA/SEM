import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import {
  ChannelAccessType,
  ChannelPostingPermission,
} from '../entities/workspace-channel.entity';

export class UpdateChannelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsEnum(ChannelAccessType)
  @IsOptional()
  accessType?: ChannelAccessType;

  @IsEnum(ChannelPostingPermission)
  @IsOptional()
  postingPermission?: ChannelPostingPermission;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
