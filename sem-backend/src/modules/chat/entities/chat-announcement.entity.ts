import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('chat_announcements')
export class ChatAnnouncementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column({ nullable: true })
  messageId?: string;

  @Column()
  authorId: string;

  @Column()
  authorName: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: 'medium' })
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @Column({ default: 'all' })
  targetAudience: 'all' | 'admins' | 'officials' | 'players';

  @Column('simple-array', { nullable: true })
  acknowledgedUserIds?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
