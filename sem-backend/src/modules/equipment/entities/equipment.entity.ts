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
import { EquipmentBooking } from './equipment-booking.entity';
import { EquipmentMaintenance } from './equipment-maintenance.entity';
import { EquipmentHistory } from './equipment-history.entity';

@Entity('equipment')
@Index('idx_equipment_workspace_id', ['workspaceId'])
@Index('idx_equipment_sku', ['workspaceId', 'sku'])
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku: string | null; // barcode/QR code value

  @Column({ type: 'varchar', length: 50, default: 'general' })
  category: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'available',
  })
  status: 'available' | 'booked' | 'maintenance' | 'retired';

  @Column({
    type: 'varchar',
    length: 20,
    default: 'good',
  })
  condition: 'new' | 'good' | 'fair' | 'poor';

  @Column({ name: 'purchase_date', type: 'timestamp', nullable: true })
  purchaseDate: Date | null;

  @Column({ type: 'int', nullable: true })
  cost: number | null; // in cents

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => EquipmentBooking, (booking) => booking.equipment)
  bookings: EquipmentBooking[];

  @OneToMany(() => EquipmentMaintenance, (maintenance) => maintenance.equipment)
  maintenance: EquipmentMaintenance[];

  @OneToMany(() => EquipmentHistory, (history) => history.equipment)
  history: EquipmentHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
