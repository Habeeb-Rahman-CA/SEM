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

export interface CompetitionTemplateStage {
  name: string;
  type: string;
  sequence: number;
  config: {
    winPoint?: number;
    drawPoint?: number;
    twoLegged?: boolean;
    legs?: number;
    gamesPerTeam?: number;
    restDays?: number;
    groupsCount?: number;
    advancingCount?: number;
    groupKnockoutSubtype?: string;
    advancingType?: string;
    singleGroupAdvancing?: number;
    bracketReset?: boolean;
    seeded?: boolean;
    roundsCount?: number;
    tieBreaks?: string[];
    runnersUpCount?: number;
    manualQualification?: boolean;
    customOverrides?: Record<string, number>;
    [key: string]: any;
  };
}

@Entity('competition_templates')
@Index('idx_competition_templates_workspace_id', ['workspaceId'])
export class CompetitionTemplate extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // ── Sport association (optional — by ID) ─────────────────────────────────
  @Column({ name: 'sport_id', type: 'uuid', nullable: true })
  sportId: string | null;

  // ── Point System Defaults ────────────────────────────────────────────────
  @Column({ name: 'points_config', type: 'jsonb', nullable: true })
  pointsConfig: Array<{
    position: number;
    label: string;
    points: number;
  }> | null;

  // ── Stage Blueprints ─────────────────────────────────────────────────────
  @Column({ name: 'stage_blueprints', type: 'jsonb', nullable: true })
  stageBlueprints: CompetitionTemplateStage[] | null;

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
