import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ModerationActionType {
  DELETE_MESSAGE = 'delete_message',
  DELETE_MEDIA = 'delete_media',
  MUTE_USER = 'mute_user',
  UNMUTE_USER = 'unmute_user',
  BAN_USER = 'ban_user',
  UNBAN_USER = 'unban_user',
  LOCK_CHANNEL = 'lock_channel',
  UNLOCK_CHANNEL = 'unlock_channel',
  ARCHIVE_CHANNEL = 'archive_channel',
  UNARCHIVE_CHANNEL = 'unarchive_channel',
}

@Entity('chat_moderation_audit_logs')
@Index('idx_chat_mod_logs_ws', ['workspaceId'])
@Index('idx_chat_mod_logs_ch', ['channelId'])
export class ChatModerationAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column({ type: 'varchar', nullable: true })
  channelId?: string | null;

  @Column({
    type: 'enum',
    enum: ModerationActionType,
  })
  actionType: ModerationActionType;

  @Column()
  performedById: string;

  @Column({ type: 'varchar', nullable: true })
  performedByName?: string | null;

  @Column({ type: 'varchar', nullable: true })
  targetUserId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  targetUserName?: string | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
