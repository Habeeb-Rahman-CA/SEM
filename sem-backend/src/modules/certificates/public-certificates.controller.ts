import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';

@ApiTags('public-certificates')
@Controller('public/certificates')
export class PublicCertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('verify/:code')
  @ApiOperation({
    summary: 'Verify digital certificate by QR code or verification ID',
  })
  @ApiParam({ name: 'code', description: 'Unique certificate code' })
  async verifyCertificate(@Param('code') code: string) {
    return this.certificatesService.verifyCertificate(code);
  }
}
