import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RenameFileDto {
  @ApiProperty({
    description: 'New name for the file, including extension',
    example: 'new-report-v2.pdf',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;
}
