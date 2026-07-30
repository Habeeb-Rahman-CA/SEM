import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { ErrorLoggerService } from './error-logger.service';
import { ErrorSeverity } from './error-log.entity';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../modules/auth/guards/super-admin.guard';

// ─── Response shape classes for Swagger ──────────────────────────────────────

class ErrorLogResponse {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id: string;

  @ApiProperty({ enum: ErrorSeverity, example: ErrorSeverity.ERROR })
  severity: ErrorSeverity;

  @ApiProperty({ example: 'Cannot read property of undefined' })
  message: string;

  @ApiProperty({ example: 'HttpException', nullable: true })
  context: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Full stack trace (server errors only)',
  })
  stack: string | null;

  @ApiProperty({ example: 'POST', nullable: true })
  requestMethod: string | null;

  @ApiProperty({ example: '/api/workspaces/123/matches', nullable: true })
  requestPath: string | null;

  @ApiProperty({ example: 500, nullable: true })
  statusCode: number | null;

  @ApiProperty({ example: 'uuid-of-user', nullable: true })
  userId: string | null;

  @ApiProperty({ example: 'john_doe', nullable: true })
  username: string | null;

  @ApiProperty({ example: '192.168.1.1', nullable: true })
  ipAddress: string | null;

  @ApiProperty({ example: 'Mozilla/5.0 ...', nullable: true })
  userAgent: string | null;

  @ApiProperty({ example: '2026-07-23T13:00:00.000Z' })
  createdAt: Date;
}

class ErrorStatsResponse {
  @ApiProperty({
    example: 12,
    description: 'Number of WARN events in the last 24h',
  })
  warn: number;

  @ApiProperty({
    example: 3,
    description: 'Number of ERROR events in the last 24h',
  })
  error: number;

  @ApiProperty({
    example: 0,
    description: 'Number of CRITICAL events in the last 24h',
  })
  critical: number;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Admin — Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/logs')
export class LogsAdminController {
  constructor(private readonly errorLogger: ErrorLoggerService) {}

  /**
   * GET /api/admin/logs
   * Returns the most recent error log entries, optionally filtered by severity.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List recent error logs',
    description:
      'Returns the most recent structured error log entries persisted to the database. ' +
      'Only WARN, ERROR and CRITICAL entries are stored. ' +
      'Optionally filter by severity and control the result set size via `limit`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 50,
    description: 'Maximum number of records to return (default: 50)',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ErrorSeverity,
    description: 'Filter results to a specific severity level',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of error log records ordered by most recent first',
    type: [ErrorLogResponse],
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Super-admin access required' })
  getRecentLogs(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('severity') severity?: ErrorSeverity,
  ) {
    return this.errorLogger.getRecentErrors(limit, severity);
  }

  /**
   * GET /api/admin/logs/stats
   * Returns error event counts grouped by severity for the past 24 hours.
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Error statistics (last 24 h)',
    description:
      'Returns a summary of error event counts grouped by severity level ' +
      'for the rolling 24-hour window. Useful for dashboard widgets and alerting.',
  })
  @ApiResponse({
    status: 200,
    description: 'Error counts by severity for the last 24 hours',
    type: ErrorStatsResponse,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Super-admin access required' })
  getStats() {
    return this.errorLogger.getErrorStats();
  }
}
