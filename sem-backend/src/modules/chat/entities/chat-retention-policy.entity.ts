import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_retention_policies')
@Index('idx_chat_retention_ws_ch', ['workspaceId', 'channelId'], {
  unique: true,
})
export class ChatRetentionPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column({ nullable: true })
  channelId: string;

  @Column({ default: 90 })
  retentionDays: number; // 0 = unlimited

  @Column({ default: true })
  autoDeleteMedia: boolean;

  @Column({ default: true })
  enabled: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
