import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('users')
@Index('idx_users_username', ['username'])
export class User extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, length: 150 })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  password?: string; // Stored as a bcrypt hash

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'is_super_admin', type: 'boolean', default: false })
  isSuperAdmin: boolean;
}
