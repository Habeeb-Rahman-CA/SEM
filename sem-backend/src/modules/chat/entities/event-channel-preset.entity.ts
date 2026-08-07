import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface SubChannelPresetItem {
  name: string;
  icon: string;
  description: string;
  selected: boolean;
}

@Entity('event_channel_presets')
export class EventChannelPresetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  presetKey: string;

  @Column()
  title: string;

  @Column('simple-json')
  subChannels: SubChannelPresetItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
