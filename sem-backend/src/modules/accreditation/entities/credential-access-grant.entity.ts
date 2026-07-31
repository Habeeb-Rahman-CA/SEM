import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { AccreditationCredential } from './credential.entity';
import { AccessZone } from './access-zone.entity';

@Entity('credential_access_grants')
@Unique('uq_grant_credential_zone', ['credentialId', 'zoneId'])
@Index('idx_grant_workspace_id', ['workspaceId'])
@Index('idx_grant_credential_id', ['credentialId'])
@Index('idx_grant_zone_id', ['zoneId'])
export class CredentialAccessGrant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'credential_id', type: 'uuid' })
  credentialId: string;

  @ManyToOne(() => AccreditationCredential, (c) => c.accessGrants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'credential_id' })
  credential: AccreditationCredential;

  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId: string;

  @ManyToOne(() => AccessZone, (z) => z.grants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: AccessZone;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
