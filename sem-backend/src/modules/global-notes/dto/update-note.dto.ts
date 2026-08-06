import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;
}
