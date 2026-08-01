import { Global, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { MetricsService } from './metrics.service';
import { PrometheusRegistry } from './prometheus.registry';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

@Global()
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [MetricsService, PrometheusRegistry, HttpMetricsInterceptor],
  exports: [MetricsService, PrometheusRegistry, HttpMetricsInterceptor],
})
export class MonitoringModule {}
