import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_e2ee_keys')
@Index('idx_user_e2ee_keys_user', ['userId'], { unique: true })
export class UserE2EEKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column('text')
  publicKey: string;

  @Column({ default: 'ECDH-P256' })
  algorithm: string;

  @Column({ type: 'varchar', nullable: true })
  fingerprint?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
