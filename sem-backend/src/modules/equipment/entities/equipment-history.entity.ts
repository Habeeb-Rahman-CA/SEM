import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Equipment } from './equipment.entity';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';

@Entity('equipment_history')
@Index('idx_eq_history_workspace_id', ['workspaceId'])
@Index('idx_eq_history_equipment_id', ['equipmentId'])
export class EquipmentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'equipment_id', type: 'uuid' })
  equipmentId: string;

  @ManyToOne(() => Equipment, (equipment) => equipment.history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @Column({ type: 'varchar', length: 50 })
  action: string; // e.g. created, booked, checked_out, returned, maintenance_scheduled, maintenance_started, maintenance_completed, condition_changed, status_changed

  @Column({ name: 'performed_by_id', type: 'uuid' })
  performedById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: User;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
