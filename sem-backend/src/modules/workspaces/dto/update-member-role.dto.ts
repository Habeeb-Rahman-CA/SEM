import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateMemberRoleDto {
  @IsNotEmpty()
  @IsString()
  role: string;
}
