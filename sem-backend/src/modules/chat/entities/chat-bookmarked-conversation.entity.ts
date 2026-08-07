import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_bookmarked_conversations')
@Index('idx_bookmarked_conv_user', ['workspaceId', 'userId', 'targetId'], {
  unique: true,
})
export class ChatBookmarkedConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  userId: string;

  @Column()
  targetId: string; // channelId or conversationId

  @Column({ type: 'varchar', default: 'channel' })
  targetType: string;

  @Column({ type: 'varchar', nullable: true })
  label?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
