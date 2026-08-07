import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_starred_messages')
@Index('idx_starred_msg_user', ['workspaceId', 'userId', 'messageId'], {
  unique: true,
})
export class ChatStarredMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  userId: string;

  @Column()
  messageId: string;

  @Column({ default: 'channel' })
  messageType: string;

  @CreateDateColumn()
  createdAt: Date;
}
