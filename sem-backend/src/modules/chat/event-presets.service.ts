import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventChannelPresetEntity } from './entities/event-channel-preset.entity';

@Injectable()
export class EventPresetsService {
  constructor(
    @InjectRepository(EventChannelPresetEntity)
    private presetRepo: Repository<EventChannelPresetEntity>,
  ) {}

  async getPresets() {
    const list = await this.presetRepo.find();
    if (list.length === 0) {
      // Seed default master presets for workspace event channels
      const defaults = [
        {
          presetKey: 'tournament',
          title: 'Cricket Tournament',
          subChannels: [
            {
              name: 'Organizers',
              icon: 'fi fi-rr-user-gear',
              description: 'Core event organization & planning',
              selected: true,
            },
            {
              name: 'Referees',
              icon: 'fi fi-rr-whistle',
              description: 'Match officiating & referee rules',
              selected: true,
            },
            {
              name: 'Volunteers',
              icon: 'fi fi-rr-heart',
              description: 'Volunteer coordination & schedule',
              selected: true,
            },
            {
              name: 'Teams',
              icon: 'fi fi-rr-users-alt',
              description: 'Team captains & player announcements',
              selected: true,
            },
            {
              name: 'Sponsors',
              icon: 'fi fi-rr-gem',
              description: 'Sponsor relations & VIP hospitality',
              selected: true,
            },
          ],
        },
        {
          presetKey: 'league',
          title: 'Football League',
          subChannels: [
            {
              name: 'League Management',
              icon: 'fi fi-rr-trophy',
              description: 'Overall league governance & standings',
              selected: true,
            },
            {
              name: 'Referees & Officiating',
              icon: 'fi fi-rr-whistle',
              description: 'Referee match assignments',
              selected: true,
            },
            {
              name: 'Team Captains',
              icon: 'fi fi-rr-shield',
              description: 'Direct channel for team leaders',
              selected: true,
            },
            {
              name: 'Media & Broadcasting',
              icon: 'fi fi-rr-camera',
              description: 'Live streaming & media coverage',
              selected: true,
            },
          ],
        },
        {
          presetKey: 'corporate',
          title: 'Sponsors & VIP Relations',
          subChannels: [
            {
              name: 'Executive Sponsors',
              icon: 'fi fi-rr-briefcase',
              description: 'High level sponsor discussions',
              selected: true,
            },
            {
              name: 'Partner Relations',
              icon: 'fi fi-rr-handshake',
              description: 'Partner logos & branding compliance',
              selected: true,
            },
            {
              name: 'VIP Lounge',
              icon: 'fi fi-rr-star',
              description: 'VIP hospitality & guest lists',
              selected: true,
            },
          ],
        },
      ];
      return await this.presetRepo.save(this.presetRepo.create(defaults));
    }
    return list;
  }
}
