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

export interface TemplateCompetitionBlueprint {
  name: string;
  sportId: string;
  pointsConfig: Array<{
    position: number;
    label: string;
    points: number;
  }> | null;
  stages: Array<{
    name: string;
    type: string;
    sequence: number;
    config: Record<string, any>;
  }>;
}

@Entity('event_templates')
@Index('idx_event_templates_workspace_id', ['workspaceId'])
export class EventTemplate extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // ── Branding ────────────────────────────────────────────────────────
  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  // ── Event Settings ──────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 100, nullable: true })
  sport: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  venue: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  organizers: string | null;

  @Column({
    name: 'registration_status',
    type: 'varchar',
    length: 50,
    default: 'open',
  })
  defaultRegistrationStatus: string;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  defaultIsPublic: boolean;

  // ── Workflow / Competition Blueprints ────────────────────────────────
  @Column({ name: 'competition_blueprints', type: 'jsonb', nullable: true })
  competitionBlueprints: TemplateCompetitionBlueprint[] | null;

  // ── Usage Stats ──────────────────────────────────────────────────────
  @Column({ name: 'use_count', type: 'int', default: 0 })
  useCount: number;

  // ── Workspace FK ─────────────────────────────────────────────────────
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;
}
