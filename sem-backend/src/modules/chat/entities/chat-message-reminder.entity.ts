import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_message_reminders')
@Index('idx_msg_reminders_user', ['workspaceId', 'userId'])
export class ChatMessageReminderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  userId: string;

  @Column()
  messageId: string;

  @Column({ type: 'timestamp' })
  remindAt: Date;

  @Column({ nullable: true })
  note: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'triggered' | 'dismissed';

  @CreateDateColumn()
  createdAt: Date;
}
