import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ChannelMemberRole } from '../entities/workspace-channel-member.entity';

export class AddChannelMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(ChannelMemberRole)
  @IsOptional()
  role?: ChannelMemberRole;
}
