import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecoveryService, CircuitState } from './recovery.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../auth/guards/super-admin.guard';

@ApiTags('Recovery (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/recovery')
export class RecoveryAdminController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Get('circuits')
  @ApiOperation({ summary: 'Get all circuit breaker states' })
  getCircuits(): Record<string, { state: CircuitState; failureCount: number; successCount: number; lastFailureAt: Date | null; lastSuccessAt: Date | null; nextAttemptAt: Date | null }> {
    return this.recoveryService.getCircuitStatus();
  }

  @Post('circuits/:name/reset')
  @ApiOperation({ summary: 'Manually reset a named circuit breaker to CLOSED' })
  resetCircuit(@Param('name') name: string): { message: string; timestamp: string } {
    this.recoveryService.resetCircuit(name);
    return { message: `Circuit '${name}' reset to CLOSED`, timestamp: new Date().toISOString() };
  }
}
