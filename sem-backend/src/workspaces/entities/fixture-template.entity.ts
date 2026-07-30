import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { AuditableEntity } from '../../common/auditable.entity';

export interface VenueSlot {
  venueId: string;
  priority: number; // Lower = preferred
}

@Entity('fixture_templates')
@Index('idx_fixture_templates_workspace_id', ['workspaceId'])
export class FixtureTemplate extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // ── Scheduling Defaults ──────────────────────────────────────────────────
  /** Default time of day for match kickoffs (HH:MM 24h format) */
  @Column({
    name: 'default_kickoff_time',
    type: 'varchar',
    length: 5,
    nullable: true,
  })
  defaultKickoffTime: string | null; // e.g. "15:00"

  /** Rest days between match rounds */
  @Column({ name: 'match_interval_days', type: 'int', default: 1 })
  matchIntervalDays: number;

  /** How many matches to schedule per day */
  @Column({ name: 'matches_per_day', type: 'int', default: 1 })
  matchesPerDay: number;

  /** Minutes between consecutive matches on the same day */
  @Column({ name: 'gap_between_matches_minutes', type: 'int', default: 90 })
  gapBetweenMatchesMinutes: number;

  // ── Venue Allocation ─────────────────────────────────────────────────────
  /** Prioritised venue list for automatic rotation */
  @Column({ name: 'venue_slots', type: 'jsonb', nullable: true })
  venueSlots: VenueSlot[] | null;

  /** Strategy: 'round_robin' | 'home_venue' | 'single_venue' */
  @Column({
    name: 'venue_strategy',
    type: 'varchar',
    length: 30,
    default: 'round_robin',
  })
  venueStrategy: string;

  // ── Usage Stats ──────────────────────────────────────────────────────────
  @Column({ name: 'use_count', type: 'int', default: 0 })
  useCount: number;

  // ── Workspace FK ─────────────────────────────────────────────────────────
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;
}
