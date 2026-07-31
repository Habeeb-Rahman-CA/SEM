import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { VolunteerAssignment } from './volunteer-assignment.entity';

@Entity('volunteers')
@Unique(['workspaceId', 'userId'])
@Index('idx_volunteers_workspace_id', ['workspaceId'])
@Index('idx_volunteers_user_id', ['userId'])
export class Volunteer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ type: 'jsonb', nullable: true })
  skills: string[] | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => VolunteerAssignment, (assignment) => assignment.volunteer)
  assignments: VolunteerAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
