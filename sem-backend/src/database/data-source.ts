import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { SlowQueryLogger } from '../common/db/slow-query.logger';

// Load environment variables from .env file
config();

const slowMs = process.env.DB_SLOW_QUERY_MS
  ? parseInt(process.env.DB_SLOW_QUERY_MS, 10)
  : 500;

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'sem_db',
  synchronize: false, // Always keep false for migrations to avoid data loss
  // Keep only structural / warning logs by default; slow queries surface
  // via the custom logger. Set DB_VERBOSE_LOG=true locally to see every query.
  logging: ['error', 'schema', 'warn', 'migration'],
  maxQueryExecutionTime: slowMs,
  logger: new SlowQueryLogger(slowMs, process.env.DB_VERBOSE_LOG === 'true'),
  entities: [path.join(__dirname, '/../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '/migrations/*{.ts,.js}')],
  subscribers: [],
  extra: {
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 20,
    min: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN, 10) : 2,
    idleTimeoutMillis: process.env.DB_POOL_IDLE_MS
      ? parseInt(process.env.DB_POOL_IDLE_MS, 10)
      : 30_000,
    connectionTimeoutMillis: process.env.DB_POOL_CONNECTION_TIMEOUT_MS
      ? parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 10)
      : 10_000,
    statement_timeout: process.env.DB_STATEMENT_TIMEOUT_MS
      ? parseInt(process.env.DB_STATEMENT_TIMEOUT_MS, 10)
      : 30_000,
  },
});
