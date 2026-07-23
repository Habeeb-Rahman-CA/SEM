import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';

export interface SystemMetrics {
  timestamp: string;
  process: {
    uptime: number;
    uptimeFormatted: string;
    pid: number;
    nodeVersion: string;
  };
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    externalMB: number;
    heapUsedPercent: number;
    systemFreeMB: number;
    systemTotalMB: number;
    systemUsedPercent: number;
  };
  cpu: {
    model: string;
    cores: number;
    loadAvg1m: number;
    loadAvg5m: number;
    loadAvg15m: number;
  };
  environment: string;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  async collect(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    const loadAvg = os.loadavg();
    const freeMemBytes = os.freemem();
    const totalMemBytes = os.totalmem();
    const uptimeSeconds = process.uptime();

    return {
      timestamp: new Date().toISOString(),
      process: {
        uptime: Math.floor(uptimeSeconds),
        uptimeFormatted: this.formatUptime(uptimeSeconds),
        pid: process.pid,
        nodeVersion: process.version,
      },
      memory: {
        heapUsedMB: this.toMB(memUsage.heapUsed),
        heapTotalMB: this.toMB(memUsage.heapTotal),
        rssMB: this.toMB(memUsage.rss),
        externalMB: this.toMB(memUsage.external),
        heapUsedPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        systemFreeMB: this.toMB(freeMemBytes),
        systemTotalMB: this.toMB(totalMemBytes),
        systemUsedPercent: Math.round(((totalMemBytes - freeMemBytes) / totalMemBytes) * 100),
      },
      cpu: {
        model: os.cpus()[0]?.model ?? 'unknown',
        cores: os.cpus().length,
        loadAvg1m: parseFloat(loadAvg[0].toFixed(2)),
        loadAvg5m: parseFloat(loadAvg[1].toFixed(2)),
        loadAvg15m: parseFloat(loadAvg[2].toFixed(2)),
      },
      environment: process.env.NODE_ENV ?? 'development',
    };
  }

  private toMB(bytes: number): number {
    return parseFloat((bytes / 1024 / 1024).toFixed(2));
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  }
}
