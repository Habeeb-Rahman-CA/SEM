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
  Unique,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../users/entities/user.entity';
import { Player } from '../../players/entities/player.entity';
import { CredentialAccessGrant } from './credential-access-grant.entity';
import { AttendanceLog } from './attendance-log.entity';

export type CredentialHolderType =
  'player' | 'official' | 'volunteer' | 'media' | 'guest' | 'staff';

export type CredentialAccessLevel =
  'general' | 'restricted' | 'vip' | 'all_areas';

export type CredentialStatus = 'active' | 'revoked' | 'expired' | 'lost';

@Entity('accreditation_credentials')
@Unique('uq_credential_code', ['code'])
@Index('idx_credential_workspace_id', ['workspaceId'])
@Index('idx_credential_event_id', ['eventId'])
@Index('idx_credential_holder_type', ['workspaceId', 'holderType'])
@Index('idx_credential_status', ['status'])
export class AccreditationCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => Event, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: Event | null;

  @Column({
    name: 'holder_type',
    type: 'varchar',
    length: 20,
  })
  holderType: CredentialHolderType;

  @Column({ name: 'holder_user_id', type: 'uuid', nullable: true })
  holderUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'holder_user_id' })
  holderUser: User | null;

  @Column({ name: 'holder_player_id', type: 'uuid', nullable: true })
  holderPlayerId: string | null;

  @ManyToOne(() => Player, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'holder_player_id' })
  holderPlayer: Player | null;

  @Column({ name: 'holder_name', type: 'varchar', length: 150 })
  holderName: string;

  @Column({ name: 'holder_role', type: 'varchar', length: 100, nullable: true })
  holderRole: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  organization: string | null;

  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  @Column({
    name: 'access_level',
    type: 'varchar',
    length: 20,
    default: 'general',
  })
  accessLevel: CredentialAccessLevel;

  @Column({ name: 'valid_from', type: 'timestamp' })
  validFrom: Date;

  @Column({ name: 'valid_until', type: 'timestamp' })
  validUntil: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: CredentialStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'issued_by_id', type: 'uuid', nullable: true })
  issuedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'issued_by_id' })
  issuedBy: User | null;

  @OneToMany(() => CredentialAccessGrant, (grant) => grant.credential)
  accessGrants: CredentialAccessGrant[];

  @OneToMany(() => AttendanceLog, (log) => log.credential)
  attendanceLogs: AttendanceLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
