import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GroupChat } from './group-chat.entity';
import { User } from '../../users/entities/user.entity';

@Entity('group_chat_messages')
@Index('idx_group_msg_chat', ['groupChatId'])
@Index('idx_group_msg_ws', ['workspaceId'])
@Index('idx_group_msg_created', ['createdAt'])
export class GroupChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_chat_id' })
  groupChatId: string;

  @ManyToOne(() => GroupChat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_chat_id' })
  groupChat: GroupChat;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-array', nullable: true })
  attachments: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
