import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorLog, ErrorSeverity } from './error-log.entity';
import { createLogger, format, transports } from 'winston';
import * as path from 'path';
import * as fs from 'fs';

const { combine, timestamp, printf, colorize, errors, json } = format;

export interface LogErrorOptions {
  severity?: ErrorSeverity;
  context?: string;
  requestMethod?: string;
  requestPath?: string;
  statusCode?: number;
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ErrorLoggerService {
  private readonly nestLogger = new Logger(ErrorLoggerService.name);
  private readonly winston;
  private readonly logDir: string;

  constructor(
    @InjectRepository(ErrorLog)
    private readonly errorLogRepo: Repository<ErrorLog>,
  ) {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDir();
    this.winston = this.createWinstonLogger();
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  async logError(
    message: string,
    error: Error | null,
    options: LogErrorOptions = {},
  ): Promise<void> {
    const severity = options.severity ?? ErrorSeverity.ERROR;
    const stack = error?.stack ?? null;

    // 1. Write to Winston (file + console)
    this.writeToWinston(severity, message, { ...options, stack });

    // 2. Persist to DB (only warn/error/critical — not noisy debug/info)
    if ([ErrorSeverity.WARN, ErrorSeverity.ERROR, ErrorSeverity.CRITICAL].includes(severity)) {
      await this.persistToDb(message, stack, options, severity);
    }
  }

  async getRecentErrors(limit = 50, severity?: ErrorSeverity): Promise<ErrorLog[]> {
    const qb = this.errorLogRepo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .take(limit);

    if (severity) {
      qb.where('log.severity = :severity', { severity });
    }
    return qb.getMany();
  }

  async getErrorStats(): Promise<Record<string, number>> {
    const rows = await this.errorLogRepo
      .createQueryBuilder('log')
      .select('log.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where("log.createdAt > NOW() - INTERVAL '24 hours'")
      .groupBy('log.severity')
      .getRawMany();

    return Object.fromEntries(rows.map((r) => [r.severity, parseInt(r.count, 10)]));
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async persistToDb(
    message: string,
    stack: string | null,
    options: LogErrorOptions,
    severity: ErrorSeverity,
  ): Promise<void> {
    try {
      const log = this.errorLogRepo.create({
        severity,
        message,
        context: options.context,
        stack,
        requestMethod: options.requestMethod,
        requestPath: options.requestPath,
        statusCode: options.statusCode,
        userId: options.userId,
        username: options.username,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        metadata: options.metadata,
      });
      await this.errorLogRepo.save(log);
    } catch (dbErr) {
      // Never let logging kill the app
      this.nestLogger.error('Failed to persist error log to DB', dbErr instanceof Error ? dbErr.stack : String(dbErr));
    }
  }

  private writeToWinston(severity: ErrorSeverity, message: string, meta: any): void {
    const level = severity === ErrorSeverity.CRITICAL ? 'error' : severity;
    this.winston.log(level, message, meta);
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private createWinstonLogger() {
    const consoleFormat = combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      printf(({ level, message, timestamp: ts, context, stack }) => {
        const ctx = context ? ` [${context}]` : '';
        return `${ts} ${level}${ctx}: ${message}${stack ? `\n${stack}` : ''}`;
      }),
    );

    const fileFormat = combine(
      timestamp(),
      errors({ stack: true }),
      json(),
    );

    return createLogger({
      level: process.env.LOG_LEVEL ?? 'info',
      transports: [
        new transports.Console({ format: consoleFormat }),
        new transports.File({
          filename: path.join(this.logDir, 'error.log'),
          level: 'error',
          format: fileFormat,
          maxsize: 10 * 1024 * 1024, // 10 MB
          maxFiles: 5,
        }),
        new transports.File({
          filename: path.join(this.logDir, 'combined.log'),
          format: fileFormat,
          maxsize: 10 * 1024 * 1024,
          maxFiles: 10,
        }),
      ],
    });
  }
}
