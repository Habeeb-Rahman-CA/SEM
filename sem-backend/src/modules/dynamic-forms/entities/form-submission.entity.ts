import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('form_submissions')
@Index('idx_form_submissions_form', ['formId'])
@Index('idx_form_submissions_workspace', ['workspaceId'])
export class FormSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id', type: 'varchar' })
  formId: string;

  @Column({ name: 'workspace_id', type: 'varchar', default: 'default-ws' })
  workspaceId: string;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;
}
