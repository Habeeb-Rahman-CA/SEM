import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiProperty,
} from '@nestjs/swagger';
import { RecoveryService, CircuitState } from './recovery.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../modules/auth/guards/super-admin.guard';

// ─── Response shape classes for Swagger ──────────────────────────────────────

class CircuitBreakerInfo {
  @ApiProperty({
    enum: CircuitState,
    example: CircuitState.CLOSED,
    description:
      'CLOSED = healthy; OPEN = tripped (requests rejected); HALF_OPEN = probing recovery',
  })
  state: CircuitState;

  @ApiProperty({
    example: 0,
    description: 'Consecutive failure count since the last reset',
  })
  failureCount: number;

  @ApiProperty({
    example: 0,
    description: 'Consecutive success count during HALF_OPEN probing',
  })
  successCount: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Timestamp of the most recent failure',
  })
  lastFailureAt: Date | null;

  @ApiProperty({
    example: '2026-07-23T13:00:00.000Z',
    nullable: true,
    description: 'Timestamp of the most recent successful call',
  })
  lastSuccessAt: Date | null;

  @ApiProperty({
    example: null,
    nullable: true,
    description:
      'Earliest time a recovery probe will be attempted (OPEN → HALF_OPEN)',
  })
  nextAttemptAt: Date | null;
}

class CircuitsStatusResponse {
  @ApiProperty({
    type: CircuitBreakerInfo,
    description: 'PostgreSQL database circuit',
  })
  database: CircuitBreakerInfo;

  @ApiProperty({ type: CircuitBreakerInfo, description: 'Redis circuit' })
  redis: CircuitBreakerInfo;

  @ApiProperty({
    type: CircuitBreakerInfo,
    description: 'Cloudinary upload circuit',
  })
  cloudinary: CircuitBreakerInfo;
}

class CircuitResetResponse {
  @ApiProperty({ example: "Circuit 'database' reset to CLOSED" })
  message: string;

  @ApiProperty({ example: '2026-07-23T13:41:00.000Z' })
  timestamp: string;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Admin — Recovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/recovery')
export class RecoveryAdminController {
  constructor(private readonly recoveryService: RecoveryService) {}

  /**
   * GET /api/admin/recovery/circuits
   * Returns the current state of all registered circuit breakers.
   */
  @Get('circuits')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get circuit breaker states',
    description:
      'Returns the real-time state and counters for every registered circuit breaker.\n\n' +
      '**Circuit states:**\n' +
      '- `CLOSED` — healthy; all requests pass through normally\n' +
      '- `OPEN` — tripped after ≥ 5 consecutive failures; requests are rejected ' +
      'immediately to avoid cascade failures\n' +
      '- `HALF_OPEN` — after the 30-second recovery timeout, one probe request ' +
      'is allowed through; if it succeeds twice the circuit closes\n\n' +
      '**Registered circuits:** `database`, `redis`, `cloudinary`',
  })
  @ApiResponse({
    status: 200,
    description: 'Current state of all circuit breakers',
    type: CircuitsStatusResponse,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Super-admin access required' })
  getCircuits(): Record<
    string,
    {
      state: CircuitState;
      failureCount: number;
      successCount: number;
      lastFailureAt: Date | null;
      lastSuccessAt: Date | null;
      nextAttemptAt: Date | null;
    }
  > {
    return this.recoveryService.getCircuitStatus();
  }

  /**
   * POST /api/admin/recovery/circuits/:name/reset
   * Force a circuit breaker back to CLOSED state.
   */
  @Post('circuits/:name/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset a circuit breaker to CLOSED',
    description:
      'Manually forces the named circuit breaker back to the `CLOSED` state, ' +
      'resetting failure and success counters to zero. ' +
      'Use this after you have confirmed that the underlying dependency ' +
      '(e.g. Redis, Cloudinary) is healthy again and you want to restore ' +
      'traffic immediately without waiting for the automatic 30-second recovery timeout.\n\n' +
      '**Valid names:** `database`, `redis`, `cloudinary`',
  })
  @ApiParam({
    name: 'name',
    description: 'Name of the circuit breaker to reset',
    example: 'redis',
    enum: ['database', 'redis', 'cloudinary'],
  })
  @ApiResponse({
    status: 200,
    description: 'Circuit successfully reset to CLOSED',
    type: CircuitResetResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Super-admin access required',
  })
  resetCircuit(@Param('name') name: string): CircuitResetResponse {
    this.recoveryService.resetCircuit(name);
    return {
      message: `Circuit '${name}' reset to CLOSED`,
      timestamp: new Date().toISOString(),
    };
  }
}
