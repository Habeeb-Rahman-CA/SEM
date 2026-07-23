import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../auth/guards/super-admin.guard';

@ApiTags('Health & Monitoring')
@ApiBearerAuth()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly metricsService: MetricsService,
  ) {}

  /** Public liveness probe — used by load balancers / container orchestrators */
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe (no auth required)' })
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** Full readiness probe — checks all downstream dependencies */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness / full health check' })
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),   // 512 MB
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),   // 1 GB
      () =>
        this.disk.checkStorage('disk', {
          thresholdPercent: 0.9,
          path: '/',
        }),
    ]);
  }

  /** Application metrics endpoint */
  @Get('metrics')
  @ApiOperation({ summary: 'Application performance metrics' })
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async metrics() {
    return this.metricsService.collect();
  }
}
