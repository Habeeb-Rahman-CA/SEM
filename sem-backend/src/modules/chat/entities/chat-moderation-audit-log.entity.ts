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

  @Column({ nullable: true })
  channelId: string;

  @Column({
    type: 'enum',
    enum: ModerationActionType,
  })
  actionType: ModerationActionType;

  @Column()
  performedById: string;

  @Column({ nullable: true })
  performedByName: string;

  @Column({ nullable: true })
  targetUserId: string;

  @Column({ nullable: true })
  targetUserName: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
