import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { AccreditationCredential } from './credential.entity';
import { AccessZone } from './access-zone.entity';
import { User } from '../../users/entities/user.entity';

export type AttendanceDirection = 'in' | 'out';
export type AttendanceResult =
  | 'granted'
  | 'denied_expired'
  | 'denied_revoked'
  | 'denied_zone'
  | 'denied_not_found'
  | 'denied_not_yet_valid';

@Entity('attendance_logs')
@Index('idx_attendance_workspace_id', ['workspaceId'])
@Index('idx_attendance_credential_id', ['credentialId'])
@Index('idx_attendance_zone_id', ['zoneId'])
@Index('idx_attendance_scanned_at', ['scannedAt'])
export class AttendanceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'credential_id', type: 'uuid', nullable: true })
  credentialId: string | null;

  @ManyToOne(() => AccreditationCredential, (c) => c.attendanceLogs, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'credential_id' })
  credential: AccreditationCredential | null;

  @Column({ name: 'zone_id', type: 'uuid', nullable: true })
  zoneId: string | null;

  @ManyToOne(() => AccessZone, (z) => z.attendanceLogs, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'zone_id' })
  zone: AccessZone | null;

  @Column({ name: 'scanned_at', type: 'timestamp' })
  scannedAt: Date;

  @Column({ name: 'scanned_by_id', type: 'uuid', nullable: true })
  scannedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'scanned_by_id' })
  scannedBy: User | null;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'in',
  })
  direction: AttendanceDirection;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'granted',
  })
  result: AttendanceResult;

  @Column({
    name: 'scanned_code',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  scannedCode: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
