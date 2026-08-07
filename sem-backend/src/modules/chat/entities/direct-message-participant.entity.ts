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
import { DirectMessageConversation } from './direct-message-conversation.entity';
import { User } from '../../users/entities/user.entity';

@Entity('direct_message_participants')
@Unique('uq_dm_participant_conv_user', ['conversationId', 'userId'])
@Index('idx_dm_participant_conv', ['conversationId'])
@Index('idx_dm_participant_user', ['userId'])
@Index('idx_dm_participant_ws', ['workspaceId'])
export class DirectMessageParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => DirectMessageConversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: DirectMessageConversation;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'is_pinned', default: false })
  isPinned: boolean;

  @Column({ name: 'is_muted', default: false })
  isMuted: boolean;

  @Column({ name: 'last_read_at', nullable: true })
  lastReadAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
