import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type FieldType = 'text' | 'dropdown' | 'checkbox' | 'date' | 'file';
export type FormCategory = 'registration' | 'survey' | 'hr' | 'other';
export type FormPlacement =
  'public_portal' | 'player_dashboard' | 'post_match_survey' | 'direct_link';
export type FormStatus = 'published' | 'draft' | 'archived';

export interface FormFieldConfig {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

@Entity('dynamic_forms')
@Index('idx_dynamic_forms_workspace', ['workspaceId'])
@Index('idx_dynamic_forms_status', ['status'])
export class DynamicFormEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'varchar', default: 'default-ws' })
  workspaceId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'registration' })
  category: FormCategory;

  @Column({ type: 'varchar', length: 50, default: 'public_portal' })
  placement: FormPlacement;

  @Column({ type: 'varchar', length: 50, default: 'published' })
  status: FormStatus;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'jsonb' })
  fields: FormFieldConfig[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
