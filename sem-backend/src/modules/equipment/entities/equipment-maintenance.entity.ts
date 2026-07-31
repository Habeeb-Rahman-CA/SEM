import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Equipment } from './equipment.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';

@Entity('equipment_maintenance')
@Index('idx_eq_maintenance_workspace_id', ['workspaceId'])
@Index('idx_eq_maintenance_equipment_id', ['equipmentId'])
export class EquipmentMaintenance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'equipment_id', type: 'uuid' })
  equipmentId: string;

  @ManyToOne(() => Equipment, (equipment) => equipment.maintenance, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'routine',
  })
  maintenanceType: 'routine' | 'repair' | 'inspection';

  @Column({ name: 'scheduled_date', type: 'timestamp' })
  scheduledDate: Date;

  @Column({ name: 'completed_date', type: 'timestamp', nullable: true })
  completedDate: Date | null;

  @Column({ type: 'int', nullable: true })
  cost: number | null; // in cents

  @Column({
    name: 'performed_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  performedBy: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'scheduled',
  })
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
