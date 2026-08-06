import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CertificatesService, CertificateType } from './certificates.service';

@ApiTags('certificates')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/certificates')
@UseGuards(JwtAuthGuard)
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get()
  @ApiOperation({
    summary: 'List generated digital certificates for a workspace',
  })
  @ApiQuery({ name: 'eventId', required: false })
  async listCertificates(
    @Param('workspaceId') workspaceId: string,
    @Query('eventId') eventId?: string,
    @Request() req?: any,
  ) {
    return this.certificatesService.listCertificates(
      workspaceId,
      eventId,
      req?.user?.id,
    );
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a single digital certificate' })
  async generateCertificate(
    @Param('workspaceId') workspaceId: string,
    @Body()
    dto: {
      recipientName: string;
      recipientEmail?: string;
      certificateType: CertificateType;
      eventName: string;
      eventId?: string;
      position?: string;
      issueDate?: string;
      signatoryName?: string;
      signatoryTitle?: string;
    },
    @Request() req?: any,
  ) {
    return this.certificatesService.generateCertificate(
      workspaceId,
      dto,
      req?.user?.id,
    );
  }

  @Post('bulk-generate')
  @ApiOperation({
    summary:
      'Automatically generate digital certificates for winners, participants, referees, volunteers, and organizers',
  })
  async bulkGenerate(
    @Param('workspaceId') workspaceId: string,
    @Body()
    dto: {
      eventName: string;
      eventId?: string;
      types?: CertificateType[];
      recipients?: Array<{
        name: string;
        email?: string;
        type: CertificateType;
        position?: string;
      }>;
    },
    @Request() req?: any,
  ) {
    return this.certificatesService.bulkGenerateCertificates(
      workspaceId,
      dto,
      req?.user?.id,
    );
  }
}
