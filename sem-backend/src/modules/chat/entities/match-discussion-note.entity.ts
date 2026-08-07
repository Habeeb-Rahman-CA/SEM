import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('match_discussion_notes')
export class MatchDiscussionNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  matchId: string;

  @Column()
  senderId: string;

  @Column()
  senderName: string;

  @Column({ default: 'Official' })
  senderRole: 'Referee' | 'Coach' | 'Official' | 'Organizer';

  @Column({ default: 'bg-violet-500/20 text-violet-300 border-violet-500/30' })
  roleColor: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  isPinned: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
