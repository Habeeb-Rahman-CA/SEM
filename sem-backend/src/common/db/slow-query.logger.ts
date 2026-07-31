import { Logger as NestLogger } from '@nestjs/common';
import type { Logger as TypeOrmLogger } from 'typeorm';

/**
 * SlowQueryLogger surfaces queries that exceed a duration threshold as
 * WARN-level logs. Below the threshold, it stays completely silent so
 * production log volume doesn't explode.
 *
 * The threshold is also passed to TypeORM's `maxQueryExecutionTime` so
 * TypeORM emits its own internal warning — we plug into the same signal
 * to get structured, formatted output plus the ability to sample or
 * ship them elsewhere later.
 *
 * Query errors always log. Migrations always log. Everything else is
 * conditional on the threshold, or the log level in `logQuery`.
 */
export class SlowQueryLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger('DB');

  constructor(
    /** Millisecond threshold above which a query is considered "slow". */
    private readonly slowMs: number = 500,
    /** Verbose mode: log every query, not just slow ones. */
    private readonly verbose: boolean = false,
  ) {}

  logQuery(query: string, parameters?: unknown[]) {
    if (!this.verbose) return;
    this.logger.debug(
      `[QUERY] ${this.trim(query)}${this.formatParams(parameters)}`,
    );
  }

  logQueryError(error: string | Error, query: string, parameters?: unknown[]) {
    const msg = error instanceof Error ? error.message : error;
    this.logger.error(
      `[QUERY-ERROR] ${msg} — ${this.trim(query)}${this.formatParams(parameters)}`,
    );
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[]) {
    if (time < this.slowMs) return;
    this.logger.warn(
      `[SLOW ${time}ms] ${this.trim(query)}${this.formatParams(parameters)}`,
    );
  }

  logSchemaBuild(message: string) {
    this.logger.log(`[SCHEMA] ${message}`);
  }

  logMigration(message: string) {
    this.logger.log(`[MIGRATION] ${message}`);
  }

  log(level: 'log' | 'info' | 'warn', message: any) {
    if (level === 'warn') this.logger.warn(String(message));
    else this.logger.log(String(message));
  }

  private trim(query: string): string {
    const compact = query.replace(/\s+/g, ' ').trim();
    return compact.length > 320 ? compact.slice(0, 317) + '…' : compact;
  }

  private formatParams(params?: unknown[]): string {
    if (!params || params.length === 0) return '';
    try {
      const rendered = JSON.stringify(params);
      return rendered.length > 200
        ? ` [params: ${rendered.slice(0, 197)}…]`
        : ` [params: ${rendered}]`;
    } catch {
      return ' [params: <unserializable>]';
    }
  }
}
