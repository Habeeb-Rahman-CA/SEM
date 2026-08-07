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

  @Column({ nullable: true })
  channelId: string;

  @Column()
  userId: string;

  @Column()
  bannedById: string;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
