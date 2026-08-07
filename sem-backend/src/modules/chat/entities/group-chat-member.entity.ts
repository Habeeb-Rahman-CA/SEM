import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { GroupChat } from './group-chat.entity';
import { User } from '../../users/entities/user.entity';

export enum GroupMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('group_chat_members')
@Unique('uq_group_member', ['groupChatId', 'userId'])
@Index('idx_group_mem_chat', ['groupChatId'])
@Index('idx_group_mem_user', ['userId'])
@Index('idx_group_mem_workspace', ['workspaceId'])
export class GroupChatMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_chat_id' })
  groupChatId: string;

  @ManyToOne(() => GroupChat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_chat_id' })
  groupChat: GroupChat;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: GroupMemberRole,
    default: GroupMemberRole.MEMBER,
  })
  role: GroupMemberRole;

  @Column({ name: 'is_pinned', default: false })
  isPinned: boolean;

  @Column({ name: 'is_muted', default: false })
  isMuted: boolean;

  @Column({ name: 'last_read_at', nullable: true })
  lastReadAt: Date;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
