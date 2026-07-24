import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WorkspaceFile } from './workspace-file.entity';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('workspace_file_versions')
@Index('idx_workspace_file_versions_file_id', ['fileId'])
export class WorkspaceFileVersion extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_id', type: 'uuid' })
  fileId: string;

  @ManyToOne(() => WorkspaceFile, (file) => file.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'file_id' })
  file: WorkspaceFile;

  @Column({ name: 'version_number', type: 'integer' })
  versionNumber: number;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ name: 'public_id', type: 'varchar', length: 255, nullable: true })
  publicId: string | null;

  @Column({ type: 'bigint' })
  size: number; // in bytes

  @Column({
    name: 'virus_scan_status',
    type: 'varchar',
    length: 50,
    default: 'pending', // 'pending', 'clean', 'infected'
  })
  virusScanStatus: string;

  @Column({ name: 'virus_scan_details', type: 'text', nullable: true })
  virusScanDetails: string | null;
}
