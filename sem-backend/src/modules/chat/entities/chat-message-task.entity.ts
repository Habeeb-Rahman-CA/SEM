import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_message_tasks')
@Index('idx_msg_tasks_user', ['workspaceId', 'userId'])
export class ChatMessageTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  userId: string;

  @Column()
  messageId: string;

  @Column()
  taskTitle: string;

  @Column({ nullable: true })
  assigneeId: string;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ default: 'todo' })
  status: 'todo' | 'in_progress' | 'done';

  @CreateDateColumn()
  createdAt: Date;
}
