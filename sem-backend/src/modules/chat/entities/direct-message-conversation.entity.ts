import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { User } from '../../users/entities/user.entity';

@Entity('direct_message_conversations')
@Unique('uq_dm_workspace_users', ['workspaceId', 'user1Id', 'user2Id'])
@Index('idx_dm_conv_workspace', ['workspaceId'])
@Index('idx_dm_conv_user1', ['user1Id'])
@Index('idx_dm_conv_user2', ['user2Id'])
export class DirectMessageConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'user1_id' })
  user1Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user1_id' })
  user1: User;

  @Column({ name: 'user2_id' })
  user2Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user2_id' })
  user2: User;

  @Column({ name: 'last_message_at', nullable: true })
  lastMessageAt: Date;

  @Column({ name: 'last_message_text', nullable: true, type: 'text' })
  lastMessageText: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
