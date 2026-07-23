import { Injectable, Logger, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export enum CircuitState {
  CLOSED = 'CLOSED',   // normal — requests pass through
  OPEN = 'OPEN',       // tripped — requests are rejected
  HALF_OPEN = 'HALF_OPEN', // probing — one trial request allowed
}

interface CircuitBreaker {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: Date | null;
  lastSuccessAt: Date | null;
  nextAttemptAt: Date | null;
}

@Injectable()
export class RecoveryService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RecoveryService.name);

  /** Configurable thresholds */
  private readonly FAILURE_THRESHOLD = 5;     // trips circuit after N consecutive failures
  private readonly SUCCESS_THRESHOLD = 2;     // closes circuit after N consecutive successes (half-open)
  private readonly RECOVERY_TIMEOUT_MS = 30_000; // time before moving from OPEN → HALF_OPEN

  private readonly circuits = new Map<string, CircuitBreaker>();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.initCircuit('database');
    this.initCircuit('redis');
    this.initCircuit('cloudinary');
    this.logger.log('Recovery service initialized with circuit breakers: database, redis, cloudinary');
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.warn(`Application shutting down (signal: ${signal ?? 'unknown'})`);

    const gracePeriodMs = this.configService.get<number>('SHUTDOWN_GRACE_MS', 5000);
    this.logger.log(`Waiting ${gracePeriodMs}ms for in-flight requests to drain…`);
    await this.delay(gracePeriodMs);

    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.logger.log('Database connections closed cleanly');
    }
  }

  // ─── Circuit Breaker Public API ─────────────────────────────────────────

  /**
   * Execute a function through the named circuit breaker.
   * Falls back to `fallback` if the circuit is open or the call fails.
   */
  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    fallback?: () => T | Promise<T>,
  ): Promise<T> {
    const circuit = this.getOrInit(circuitName);

    if (circuit.state === CircuitState.OPEN) {
      if (this.canAttemptRecovery(circuit)) {
        circuit.state = CircuitState.HALF_OPEN;
        this.logger.log(`Circuit '${circuitName}' → HALF_OPEN (probe attempt)`);
      } else {
        this.logger.warn(`Circuit '${circuitName}' is OPEN — rejecting request`);
        if (fallback) return fallback();
        throw new Error(`Service '${circuitName}' is temporarily unavailable`);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(circuit);
      return result;
    } catch (err) {
      this.recordFailure(circuit, err);
      if (fallback) return fallback();
      throw err;
    }
  }

  /**
   * Retry an async operation with exponential back-off.
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    options: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {},
  ): Promise<T> {
    const { maxAttempts = 3, baseDelayMs = 300, label = 'operation' } = options;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        return await operation();
      } catch (err) {
        attempt++;
        if (attempt >= maxAttempts) {
          this.logger.error(`${label} failed after ${maxAttempts} attempt(s)`, err instanceof Error ? err.stack : String(err));
          throw err;
        }
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(`${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms…`);
        await this.delay(delay);
      }
    }

    throw new Error(`${label}: max retry attempts exceeded`);
  }

  /**
   * Returns a snapshot of all circuit breaker states (for monitoring).
   */
  getCircuitStatus(): Record<string, Omit<CircuitBreaker, 'name'>> {
    const result: Record<string, any> = {};
    for (const [name, cb] of this.circuits.entries()) {
      const { name: _n, ...rest } = cb;
      result[name] = rest;
    }
    return result;
  }

  /**
   * Manually reset a circuit breaker (admin action).
   */
  resetCircuit(name: string): void {
    const circuit = this.circuits.get(name);
    if (!circuit) return;
    circuit.state = CircuitState.CLOSED;
    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.nextAttemptAt = null;
    this.logger.log(`Circuit '${name}' manually reset to CLOSED`);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private initCircuit(name: string): CircuitBreaker {
    const cb: CircuitBreaker = {
      name,
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureAt: null,
      lastSuccessAt: null,
      nextAttemptAt: null,
    };
    this.circuits.set(name, cb);
    return cb;
  }

  private getOrInit(name: string): CircuitBreaker {
    return this.circuits.get(name) ?? this.initCircuit(name);
  }

  private recordSuccess(circuit: CircuitBreaker): void {
    circuit.lastSuccessAt = new Date();
    circuit.failureCount = 0;

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successCount++;
      if (circuit.successCount >= this.SUCCESS_THRESHOLD) {
        circuit.state = CircuitState.CLOSED;
        circuit.successCount = 0;
        this.logger.log(`Circuit '${circuit.name}' → CLOSED (recovered)`);
      }
    }
  }

  private recordFailure(circuit: CircuitBreaker, err: any): void {
    circuit.failureCount++;
    circuit.lastFailureAt = new Date();
    circuit.successCount = 0;

    this.logger.warn(
      `Circuit '${circuit.name}' failure #${circuit.failureCount}: ${err?.message ?? err}`,
    );

    if (circuit.failureCount >= this.FAILURE_THRESHOLD || circuit.state === CircuitState.HALF_OPEN) {
      circuit.state = CircuitState.OPEN;
      circuit.nextAttemptAt = new Date(Date.now() + this.RECOVERY_TIMEOUT_MS);
      this.logger.error(
        `Circuit '${circuit.name}' → OPEN (will retry after ${this.RECOVERY_TIMEOUT_MS / 1000}s)`,
      );
    }
  }

  private canAttemptRecovery(circuit: CircuitBreaker): boolean {
    return circuit.nextAttemptAt !== null && new Date() >= circuit.nextAttemptAt;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
