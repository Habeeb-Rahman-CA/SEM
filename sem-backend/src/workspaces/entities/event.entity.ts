import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { Competition } from './competition.entity';
import { Team } from './team.entity';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('events')
@Index('idx_events_workspace_id', ['workspaceId']) // FK: all events in a workspace
@Index('idx_events_workspace_status', ['workspaceId', 'status']) // Composite: filter events by status within workspace
@Index('idx_events_workspace_start_date', ['workspaceId', 'startDate']) // Composite: order events by date within workspace
@Index('idx_events_status', ['status']) // Global status filter
export class Event extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'start_date',
    type: 'timestamp without time zone',
    nullable: true,
  })
  startDate: Date | null;

  @Column({
    name: 'end_date',
    type: 'timestamp without time zone',
    nullable: true,
  })
  endDate: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'upcoming' })
  status: string; // 'upcoming' | 'ongoing' | 'completed' | 'cancelled'

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 150, unique: true, nullable: true })
  slug: string | null;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ name: 'gallery', type: 'jsonb', nullable: true })
  gallery: string[] | null;

  @Column({ name: 'announcements', type: 'jsonb', nullable: true })
  announcements: Array<{ id: string; title: string; content: string; createdAt: Date }> | null;

  @Column({ name: 'registration_status', type: 'varchar', length: 50, default: 'open' })
  registrationStatus: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  venue: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sport: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  organizers: string | null;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @OneToMany(() => Competition, (competition) => competition.event)
  competitions: Competition[];

  @ManyToMany(() => Team, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'event_teams',
    joinColumn: { name: 'event_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'team_id', referencedColumnName: 'id' },
  })
  teams: Team[];
}
