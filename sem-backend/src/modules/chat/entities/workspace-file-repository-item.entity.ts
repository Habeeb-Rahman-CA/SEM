import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkspaceFileRepositoryFolder } from './workspace-file-repository-folder.entity';

@Entity('workspace_file_repository_items')
export class WorkspaceFileRepositoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column({ nullable: true })
  channelId?: string;

  @Column({ nullable: true })
  folderId?: string;

  @ManyToOne(() => WorkspaceFileRepositoryFolder, (folder) => folder.items, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'folderId' })
  folder?: WorkspaceFileRepositoryFolder;

  @Column()
  name: string;

  @Column({ nullable: true })
  url?: string;

  @Column({ default: '0 KB' })
  size: string;

  @Column({ default: 'other' })
  category: 'images' | 'documents' | 'videos' | 'other';

  @Column()
  uploaderId: string;

  @Column()
  uploaderName: string;

  @Column({ default: false })
  isPinned: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
