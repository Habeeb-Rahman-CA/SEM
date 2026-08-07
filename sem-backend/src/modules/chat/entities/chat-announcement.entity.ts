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

  @Column({ type: 'varchar', nullable: true })
  messageId?: string | null;

  @Column()
  authorId: string;

  @Column()
  authorName: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'varchar', default: 'medium' })
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @Column({ type: 'varchar', default: 'all' })
  targetAudience: 'all' | 'admins' | 'officials' | 'players';

  @Column('simple-array', { nullable: true })
  acknowledgedUserIds?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
