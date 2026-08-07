import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class SendGroupMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
