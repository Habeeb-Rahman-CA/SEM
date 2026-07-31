import { PartialType, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateCredentialDto } from './create-credential.dto';

export class UpdateCredentialDto extends PartialType(
  OmitType(CreateCredentialDto, ['holderType'] as const),
) {
  @IsOptional()
  @IsEnum(['active', 'revoked', 'expired', 'lost'])
  status?: 'active' | 'revoked' | 'expired' | 'lost';
}
