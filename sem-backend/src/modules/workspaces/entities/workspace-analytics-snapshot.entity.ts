import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('workspace_analytics_snapshots')
@Index('idx_workspace_analytics_snapshots_workspace_id', ['workspaceId'])
export class WorkspaceAnalyticsSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'jsonb', nullable: true })
  kpis: any;

  @Column({ name: 'participation_trends', type: 'jsonb', nullable: true })
  participationTrends: any;

  @Column({ name: 'historical_comparisons', type: 'jsonb', nullable: true })
  historicalComparisons: any;

  @Column({ name: 'organizer_insights', type: 'jsonb', nullable: true })
  organizerInsights: any;

  @Column({ name: 'organization_stats', type: 'jsonb', nullable: true })
  organizationStats: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt: Date;
}
