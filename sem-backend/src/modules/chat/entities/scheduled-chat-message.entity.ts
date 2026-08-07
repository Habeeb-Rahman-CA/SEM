import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('scheduled_chat_messages')
export class ScheduledChatMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column({ nullable: true })
  channelId?: string;

  @Column({ nullable: true })
  groupId?: string;

  @Column()
  senderId: string;

  @Column()
  senderName: string;

  @Column('text')
  content: string;

  @Column()
  scheduledFor: Date;

  @Column({ default: 'pending' })
  status: 'pending' | 'sent' | 'cancelled';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
