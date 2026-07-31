import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMedicalProfileDto } from './create-medical-profile.dto';

export class UpdateMedicalProfileDto extends PartialType(
  OmitType(CreateMedicalProfileDto, ['playerId'] as const),
) {}
