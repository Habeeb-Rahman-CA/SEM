import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DynamicFormsService } from './dynamic-forms.service';

@ApiTags('public-dynamic-forms')
@Controller('public/forms')
export class PublicDynamicFormsController {
  constructor(private readonly dynamicFormsService: DynamicFormsService) {}

  @Get(':formId')
  @ApiOperation({
    summary:
      'Get published public dynamic form structure for external submitters',
  })
  async getPublicForm(@Param('formId') formId: string) {
    return this.dynamicFormsService.getPublicForm(formId);
  }

  @Post(':formId/submit')
  @ApiOperation({
    summary:
      'Submit response data to a public dynamic form without login requirement',
  })
  async submitPublicForm(
    @Param('formId') formId: string,
    @Body() dto: { data: Record<string, any> },
  ) {
    return this.dynamicFormsService.submitForm('default-ws', formId, dto.data);
  }
}
