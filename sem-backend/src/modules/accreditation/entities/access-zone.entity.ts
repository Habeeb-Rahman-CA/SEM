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
import { Venue } from '../../venues/entities/venue.entity';
import {
  CredentialAccessLevel,
  CredentialHolderType,
} from './credential.entity';
import { CredentialAccessGrant } from './credential-access-grant.entity';
import { AttendanceLog } from './attendance-log.entity';

@Entity('access_zones')
@Index('idx_access_zone_workspace_id', ['workspaceId'])
export class AccessZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'venue_id', type: 'uuid', nullable: true })
  venueId: string | null;

  @ManyToOne(() => Venue, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'venue_id' })
  venue: Venue | null;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'allowed_holder_types',
    type: 'jsonb',
    nullable: true,
  })
  allowedHolderTypes: CredentialHolderType[] | null;

  @Column({
    name: 'allowed_access_levels',
    type: 'jsonb',
    nullable: true,
  })
  allowedAccessLevels: CredentialAccessLevel[] | null;

  @Column({ type: 'int', nullable: true })
  capacity: number | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => CredentialAccessGrant, (grant) => grant.zone)
  grants: CredentialAccessGrant[];

  @OneToMany(() => AttendanceLog, (log) => log.zone)
  attendanceLogs: AttendanceLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
