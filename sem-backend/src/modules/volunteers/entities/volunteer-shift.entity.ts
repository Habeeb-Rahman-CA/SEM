import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { VolunteerAssignment } from './volunteer-assignment.entity';

@Entity('volunteer_shifts')
@Index('idx_volunteer_shifts_workspace_id', ['workspaceId'])
export class VolunteerShift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50 })
  role: string; // e.g. 'Medic', 'Steward', 'Coordinator'

  @Column({ name: 'start_at', type: 'timestamp with time zone' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamp with time zone' })
  endAt: Date;

  @Column({ name: 'max_volunteers', type: 'int', default: 5 })
  maxVolunteers: number;

  @OneToMany(() => VolunteerAssignment, (assignment) => assignment.shift)
  assignments: VolunteerAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
