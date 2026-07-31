import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRecoveryPlanDto } from './create-recovery-plan.dto';

export class UpdateRecoveryPlanDto extends PartialType(
  OmitType(CreateRecoveryPlanDto, ['injuryId'] as const),
) {}
