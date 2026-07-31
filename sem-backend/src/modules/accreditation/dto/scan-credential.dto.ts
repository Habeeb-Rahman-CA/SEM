import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ScanCredentialDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsEnum(['in', 'out'])
  direction?: 'in' | 'out';

  @IsOptional()
  @IsString()
  notes?: string;
}
