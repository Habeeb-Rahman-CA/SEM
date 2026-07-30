import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum AuditCategory {
  SECURITY = 'SECURITY',
  MASTER_DATA = 'MASTER_DATA',
  WORKSPACE = 'WORKSPACE',
  SYSTEM = 'SYSTEM',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string;

  @Column({ type: 'varchar', default: AuditCategory.SYSTEM })
  category: string;

  @Column({ name: 'entity_type', nullable: true })
  entityType: string;

  @Column({ name: 'entity_id', nullable: true })
  entityId: string;

  @Column({ name: 'performed_by_id', nullable: true })
  performedById: string;

  @Column({ name: 'performed_by_name', nullable: true })
  performedByName: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ default: 'SUCCESS' })
  status: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
