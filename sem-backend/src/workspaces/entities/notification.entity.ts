import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('notifications')
@Index('idx_notifications_user_id', ['userId'])
export class Notification extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  message: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;
}
