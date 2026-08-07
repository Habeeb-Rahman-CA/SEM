import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface PollOptionItem {
  id: string;
  text: string;
  votes: number;
}

@Entity('chat_polls')
export class ChatPollEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column({ nullable: true })
  messageId?: string;

  @Column()
  creatorId: string;

  @Column()
  creatorName: string;

  @Column()
  question: string;

  @Column('simple-json')
  options: PollOptionItem[];

  @Column({ default: 0 })
  totalVotes: number;

  @Column({ default: false })
  isClosed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
