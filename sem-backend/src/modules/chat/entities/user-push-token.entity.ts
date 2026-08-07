import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_push_tokens')
@Index('idx_push_token_user', ['userId', 'deviceToken'], { unique: true })
export class UserPushTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  deviceToken: string;

  @Column({ default: 'web' })
  platform: 'ios' | 'android' | 'web';

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
