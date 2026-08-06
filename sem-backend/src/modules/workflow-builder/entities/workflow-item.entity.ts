import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type WorkflowStage = 'draft' | 'review' | 'approve' | 'publish';
export type WorkflowStatus =
  'pending' | 'in_review' | 'approved' | 'rejected' | 'published';
export type WorkflowModuleType =
  'events' | 'registrations' | 'sponsorships' | 'equipment' | 'rules';

export interface WorkflowTransitionLog {
  fromStage: WorkflowStage;
  toStage: WorkflowStage;
  action: 'submit' | 'approve' | 'reject' | 'publish';
  actorName: string;
  comment?: string;
  timestamp: string;
}

@Entity('workflow_items')
@Index('idx_workflow_items_workspace', ['workspaceId'])
@Index('idx_workflow_items_module', ['module'])
@Index('idx_workflow_items_stage', ['currentStage'])
export class WorkflowItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'varchar', default: 'default-ws' })
  workspaceId: string;

  @Column({ type: 'varchar', length: 50, default: 'events' })
  module: WorkflowModuleType;

  @Column({ name: 'item_name', type: 'varchar', length: 255 })
  itemName: string;

  @Column({ name: 'item_ref_id', type: 'varchar', length: 255 })
  itemRefId: string;

  @Column({
    name: 'current_stage',
    type: 'varchar',
    length: 50,
    default: 'draft',
  })
  currentStage: WorkflowStage;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: WorkflowStatus;

  @Column({
    name: 'author_name',
    type: 'varchar',
    length: 150,
    default: 'Workspace Creator',
  })
  authorName: string;

  @Column({
    name: 'reviewer_name',
    type: 'varchar',
    length: 150,
    default: 'Senior Reviewer',
  })
  reviewerName: string;

  @Column({
    name: 'approver_name',
    type: 'varchar',
    length: 150,
    default: 'Workspace Admin',
  })
  approverName: string;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @Column({ type: 'jsonb', default: [] })
  history: WorkflowTransitionLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
