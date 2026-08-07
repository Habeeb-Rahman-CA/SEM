import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkspaceFileRepositoryItem } from './workspace-file-repository-item.entity';

@Entity('workspace_file_repository_folders')
export class WorkspaceFileRepositoryFolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column({ nullable: true })
  channelId?: string;

  @Column()
  name: string;

  @Column({ default: 'fi-rr-folder' })
  icon: string;

  @Column({ default: 'text-violet-400 bg-violet-500/20' })
  color: string;

  @Column({ nullable: true })
  createdBy?: string;

  @OneToMany(() => WorkspaceFileRepositoryItem, (item) => item.folder)
  items: WorkspaceFileRepositoryItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
