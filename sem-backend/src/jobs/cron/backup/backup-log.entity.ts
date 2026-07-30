import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum BackupStatus {
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('backup_logs')
@Index(['status', 'createdAt'])
export class BackupLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  backupType: string;

  @Column()
  filename: string;

  @Column()
  filePath: string;

  @Column({ type: 'enum', enum: BackupStatus, default: BackupStatus.RUNNING })
  status: BackupStatus;

  @Column({ type: 'bigint', nullable: true })
  sizeBytes: number;

  @Column({ type: 'int', nullable: true })
  durationMs: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
