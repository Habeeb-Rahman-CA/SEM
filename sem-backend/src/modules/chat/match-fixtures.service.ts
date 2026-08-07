import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchFixtureEntity } from './entities/match-fixture.entity';
import { DEFAULT_MATCH_FIXTURE_SEED } from './data';

@Injectable()
export class MatchFixturesService {
  constructor(
    @InjectRepository(MatchFixtureEntity)
    private matchRepo: Repository<MatchFixtureEntity>,
  ) {}

  async getMatchByMatchId(workspaceId: string, matchId: string) {
    let match = await this.matchRepo.findOne({
      where: { workspaceId, matchId },
    });
    if (!match) {
      match = this.matchRepo.create({
        matchId,
        workspaceId,
        ...DEFAULT_MATCH_FIXTURE_SEED,
      });
      match = await this.matchRepo.save(match);
    }
    return match;
  }
}
