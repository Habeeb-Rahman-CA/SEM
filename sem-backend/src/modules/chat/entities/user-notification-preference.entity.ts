import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_notification_preferences')
export class UserNotificationPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  workspaceId?: string;

  @Column({ default: true })
  desktopNotifications: boolean;

  @Column({ default: true })
  browserNotifications: boolean;

  @Column({ default: true })
  pushNotifications: boolean;

  @Column({ default: false })
  emailNotifications: boolean;

  @Column({ default: false })
  mentionOnly: boolean;

  @Column('simple-array', { nullable: true })
  mutedChannelIds?: string[];

  @Column('simple-array', { nullable: true })
  mutedUserIds?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
