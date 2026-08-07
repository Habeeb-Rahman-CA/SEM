import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
} from 'class-validator';
import {
  ChannelAccessType,
  ChannelPostingPermission,
} from '../entities/workspace-channel.entity';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  initialMemberUserIds?: string[];
}
