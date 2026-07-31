import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Volunteer } from './volunteer.entity';
import { VolunteerShift } from './volunteer-shift.entity';

@Entity('volunteer_assignments')
@Unique(['shiftId', 'volunteerId'])
@Index('idx_volunteer_assignments_shift_id', ['shiftId'])
@Index('idx_volunteer_assignments_volunteer_id', ['volunteerId'])
export class VolunteerAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shift_id', type: 'uuid' })
  shiftId: string;

  @ManyToOne(() => VolunteerShift, (shift) => shift.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shift_id' })
  shift: VolunteerShift;

  @Column({ name: 'volunteer_id', type: 'uuid' })
  volunteerId: string;

  @ManyToOne(() => Volunteer, (volunteer) => volunteer.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: Volunteer;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'assigned',
  })
  status: 'assigned' | 'attended' | 'absent' | 'cancelled';

  @Column({
    name: 'service_hours',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  serviceHours: number;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @Column({ type: 'int', nullable: true })
  rating: number | null; // 1-5 rating

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
