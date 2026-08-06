import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { NoteEntityType } from '../entities/global-note.entity';

export class CreateNoteDto {
  @IsNotEmpty()
  @IsEnum([
    'player',
    'team',
    'asset',
    'event',
    'venue',
    'report',
    'competition',
    'form',
    'custom',
  ])
  entityType: NoteEntityType;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  entityId: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;
}
