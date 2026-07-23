import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ErrorLoggerService } from './error-logger.service';
import { ErrorSeverity } from './error-log.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../auth/guards/super-admin.guard';

@ApiTags('Logs (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/logs')
export class LogsAdminController {
  constructor(private readonly errorLogger: ErrorLoggerService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve recent error logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'severity', required: false, enum: ErrorSeverity })
  getRecentLogs(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('severity') severity?: ErrorSeverity,
  ) {
    return this.errorLogger.getRecentErrors(limit, severity);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Error count by severity (last 24h)' })
  getStats() {
    return this.errorLogger.getErrorStats();
  }
}
