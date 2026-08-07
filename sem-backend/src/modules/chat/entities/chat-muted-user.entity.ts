import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_muted_users')
@Index('idx_chat_muted_ws_user', ['workspaceId', 'userId'])
export class ChatMutedUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column({ nullable: true })
  channelId: string;

  @Column()
  userId: string;

  @Column()
  mutedById: string;

  @Column({ type: 'timestamp', nullable: true })
  mutedUntil?: Date | null;

  @Column({ nullable: true })
  reason?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
