import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

@Entity('error_logs')
@Index(['severity', 'createdAt'])
@Index(['userId', 'createdAt'])
export class ErrorLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ErrorSeverity, default: ErrorSeverity.ERROR })
  severity: ErrorSeverity;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true })
  context: string | null;

  @Column({ type: 'text', nullable: true })
  stack: string | null;

  @Column({ type: 'varchar', nullable: true })
  requestMethod: string | null;

  @Column({ type: 'varchar', nullable: true })
  requestPath: string | null;

  @Column({ type: 'int', nullable: true })
  statusCode: number | null;

  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', nullable: true })
  username: string | null;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
