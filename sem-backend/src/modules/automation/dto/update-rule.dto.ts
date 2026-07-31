import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRuleDto } from './create-rule.dto';

export class UpdateRuleDto extends PartialType(
  OmitType(CreateRuleDto, ['triggerType'] as const),
) {}
