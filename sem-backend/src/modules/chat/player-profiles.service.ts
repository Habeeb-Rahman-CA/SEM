import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerProfileEntity } from './entities/player-profile.entity';

@Injectable()
export class PlayerProfilesService {
  constructor(
    @InjectRepository(PlayerProfileEntity)
    private playerRepo: Repository<PlayerProfileEntity>,
  ) {}

  async getProfileByHandle(handle: string) {
    const cleanHandle = handle.replace('@', '').trim();
    let player = await this.playerRepo.findOne({
      where: { handle: cleanHandle },
    });

    if (!player) {
      // Seed default player profile for handle
      player = this.playerRepo.create({
        handle: cleanHandle,
        name: cleanHandle
          .split('.')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' '),
        jerseyNumber: 10,
        position: 'All-Rounder / Forward',
        teamName: 'Royal Strikers FC',
        rating: 9.4,
        matchesPlayed: 48,
        runsOrGoals: 1240,
        wicketsOrAssists: 34,
        attendanceRate: 98,
      });
      player = await this.playerRepo.save(player);
    }
    return player;
  }
}
