import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Team } from '../../teams/entities/team.entity';
import { Player } from '../../players/entities/player.entity';

export type ContractType =
  'full_time' | 'loan' | 'youth' | 'short_term' | 'amateur';

export type ContractStatus = 'active' | 'expired' | 'terminated' | 'suspended';

@Entity('player_contracts')
@Index('idx_contract_workspace_id', ['workspaceId'])
@Index('idx_contract_player_id', ['playerId'])
@Index('idx_contract_team_id', ['teamId'])
@Index('idx_contract_season', ['season'])
@Index('idx_contract_status', ['status'])
@Index('idx_contract_registration', [
  'workspaceId',
  'season',
  'registrationNumber',
])
export class PlayerContract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ type: 'varchar', length: 20 })
  season: string;

  @Column({
    name: 'contract_type',
    type: 'varchar',
    length: 20,
    default: 'full_time',
  })
  contractType: ContractType;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'bigint', default: 0 })
  salary: string;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({
    name: 'jersey_number',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  jerseyNumber: string | null;

  @Column({
    name: 'registration_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  registrationNumber: string | null;

  @Column({ name: 'is_foreign', type: 'boolean', default: false })
  isForeign: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: ContractStatus;

  @Column({ name: 'suspension_reason', type: 'text', nullable: true })
  suspensionReason: string | null;

  @Column({
    name: 'suspension_ends_at',
    type: 'timestamp',
    nullable: true,
  })
  suspensionEndsAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
