import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('chat_poll_votes')
export class ChatPollVoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pollId: string;

  @Column()
  userId: string;

  @Column()
  optionId: string;

  @CreateDateColumn()
  createdAt: Date;
}
