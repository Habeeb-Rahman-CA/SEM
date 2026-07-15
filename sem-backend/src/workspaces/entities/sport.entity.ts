import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('sports')
export class Sport extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string; // e.g. 'Football', 'Cricket', 'Badminton'

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string; // e.g. 'football', 'cricket', 'badminton'

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
