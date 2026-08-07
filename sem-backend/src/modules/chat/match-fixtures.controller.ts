import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MatchFixturesService } from './match-fixtures.service';

@Controller('workspaces/:workspaceId/matches')
@UseGuards(JwtAuthGuard)
export class MatchFixturesController {
  constructor(private readonly service: MatchFixturesService) {}

  @Get(':matchId')
  async getMatch(
    @Param('workspaceId') workspaceId: string,
    @Param('matchId') matchId: string,
  ) {
    return await this.service.getMatchByMatchId(workspaceId, matchId);
  }
}
