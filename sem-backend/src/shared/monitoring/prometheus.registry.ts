import { Injectable } from '@nestjs/common';
import { monitorEventLoopDelay } from 'perf_hooks';

/**
 * PrometheusRegistry — a zero-dependency, exposition-format-compatible
 * metrics registry. We avoid pulling in `prom-client` because the
 * dependency footprint isn't justified for the handful of series this
 * app needs; the plain text format is stable and one page long.
 *
 * Supported metric types:
 *   - Counter (monotonic increases only)
 *   - Gauge  (up + down)
 *   - Histogram (fixed buckets, standard `_bucket / _sum / _count` triple)
 *
 * Labels are supported for all three. Series are keyed by
 * `name + sorted(labels)`, so the same metric with different label
 * combinations coexists.
 *
 * The registry also samples runtime data (event-loop lag, memory, CPU,
 * GC) so the standard `/metrics` scrape contains everything Prometheus
 * needs without any per-service wiring.
 */

type Labels = Record<string, string | number>;

interface CounterSeries {
  labels: Labels;
  value: number;
}

interface GaugeSeries {
  labels: Labels;
  value: number;
}

interface HistogramSeries {
  labels: Labels;
  buckets: number[]; // upper bounds
  bucketCounts: number[];
  sum: number;
  count: number;
}

const DEFAULT_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

interface CounterDef {
  name: string;
  help: string;
  series: Map<string, CounterSeries>;
}

interface GaugeDef {
  name: string;
  help: string;
  series: Map<string, GaugeSeries>;
}

interface HistogramDef {
  name: string;
  help: string;
  buckets: number[];
  series: Map<string, HistogramSeries>;
}

@Injectable()
export class PrometheusRegistry {
  private counters = new Map<string, CounterDef>();
  private gauges = new Map<string, GaugeDef>();
  private histograms = new Map<string, HistogramDef>();
  private eventLoop: ReturnType<typeof monitorEventLoopDelay>;
  private startedAt = Date.now();
  private startCpu = process.cpuUsage();

  constructor() {
    // Standard app-agnostic series
    this.registerCounter(
      'sem_http_requests_total',
      'Total HTTP requests handled by route + status',
    );
    this.registerHistogram(
      'sem_http_request_duration_seconds',
      'HTTP request duration in seconds by route + status',
      DEFAULT_BUCKETS,
    );
    this.registerGauge(
      'sem_process_memory_bytes',
      'Process memory by type (rss/heapUsed/heapTotal/external)',
    );
    this.registerGauge(
      'sem_process_cpu_percent',
      'Process CPU utilisation (0-100)',
    );
    this.registerGauge(
      'sem_event_loop_lag_seconds',
      'Event-loop delay percentiles in seconds',
    );
    this.registerGauge(
      'sem_process_uptime_seconds',
      'Process uptime in seconds',
    );
    this.registerCounter(
      'sem_errors_total',
      'Total unhandled errors caught by the global filter',
    );
    this.registerGauge(
      'sem_active_connections',
      'Currently open logical connections (ws/db/etc.)',
    );

    // Event-loop delay monitor — samples on a 20 ms resolution
    this.eventLoop = monitorEventLoopDelay({ resolution: 20 });
    this.eventLoop.enable();
  }

  // ─── Definitions ────────────────────────────────────────────────────

  registerCounter(name: string, help: string): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, { name, help, series: new Map() });
    }
  }

  registerGauge(name: string, help: string): void {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, { name, help, series: new Map() });
    }
  }

  registerHistogram(
    name: string,
    help: string,
    buckets = DEFAULT_BUCKETS,
  ): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, {
        name,
        help,
        buckets: [...buckets].sort((a, b) => a - b),
        series: new Map(),
      });
    }
  }

  // ─── Mutators ───────────────────────────────────────────────────────

  incCounter(name: string, labels: Labels = {}, by = 1): void {
    const def = this.counters.get(name);
    if (!def) return;
    const key = this.seriesKey(labels);
    const s = def.series.get(key);
    if (s) s.value += by;
    else def.series.set(key, { labels, value: by });
  }

  setGauge(name: string, value: number, labels: Labels = {}): void {
    const def = this.gauges.get(name);
    if (!def) return;
    const key = this.seriesKey(labels);
    const s = def.series.get(key);
    if (s) s.value = value;
    else def.series.set(key, { labels, value });
  }

  observeHistogram(name: string, value: number, labels: Labels = {}): void {
    const def = this.histograms.get(name);
    if (!def) return;
    const key = this.seriesKey(labels);
    let s = def.series.get(key);
    if (!s) {
      s = {
        labels,
        buckets: def.buckets,
        bucketCounts: new Array(def.buckets.length).fill(0),
        sum: 0,
        count: 0,
      };
      def.series.set(key, s);
    }
    for (let i = 0; i < def.buckets.length; i += 1) {
      if (value <= def.buckets[i]) s.bucketCounts[i] += 1;
    }
    s.sum += value;
    s.count += 1;
  }

  // ─── Rendering ──────────────────────────────────────────────────────

  render(): string {
    this.refreshRuntimeSeries();
    const lines: string[] = [];

    for (const def of this.counters.values()) {
      lines.push(`# HELP ${def.name} ${def.help}`);
      lines.push(`# TYPE ${def.name} counter`);
      for (const s of def.series.values()) {
        lines.push(`${def.name}${this.labelString(s.labels)} ${s.value}`);
      }
    }
    for (const def of this.gauges.values()) {
      lines.push(`# HELP ${def.name} ${def.help}`);
      lines.push(`# TYPE ${def.name} gauge`);
      for (const s of def.series.values()) {
        lines.push(`${def.name}${this.labelString(s.labels)} ${s.value}`);
      }
    }
    for (const def of this.histograms.values()) {
      lines.push(`# HELP ${def.name} ${def.help}`);
      lines.push(`# TYPE ${def.name} histogram`);
      for (const s of def.series.values()) {
        let cumulative = 0;
        for (let i = 0; i < def.buckets.length; i += 1) {
          cumulative += s.bucketCounts[i];
          const le = def.buckets[i];
          const labels = { ...s.labels, le: String(le) };
          lines.push(
            `${def.name}_bucket${this.labelString(labels)} ${cumulative}`,
          );
        }
        // +Inf bucket = count
        const infLabels = { ...s.labels, le: '+Inf' };
        lines.push(
          `${def.name}_bucket${this.labelString(infLabels)} ${s.count}`,
        );
        lines.push(`${def.name}_sum${this.labelString(s.labels)} ${s.sum}`);
        lines.push(`${def.name}_count${this.labelString(s.labels)} ${s.count}`);
      }
    }
    return lines.join('\n') + '\n';
  }

  // ─── Runtime samplers ───────────────────────────────────────────────

  private refreshRuntimeSeries(): void {
    const mem = process.memoryUsage();
    this.setGauge('sem_process_memory_bytes', mem.rss, { type: 'rss' });
    this.setGauge('sem_process_memory_bytes', mem.heapUsed, {
      type: 'heap_used',
    });
    this.setGauge('sem_process_memory_bytes', mem.heapTotal, {
      type: 'heap_total',
    });
    this.setGauge('sem_process_memory_bytes', mem.external, {
      type: 'external',
    });

    const cpu = process.cpuUsage(this.startCpu);
    const elapsedMs = Date.now() - this.startedAt;
    const cpuSec = (cpu.user + cpu.system) / 1_000_000;
    const cpuPercent =
      elapsedMs > 0 ? +((cpuSec / (elapsedMs / 1000)) * 100).toFixed(2) : 0;
    this.setGauge('sem_process_cpu_percent', cpuPercent);

    this.setGauge('sem_process_uptime_seconds', Math.round(process.uptime()));

    // Event-loop lag — percentiles in seconds (ns from perf_hooks)
    const lag = this.eventLoop;
    this.setGauge('sem_event_loop_lag_seconds', lag.mean / 1e9, { q: 'mean' });
    this.setGauge('sem_event_loop_lag_seconds', lag.percentile(50) / 1e9, {
      q: 'p50',
    });
    this.setGauge('sem_event_loop_lag_seconds', lag.percentile(95) / 1e9, {
      q: 'p95',
    });
    this.setGauge('sem_event_loop_lag_seconds', lag.percentile(99) / 1e9, {
      q: 'p99',
    });
    this.setGauge('sem_event_loop_lag_seconds', lag.max / 1e9, { q: 'max' });
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private seriesKey(labels: Labels): string {
    const keys = Object.keys(labels).sort();
    return keys.map((k) => `${k}=${labels[k]}`).join(',');
  }

  private labelString(labels: Labels): string {
    const keys = Object.keys(labels);
    if (keys.length === 0) return '';
    const parts = keys.map(
      (k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`,
    );
    return `{${parts.join(',')}}`;
  }
}
