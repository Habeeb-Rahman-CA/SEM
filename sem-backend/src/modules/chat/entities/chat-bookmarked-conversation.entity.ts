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

  @Column({ default: 'channel' })
  targetType: string;

  @Column({ nullable: true })
  label: string;

  @CreateDateColumn()
  createdAt: Date;
}
