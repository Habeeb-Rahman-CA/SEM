import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerProfileEntity } from './entities/player-profile.entity';
import { DEFAULT_PLAYER_PROFILE_SEED } from './data';

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
      player = this.playerRepo.create({
        handle: cleanHandle,
        name: cleanHandle
          .split('.')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' '),
        ...DEFAULT_PLAYER_PROFILE_SEED,
      });
      player = await this.playerRepo.save(player);
    }
    return player;
  }
}
