import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DynamicFormsService,
  FormCategory,
  FormFieldConfig,
  FormPlacement,
  FormStatus,
} from './dynamic-forms.service';

interface AuthenticatedRequest {
  user?: {
    id?: string;
  };
}

@ApiTags('dynamic-forms')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/dynamic-forms')
@UseGuards(JwtAuthGuard)
export class DynamicFormsController {
  constructor(private readonly dynamicFormsService: DynamicFormsService) {}

  @Get()
  @ApiOperation({ summary: 'List workspace custom no-code dynamic forms' })
  async listForms(
    @Param('workspaceId') workspaceId: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.dynamicFormsService.listForms(workspaceId, req?.user?.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new custom no-code dynamic form' })
  async createForm(
    @Param('workspaceId') workspaceId: string,
    @Body()
    dto: {
      title: string;
      description: string;
      category: FormCategory;
      placement?: FormPlacement;
      status?: FormStatus;
      fields: FormFieldConfig[];
    },
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.dynamicFormsService.createForm(workspaceId, dto, req?.user?.id);
  }

  @Post(':formId/status')
  @ApiOperation({ summary: 'Update form publish/draft status' })
  async updateFormStatus(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Body() dto: { status: FormStatus },
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.dynamicFormsService.updateFormStatus(
      workspaceId,
      formId,
      dto.status,
      req?.user?.id,
    );
  }

  @Get(':formId/submissions')
  @ApiOperation({ summary: 'List submitted form responses for a dynamic form' })
  async listSubmissions(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.dynamicFormsService.listSubmissions(
      workspaceId,
      formId,
      req?.user?.id,
    );
  }

  @Post(':formId/submit')
  @ApiOperation({ summary: 'Submit response data to a dynamic form' })
  async submitForm(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Body() dto: { data: Record<string, any> },
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.dynamicFormsService.submitForm(
      workspaceId,
      formId,
      dto.data,
      req?.user?.id,
    );
  }
}
