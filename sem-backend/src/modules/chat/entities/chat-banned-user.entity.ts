import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_banned_users')
@Index('idx_chat_banned_ws_user', ['workspaceId', 'userId'])
export class ChatBannedUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column({ type: 'varchar', nullable: true })
  channelId?: string | null;

  @Column()
  userId: string;

  @Column()
  bannedById: string;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
