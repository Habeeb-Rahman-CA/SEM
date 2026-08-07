import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatSecurityService } from './chat-security.service';

@Controller('workspaces/:workspaceId/chat/security')
@UseGuards(JwtAuthGuard)
export class ChatSecurityController {
  constructor(private readonly securityService: ChatSecurityService) {}

  // 1. E2EE Public Key Exchange
  @Post('e2ee/keys')
  async registerE2EEKey(
    @Req() req: any,
    @Body('publicKey') publicKey: string,
    @Body('algorithm') algorithm?: string,
  ) {
    const userId = req.user?.id || 'user-1';
    return await this.securityService.registerUserPublicKey(
      userId,
      publicKey,
      algorithm,
    );
  }

  @Get('e2ee/keys/:userId')
  async getE2EEKey(@Param('userId') userId: string) {
    return await this.securityService.getUserPublicKey(userId);
  }

  // 2. File Security Scanner Pre-Check
  @Post('scan-file')
  async scanFile(
    @Body('fileName') fileName: string,
    @Body('mimeType') mimeType: string,
    @Body('fileSize') fileSize: number,
  ) {
    return await this.securityService.scanFile(fileName, mimeType, fileSize);
  }

  // 3. Message Retention Policy Endpoints
  @Get('retention')
  async getRetentionPolicy(@Param('workspaceId') workspaceId: string) {
    return await this.securityService.getRetentionPolicy(workspaceId);
  }

  @Put('retention')
  async updateRetentionPolicy(
    @Param('workspaceId') workspaceId: string,
    @Body('retentionDays') retentionDays: number,
    @Body('autoDeleteMedia') autoDeleteMedia: boolean,
    @Body('enabled') enabled: boolean,
  ) {
    return await this.securityService.updateRetentionPolicy(
      workspaceId,
      retentionDays,
      autoDeleteMedia,
      enabled,
    );
  }

  @Post('retention/purge')
  async purgeExpiredMessages(@Param('workspaceId') workspaceId: string) {
    return await this.securityService.applyRetentionPolicy(workspaceId);
  }
}
