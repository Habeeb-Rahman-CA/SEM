import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { WorkspaceRole } from '../entities/workspace-member.entity';

export class InviteMemberDto {
  /** The username of the user to invite */
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  role: string;
}
