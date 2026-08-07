import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventChannelPresetEntity } from './entities/event-channel-preset.entity';
import { DEFAULT_EVENT_PRESETS_SEED } from './data';

@Injectable()
export class EventPresetsService {
  constructor(
    @InjectRepository(EventChannelPresetEntity)
    private presetRepo: Repository<EventChannelPresetEntity>,
  ) {}

  async getPresets() {
    const list = await this.presetRepo.find();
    if (list.length === 0) {
      return await this.presetRepo.save(
        this.presetRepo.create(DEFAULT_EVENT_PRESETS_SEED),
      );
    }
    return list;
  }
}
