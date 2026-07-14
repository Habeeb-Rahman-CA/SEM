import { IsArray, IsNotEmpty, IsString, ValidateNested, MinLength, Matches, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkImportMemberItemDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class BulkImportMembersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportMemberItemDto)
  members: BulkImportMemberItemDto[];

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, { message: 'Password must contain at least one uppercase letter and one number' })
  password: string;
}
