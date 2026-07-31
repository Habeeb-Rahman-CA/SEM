import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { TransferRequest } from './transfer-request.entity';

@Entity('transfer_windows')
@Index('idx_transfer_window_workspace_id', ['workspaceId'])
@Index('idx_transfer_window_dates', ['startAt', 'endAt'])
export class TransferWindow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_at', type: 'timestamp' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamp' })
  endAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'allowed_types',
    type: 'jsonb',
    nullable: true,
  })
  allowedTypes: Array<'permanent' | 'loan'> | null;

  @Column({
    name: 'max_transfers_per_team',
    type: 'int',
    nullable: true,
  })
  maxTransfersPerTeam: number | null;

  @OneToMany(() => TransferRequest, (r) => r.window)
  requests: TransferRequest[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
