import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { WorkspaceChannel } from './workspace-channel.entity';
import { User } from '../../users/entities/user.entity';

export enum ChannelMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('workspace_channel_members')
@Unique('uq_channel_member', ['channelId', 'userId'])
@Index('idx_ws_channel_mem_channel', ['channelId'])
@Index('idx_ws_channel_mem_user', ['userId'])
export class WorkspaceChannelMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'channel_id' })
  channelId: string;

  @ManyToOne(() => WorkspaceChannel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: WorkspaceChannel;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ChannelMemberRole,
    default: ChannelMemberRole.MEMBER,
  })
  role: ChannelMemberRole;

  @CreateDateColumn()
  joinedAt: Date;
}
