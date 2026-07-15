import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, Unique, ManyToMany, JoinTable } from 'typeorm';
import { Workspace } from './workspace.entity';
import { Permission } from './permission.entity';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('roles')
@Unique(['slug', 'workspaceId'])
@Index('idx_roles_workspace_id', ['workspaceId'])           // FK: all roles for a workspace
@Index('idx_roles_slug_workspace', ['slug', 'workspaceId']) // Composite: role lookup by slug within workspace (hot path)
@Index('idx_roles_is_system', ['isSystem'])                 // Filter system vs custom roles
export class Role extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string | null;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace | null;

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];
}
