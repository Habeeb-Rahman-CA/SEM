import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { PrometheusRegistry } from './prometheus.registry';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../modules/auth/guards/super-admin.guard';

// ─── Response shape classes for Swagger ──────────────────────────────────────

class LivenessResponse {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: '2026-07-23T13:00:00.000Z' })
  timestamp: string;
}

class HealthIndicatorResult {
  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  status: string;
}

class ReadinessResponse {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  status: string;

  @ApiProperty({
    description: 'Individual indicator results',
    example: {
      database: { status: 'up' },
      memory_heap: { status: 'up' },
      memory_rss: { status: 'up' },
      disk: { status: 'up' },
    },
  })
  info: Record<string, HealthIndicatorResult>;

  @ApiProperty({ description: 'Failed indicators (if any)', example: {} })
  error: Record<string, HealthIndicatorResult>;

  @ApiProperty({ description: 'Combined view of all indicators' })
  details: Record<string, HealthIndicatorResult>;
}

class ProcessMetrics {
  @ApiProperty({ example: 3661 })
  uptime: number;

  @ApiProperty({ example: '0d 1h 1m 1s' })
  uptimeFormatted: string;

  @ApiProperty({ example: 36016 })
  pid: number;

  @ApiProperty({ example: 'v22.0.0' })
  nodeVersion: string;
}

class MemoryMetrics {
  @ApiProperty({ example: 45.21 })
  heapUsedMB: number;

  @ApiProperty({ example: 72.0 })
  heapTotalMB: number;

  @ApiProperty({ example: 110.5 })
  rssMB: number;

  @ApiProperty({ example: 1.2 })
  externalMB: number;

  @ApiProperty({ example: 62, description: 'Heap used as % of heap total' })
  heapUsedPercent: number;

  @ApiProperty({ example: 4096.0 })
  systemFreeMB: number;

  @ApiProperty({ example: 8192.0 })
  systemTotalMB: number;

  @ApiProperty({ example: 50, description: 'System RAM used as % of total' })
  systemUsedPercent: number;
}

class CpuMetrics {
  @ApiProperty({ example: 'Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz' })
  model: string;

  @ApiProperty({ example: 12 })
  cores: number;

  @ApiProperty({ example: 0.45, description: '1-minute load average' })
  loadAvg1m: number;

  @ApiProperty({ example: 0.32, description: '5-minute load average' })
  loadAvg5m: number;

  @ApiProperty({ example: 0.28, description: '15-minute load average' })
  loadAvg15m: number;
}

class MetricsResponse {
  @ApiProperty({ example: '2026-07-23T13:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ type: ProcessMetrics })
  process: ProcessMetrics;

  @ApiProperty({ type: MemoryMetrics })
  memory: MemoryMetrics;

  @ApiProperty({ type: CpuMetrics })
  cpu: CpuMetrics;

  @ApiProperty({
    example: 'development',
    enum: ['development', 'production', 'test'],
  })
  environment: string;
}

// ─── Controller ──────────────────────────────────────────────────────────────

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
    private readonly prometheus: PrometheusRegistry,
  ) {}

  /**
   * GET /api/health/prometheus
   * Prometheus text-exposition endpoint. Scrape target for Prometheus /
   * VictoriaMetrics / Grafana Agent / Alloy. Public because the standard
   * assumption is that scrape targets sit on a private network; put an
   * ingress-level allowlist in front if this is internet-facing.
   */
  @Get('prometheus')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Prometheus metrics (scrape endpoint)',
    description:
      'Standard `text/plain` Prometheus exposition format. Includes ' +
      '`sem_http_requests_total`, `sem_http_request_duration_seconds`, ' +
      '`sem_process_memory_bytes`, `sem_process_cpu_percent`, ' +
      '`sem_event_loop_lag_seconds`, `sem_process_uptime_seconds`, ' +
      'and `sem_errors_total`.',
  })
  prometheusMetrics(): string {
    return this.prometheus.render();
  }

  /**
   * GET /api/health/live
   * Public liveness probe — no authentication required.
   * Used by Kubernetes, Docker, and load balancers to detect crashed instances.
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'A lightweight check that confirms the Node.js process is alive. ' +
      'No authentication required. Intended for use by container orchestrators ' +
      '(Kubernetes, Docker Swarm) and load balancers to detect crashed instances. ' +
      'Returns HTTP 200 as long as the event loop is responsive.',
  })
  @ApiResponse({
    status: 200,
    description: 'Process is alive',
    type: LivenessResponse,
  })
  liveness(): LivenessResponse {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * GET /api/health/ready
   * Full readiness check against all downstream dependencies.
   * Super-admin only.
   */
  @Get('ready')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe (Super-admin)',
    description:
      'Performs a comprehensive health check against all downstream dependencies:\n\n' +
      '- **database** — PostgreSQL ping via TypeORM\n' +
      '- **memory_heap** — heap usage must be below 512 MB\n' +
      '- **memory_rss** — RSS must be below 1 GB\n' +
      '- **disk** — root partition must have ≥ 10% free space\n\n' +
      'Returns HTTP 200 when all indicators are `up`, or HTTP 503 ' +
      'when one or more indicators fail.',
  })
  @ApiResponse({
    status: 200,
    description: 'All indicators healthy',
    type: ReadinessResponse,
  })
  @ApiResponse({
    status: 503,
    description: 'One or more health indicators are down',
    type: ReadinessResponse,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Super-admin access required' })
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk', { thresholdPercent: 0.9, path: '/' }),
      // Event-loop lag check — sourced from the prometheus registry's
      // ongoing sampler. Flags the process as not-ready if p95 latency
      // is above 200ms (typical smoke test for a stalled loop).
      async () => {
        const rendered = this.prometheus.render();
        const match = rendered.match(
          /sem_event_loop_lag_seconds\{q="p95"\}\s+([\d.eE+-]+)/,
        );
        const p95 = match ? parseFloat(match[1]) : 0;
        const healthy = p95 < 0.2;
        return {
          event_loop: {
            status: healthy ? 'up' : 'down',
            p95Seconds: p95,
          },
        };
      },
    ]);
  }

  /**
   * GET /api/health/metrics
   * Process and system performance metrics snapshot.
   * Super-admin only.
   */
  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({
    summary: 'System performance metrics (Super-admin)',
    description:
      'Returns a real-time snapshot of application and host system performance:\n\n' +
      '- **process** — uptime, PID, Node.js version\n' +
      '- **memory** — heap usage, RSS, and system RAM utilisation\n' +
      '- **cpu** — CPU model, core count, and 1/5/15-minute load averages\n\n' +
      'Suitable for display in admin dashboards or export to monitoring systems.',
  })
  @ApiResponse({
    status: 200,
    description: 'Real-time process and system metrics',
    type: MetricsResponse,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Super-admin access required' })
  async metrics(): Promise<MetricsResponse> {
    return this.metricsService.collect();
  }
}
