import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('chat_emoji_masters')
export class ChatEmojiMasterEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column()
  category: 'sports' | 'faces' | 'gestures' | 'symbols';

  @Column({ nullable: true })
  flaticonClass?: string;

  @CreateDateColumn()
  createdAt: Date;
}
