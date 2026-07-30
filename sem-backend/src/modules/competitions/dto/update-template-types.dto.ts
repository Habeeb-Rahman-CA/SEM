import { PartialType } from '@nestjs/swagger';
import { CreateCompetitionTemplateDto } from './create-competition-template.dto';
import { CreateFixtureTemplateDto } from './create-fixture-template.dto';

export class UpdateCompetitionTemplateDto extends PartialType(
  CreateCompetitionTemplateDto,
) {}
export class UpdateFixtureTemplateDto extends PartialType(
  CreateFixtureTemplateDto,
) {}
