import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSessionDto } from './create-session.dto';

export class UpdateSessionDto extends PartialType(
  OmitType(CreateSessionDto, ['platform', 'streamUrl'] as const),
) {}
