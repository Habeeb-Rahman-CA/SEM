import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Competition } from '../../workspaces/entities/competition.entity';
import { CompetitionStage } from '../../workspaces/entities/competition-stage.entity';
import { Match } from '../../workspaces/entities/match.entity';
import { MatchPlayer } from '../../workspaces/entities/match-player.entity';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { NotificationType } from '../../workspaces/entities/notification.entity';
import { SportEngineRegistry } from '../sports/sport-engine.registry';

@Injectable()
export class StatisticsRatingsService {
  constructor(
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(CompetitionStage)
    private readonly stageRepo: Repository<CompetitionStage>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayerRepo: Repository<MatchPlayer>,
    private readonly workspacesService: WorkspacesService,
    private readonly sportEngineRegistry: SportEngineRegistry,
  ) {}

  async getMatchRatings(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    userId: string,
  ): Promise<MatchPlayer[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const match = await this.matchRepo.findOne({
      where: { id: matchId, stageId },
    });
    if (!match) throw new NotFoundException('Match not found');

    return this.matchPlayerRepo.find({
      where: { matchId, isPlaying: true },
      relations: { player: { user: true }, team: true },
      order: { rating: 'DESC' },
    });
  }

  async setMatchPlayerRatings(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    ratings: any[],
    userId: string,
  ): Promise<MatchPlayer[]> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'match.score',
    );

    const match = await this.matchRepo.findOne({
      where: { id: matchId, stageId },
    });
    if (!match) throw new NotFoundException('Match not found');

    const players = await this.matchPlayerRepo.find({ where: { matchId } });
    const playerMap = new Map(players.map((p) => [p.playerId, p]));

    const toSave: MatchPlayer[] = [];
    for (const item of ratings) {
      const entry = playerMap.get(item.playerId);
      if (!entry) continue;
      entry.rating = Math.min(10.0, Math.max(5.0, item.rating));
      toSave.push(entry);
    }

    const savedRatings = await this.matchPlayerRepo.save(toSave);
    const populatedSaved = await this.matchPlayerRepo.find({
      where: { id: In(savedRatings.map((s) => s.id)) },
      relations: { player: { user: true }, team: true },
    });

    const matchDetails = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: { homeTeam: true, awayTeam: true },
    });

    for (const entry of populatedSaved) {
      if (entry.player?.userId && entry.rating !== null) {
        await this.workspacesService.sendNotification(
          entry.player.userId,
          NotificationType.PLAYER_RATING_UPDATED,
          `Your match rating has been updated to ${entry.rating}/10 for ${matchDetails?.homeTeam?.name} vs ${matchDetails?.awayTeam?.name}.`,
          workspaceId,
          { matchId, rating: entry.rating },
        );
      }
    }

    return this.matchPlayerRepo.find({
      where: { matchId, isPlaying: true },
      relations: { player: { user: true }, team: true },
      order: { rating: 'DESC' },
    });
  }

  async getCompetitionBestPlayer(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<{
    bestPlayer: MatchPlayer | null;
    allRankings: Array<{
      playerId: string;
      playerName: string;
      teamName: string;
      avgRating: number;
      appearances: number;
      eligible: boolean;
    }>;
    totalMatches: number;
    minAppearancesRequired: number;
  }> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const stages = await this.stageRepo.find({ where: { competitionId } });
    const stageIds = stages.map((s) => s.id);
    if (stageIds.length === 0) {
      return {
        bestPlayer: null,
        allRankings: [],
        totalMatches: 0,
        minAppearancesRequired: 0,
      };
    }

    const allMatches = await this.matchRepo.find({
      where: { stageId: In(stageIds), status: 'completed' },
    });
    const totalMatches = allMatches.length;
    if (totalMatches === 0) {
      return {
        bestPlayer: null,
        allRankings: [],
        totalMatches: 0,
        minAppearancesRequired: 0,
      };
    }

    const matchIds = allMatches.map((m) => m.id);
    const minAppearancesRequired = Math.ceil(totalMatches * 0.5);

    const allMatchPlayers = await this.matchPlayerRepo.find({
      where: { matchId: In(matchIds), isPlaying: true },
      relations: { player: { user: true }, team: true },
    });

    const playerStats = new Map<
      string,
      {
        entry: MatchPlayer;
        ratings: number[];
        teamName: string;
        playerName: string;
      }
    >();

    for (const mp of allMatchPlayers) {
      if (mp.rating === null) continue;
      const existing = playerStats.get(mp.playerId);
      const playerName =
        mp.player?.user?.username ??
        mp.player?.jerseyNumber?.toString() ??
        mp.playerId;
      const teamName = mp.team?.name ?? 'Unknown';
      if (existing) {
        existing.ratings.push(Number(mp.rating));
      } else {
        playerStats.set(mp.playerId, {
          entry: mp,
          ratings: [Number(mp.rating)],
          playerName,
          teamName,
        });
      }
    }

    const rankings: Array<{
      playerId: string;
      playerName: string;
      teamName: string;
      avgRating: number;
      appearances: number;
      eligible: boolean;
    }> = [];

    for (const [playerId, stats] of playerStats.entries()) {
      const appearances = stats.ratings.length;
      const avgRating =
        Math.round(
          (stats.ratings.reduce((a, b) => a + b, 0) / appearances) * 100,
        ) / 100;
      rankings.push({
        playerId,
        playerName: stats.playerName,
        teamName: stats.teamName,
        avgRating,
        appearances,
        eligible: appearances >= minAppearancesRequired,
      });
    }

    rankings.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.avgRating - a.avgRating;
    });

    const topEligible = rankings.find((r) => r.eligible) ?? null;
    let bestPlayer: MatchPlayer | null = null;
    if (topEligible) {
      bestPlayer = playerStats.get(topEligible.playerId)?.entry ?? null;
    }

    return {
      bestPlayer,
      allRankings: rankings,
      totalMatches,
      minAppearancesRequired,
    };
  }

  async getCompetitionStats(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<any> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
      relations: { sport: true },
    });
    if (!competition) throw new NotFoundException('Competition not found');

    const sportCode = competition.sport?.code ?? 'football';

    const stages = await this.stageRepo.find({ where: { competitionId } });
    const stageIds = stages.map((s) => s.id);
    if (stageIds.length === 0) {
      return { sportCode, topRated: [] };
    }

    const completedMatches = await this.matchRepo.find({
      where: { stageId: In(stageIds), status: 'completed' },
    });
    if (completedMatches.length === 0) {
      return { sportCode, topRated: [] };
    }

    const matchIds = completedMatches.map((m) => m.id);

    const allMatchPlayers = await this.matchPlayerRepo.find({
      where: { matchId: In(matchIds), isPlaying: true },
      relations: { player: { user: true }, team: true },
    });

    const userUserIdMap = new Map<
      string,
      { playerId: string; playerName: string; teamName: string }
    >();
    const userUsernameMap = new Map<
      string,
      { playerId: string; playerName: string; teamName: string }
    >();
    const ratingsMap = new Map<
      string,
      {
        playerId: string;
        playerName: string;
        teamName: string;
        ratings: number[];
      }
    >();

    for (const mp of allMatchPlayers) {
      const playerName =
        mp.player?.user?.username ??
        mp.player?.jerseyNumber?.toString() ??
        mp.playerId;
      const teamName = mp.team?.name ?? 'Unknown';
      const pInfo = { playerId: mp.playerId, playerName, teamName };

      if (mp.player?.userId) {
        userUserIdMap.set(mp.player.userId, pInfo);
      }
      if (mp.player?.user?.username) {
        userUsernameMap.set(mp.player.user.username, pInfo);
      }

      if (mp.rating !== null) {
        let existing = ratingsMap.get(mp.playerId);
        if (!existing) {
          existing = { ...pInfo, ratings: [] };
          ratingsMap.set(mp.playerId, existing);
        }
        existing.ratings.push(Number(mp.rating));
      }
    }

    const topRated = Array.from(ratingsMap.values())
      .map((r) => {
        const avgRating =
          Math.round(
            (r.ratings.reduce((a, b) => a + b, 0) / r.ratings.length) * 100,
          ) / 100;
        return {
          playerId: r.playerId,
          playerName: r.playerName,
          teamName: r.teamName,
          avgRating,
          appearances: r.ratings.length,
        };
      })
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 10);

    const mvpCounts = new Map<
      string,
      { playerId: string; playerName: string; teamName: string; mvps: number }
    >();
    const matchPlayersMap = new Map<string, MatchPlayer[]>();
    for (const mp of allMatchPlayers) {
      if (!matchPlayersMap.has(mp.matchId)) {
        matchPlayersMap.set(mp.matchId, []);
      }
      matchPlayersMap.get(mp.matchId)!.push(mp);
    }
    for (const [matchId, playersInMatch] of matchPlayersMap.entries()) {
      let maxRating = -1;
      let mvpCandidates: MatchPlayer[] = [];
      for (const mp of playersInMatch) {
        if (mp.rating !== null) {
          const r = Number(mp.rating);
          if (r > maxRating) {
            maxRating = r;
            mvpCandidates = [mp];
          } else if (r === maxRating) {
            mvpCandidates.push(mp);
          }
        }
      }
      if (maxRating >= 5.0) {
        for (const mvpMp of mvpCandidates) {
          let entry = mvpCounts.get(mvpMp.playerId);
          if (!entry) {
            const playerName =
              mvpMp.player?.user?.username ??
              mvpMp.player?.jerseyNumber?.toString() ??
              mvpMp.playerId;
            const teamName = mvpMp.team?.name ?? 'Unknown';
            entry = { playerId: mvpMp.playerId, playerName, teamName, mvps: 0 };
            mvpCounts.set(mvpMp.playerId, entry);
          }
          entry.mvps++;
        }
      }
    }
    const mostMvps = Array.from(mvpCounts.values())
      .sort((a, b) => b.mvps - a.mvps)
      .slice(0, 10);

    const engine = this.sportEngineRegistry.getEngine(sportCode);
    const sportStats = engine.getCompetitionStats(
      completedMatches,
      allMatchPlayers,
      {
        userUserIdMap,
        userUsernameMap,
      },
    );

    return {
      sportCode,
      topRated,
      mostMvps,
      ...sportStats,
    };
  }

  async autoRateMatchPlayers(match: Match): Promise<void> {
    const liveData = match.liveData;
    if (!liveData) return;

    const stage = await this.stageRepo.findOne({
      where: { id: match.stageId },
      relations: { competition: { sport: true } },
    });
    const sportCode = stage?.competition?.sport?.code ?? 'football';

    const matchPlayers = await this.matchPlayerRepo.find({
      where: { matchId: match.id },
      relations: { player: { user: true } },
    });
    if (matchPlayers.length === 0) return;

    const toSave: MatchPlayer[] = [];

    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;
    const winnerTeamId =
      homeScore > awayScore
        ? match.homeTeamId
        : awayScore > homeScore
          ? match.awayTeamId
          : null;
    const loserTeamId =
      winnerTeamId === match.homeTeamId
        ? match.awayTeamId
        : winnerTeamId === match.awayTeamId
          ? match.homeTeamId
          : null;

    const engine = this.sportEngineRegistry.getEngine(sportCode);
    const calculated = engine.calculatePlayerRatings(
      match,
      matchPlayers,
      winnerTeamId,
      loserTeamId,
    );
    toSave.push(...calculated);

    if (toSave.length > 0) {
      await this.matchPlayerRepo.save(toSave);

      const populatedSaved = await this.matchPlayerRepo.find({
        where: { id: In(toSave.map((s) => s.id)) },
        relations: { player: { user: true }, team: true },
      });

      const workspaceId = stage?.competition?.event?.workspaceId || null;

      for (const entry of populatedSaved) {
        if (entry.player?.userId && entry.rating !== null) {
          await this.workspacesService.sendNotification(
            entry.player.userId,
            NotificationType.PLAYER_RATED,
            `Your performance rating for ${match.homeTeam?.name ?? 'Home'} vs ${match.awayTeam?.name ?? 'Away'}: ${entry.rating}/10.`,
            workspaceId,
            { matchId: match.id, rating: entry.rating },
          );
        }
      }

      let maxRating = -1;
      let mvpMp: MatchPlayer | null = null;
      for (const entry of populatedSaved) {
        if (entry.rating !== null) {
          const r = Number(entry.rating);
          if (r > maxRating) {
            maxRating = r;
            mvpMp = entry;
          }
        }
      }

      if (mvpMp && maxRating >= 5.0 && mvpMp.player?.userId) {
        const playerName = mvpMp.player.user?.username ?? 'Player';
        const teamName = mvpMp.team?.name ?? 'Unknown';

        await this.workspacesService.sendNotification(
          mvpMp.player.userId,
          NotificationType.MATCH_MVP,
          `🌟 MVP! You were the highest-rated player (${maxRating}) in ${match.homeTeam?.name ?? 'Home'} vs ${match.awayTeam?.name ?? 'Away'}!`,
          workspaceId,
          { matchId: match.id, rating: maxRating },
        );

        if (workspaceId) {
          const memberIds =
            await this.workspacesService.getWorkspaceMemberUserIds(workspaceId);
          await this.workspacesService.sendNotificationToMany(
            memberIds,
            NotificationType.MATCH_MVP_ANNOUNCEMENT,
            `🌟 ${playerName} (${teamName}) is the Man of the Match in ${match.homeTeam?.name ?? 'Home'} vs ${match.awayTeam?.name ?? 'Away'} (rating: ${maxRating})!`,
            workspaceId,
            {
              matchId: match.id,
              playerId: mvpMp.playerId,
              playerName,
              teamName,
              rating: maxRating,
            },
          );
        }
      }
    }
  }

  async getPublicCompetitionStats(
    eventId: string,
    competitionId: string,
  ): Promise<any> {
    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
      relations: { sport: true, event: true },
    });
    if (!competition) throw new NotFoundException('Competition not found');
    if (!competition.event || !competition.event.isPublic) {
      throw new NotFoundException('Event not found or is not public');
    }

    const sportCode = competition.sport?.code ?? 'football';

    const stages = await this.stageRepo.find({ where: { competitionId } });
    const stageIds = stages.map((s) => s.id);
    if (stageIds.length === 0) {
      return { sportCode, topRated: [] };
    }

    const completedMatches = await this.matchRepo.find({
      where: { stageId: In(stageIds), status: 'completed' },
    });
    if (completedMatches.length === 0) {
      return { sportCode, topRated: [] };
    }

    const matchIds = completedMatches.map((m) => m.id);

    const allMatchPlayers = await this.matchPlayerRepo.find({
      where: { matchId: In(matchIds), isPlaying: true },
      relations: { player: { user: true }, team: true },
    });

    const userUserIdMap = new Map<
      string,
      { playerId: string; playerName: string; teamName: string }
    >();
    const userUsernameMap = new Map<
      string,
      { playerId: string; playerName: string; teamName: string }
    >();
    const ratingsMap = new Map<
      string,
      {
        playerId: string;
        playerName: string;
        teamName: string;
        ratings: number[];
      }
    >();

    for (const mp of allMatchPlayers) {
      const playerName =
        mp.player?.user?.username ??
        mp.player?.jerseyNumber?.toString() ??
        mp.playerId;
      const teamName = mp.team?.name ?? 'Unknown';
      const pInfo = { playerId: mp.playerId, playerName, teamName };

      if (mp.player?.userId) {
        userUserIdMap.set(mp.player.userId, pInfo);
      }
      if (mp.player?.user?.username) {
        userUsernameMap.set(mp.player.user.username, pInfo);
      }

      if (mp.rating !== null) {
        let existing = ratingsMap.get(mp.playerId);
        if (!existing) {
          existing = { ...pInfo, ratings: [] };
          ratingsMap.set(mp.playerId, existing);
        }
        existing.ratings.push(Number(mp.rating));
      }
    }

    const topRated = Array.from(ratingsMap.values())
      .map((r) => {
        const avgRating =
          Math.round(
            (r.ratings.reduce((a, b) => a + b, 0) / r.ratings.length) * 100,
          ) / 100;
        return {
          playerId: r.playerId,
          playerName: r.playerName,
          teamName: r.teamName,
          avgRating,
          appearances: r.ratings.length,
        };
      })
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 10);

    const mvpCounts = new Map<
      string,
      { playerId: string; playerName: string; teamName: string; mvps: number }
    >();
    const matchPlayersMap = new Map<string, MatchPlayer[]>();
    for (const mp of allMatchPlayers) {
      if (!matchPlayersMap.has(mp.matchId)) {
        matchPlayersMap.set(mp.matchId, []);
      }
      matchPlayersMap.get(mp.matchId)!.push(mp);
    }
    for (const [matchId, playersInMatch] of matchPlayersMap.entries()) {
      let maxRating = -1;
      let mvpCandidates: MatchPlayer[] = [];
      for (const mp of playersInMatch) {
        if (mp.rating !== null) {
          const r = Number(mp.rating);
          if (r > maxRating) {
            maxRating = r;
            mvpCandidates = [mp];
          } else if (r === maxRating) {
            mvpCandidates.push(mp);
          }
        }
      }
      if (maxRating >= 5.0) {
        for (const mvpMp of mvpCandidates) {
          let entry = mvpCounts.get(mvpMp.playerId);
          if (!entry) {
            const playerName =
              mvpMp.player?.user?.username ??
              mvpMp.player?.jerseyNumber?.toString() ??
              mvpMp.playerId;
            const teamName = mvpMp.team?.name ?? 'Unknown';
            entry = { playerId: mvpMp.playerId, playerName, teamName, mvps: 0 };
            mvpCounts.set(mvpMp.playerId, entry);
          }
          entry.mvps++;
        }
      }
    }
    const mostMvps = Array.from(mvpCounts.values())
      .sort((a, b) => b.mvps - a.mvps)
      .slice(0, 10);

    const engine = this.sportEngineRegistry.getEngine(sportCode);
    const sportStats = engine.getCompetitionStats(
      completedMatches,
      allMatchPlayers,
      {
        userUserIdMap,
        userUsernameMap,
      },
    );

    return {
      sportCode,
      topRated,
      mostMvps,
      ...sportStats,
    };
  }
}
