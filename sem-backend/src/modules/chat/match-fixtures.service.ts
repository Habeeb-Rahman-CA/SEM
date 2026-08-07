import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchFixtureEntity } from './entities/match-fixture.entity';

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
      // Seed default master match fixture
      match = this.matchRepo.create({
        matchId,
        workspaceId,
        sportType: 'Cricket',
        title: 'Premier League - Quarter Final #2',
        teamA: 'Royal Strikers',
        teamB: 'Thunderbolts XI',
        scoreA: '184/6 (20.0)',
        scoreB: '142/8 (16.4)',
        venue: 'National Sports Complex, Pitch #1',
        matchTime: 'Today, 4:00 PM IST',
        status: 'LIVE',
        refereeName: 'David Warner',
      });
      match = await this.matchRepo.save(match);
    }
    return match;
  }
}
