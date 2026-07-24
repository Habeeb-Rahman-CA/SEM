import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { AuditableEntity } from '../../common/auditable.entity';
import { WorkspaceFileVersion } from './workspace-file-version.entity';

@Entity('workspace_files')
@Index('idx_workspace_files_workspace_id', ['workspaceId'])
@Index('idx_workspace_files_is_deleted', ['isDeleted'])
export class WorkspaceFile extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number; // in bytes

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ name: 'public_id', type: 'varchar', length: 255, nullable: true })
  publicId: string | null;

  @Column({ name: 'current_version', type: 'integer', default: 1 })
  currentVersion: number;

  @Column({
    name: 'virus_scan_status',
    type: 'varchar',
    length: 50,
    default: 'pending', // 'pending', 'clean', 'infected'
  })
  virusScanStatus: string;

  @Column({ name: 'virus_scan_details', type: 'text', nullable: true })
  virusScanDetails: string | null;

  @OneToMany(() => WorkspaceFileVersion, (version) => version.file, {
    cascade: true,
  })
  versions: WorkspaceFileVersion[];
}
