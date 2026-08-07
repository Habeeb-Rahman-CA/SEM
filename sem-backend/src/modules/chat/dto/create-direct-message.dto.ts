import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateDirectMessageDto {
  @IsNotEmpty()
  @IsUUID()
  recipientUserId: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
