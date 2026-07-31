import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateInjuryDto } from './create-injury.dto';

export class UpdateInjuryDto extends PartialType(
  OmitType(CreateInjuryDto, ['profileId'] as const),
) {}
