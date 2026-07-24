import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Player } from '../workspaces/entities/player.entity';
import { Team } from '../workspaces/entities/team.entity';
import { MatchPlayer } from '../workspaces/entities/match-player.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { CompetitionTeam } from '../workspaces/entities/competition-team.entity';
import { Match } from '../workspaces/entities/match.entity';
import { NotificationType } from '../workspaces/entities/notification.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { UsersService } from '../users/users.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { SearchService } from '../search/search.service';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayerRepo: Repository<MatchPlayer>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    private readonly workspacesService: WorkspacesService,
    private readonly usersService: UsersService,
    private readonly searchService: SearchService,
  ) {}

  async getPlayers(workspaceId: string, userId: string): Promise<Player[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.playerRepo.find({
      where: { workspaceId },
      relations: { team: true, user: true },
      order: { user: { username: 'ASC' } },
    });
  }

  async createPlayer(
    workspaceId: string,
    dto: CreatePlayerDto,
    userId: string,
  ): Promise<Player> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'player.manage',
    );
    const team = await this.teamRepo.findOne({
      where: { id: dto.teamId, workspaceId },
    });
    if (!team) {
      throw new NotFoundException('Team not found in this workspace');
    }

    const user = await this.usersService.findOneById(dto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.playerRepo.findOne({
      where: { teamId: dto.teamId, userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException(
        'This user is already registered as a player in this team',
      );
    }

    const player = this.playerRepo.create({
      userId: dto.userId,
      jerseyNumber: dto.jerseyNumber ?? null,
      teamId: dto.teamId,
      workspaceId,
    });
    const saved = await this.playerRepo.save(player);
    saved.team = team;
    saved.user = user;
    await this.searchService.indexPlayer(saved);

    // Notify the player
    const jerseyText = dto.jerseyNumber
      ? ` with jersey #${dto.jerseyNumber}`
      : '';
    await this.workspacesService.sendNotification(
      dto.userId,
      NotificationType.PLAYER_ADDED_TO_TEAM,
      `You've been added to team ${team.name}${jerseyText}.`,
      workspaceId,
      { teamName: team.name, teamId: team.id, jerseyNumber: dto.jerseyNumber },
    );

    return saved;
  }

  async updatePlayer(
    workspaceId: string,
    playerId: string,
    dto: UpdatePlayerDto,
    userId: string,
  ): Promise<Player> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'player.manage',
    );
    const player = await this.playerRepo.findOne({
      where: { id: playerId, workspaceId },
      relations: { team: true, user: true },
    });
    if (!player) {
      throw new NotFoundException('Player not found in this workspace');
    }

    const oldTeamName = player.team?.name;
    const isTransfer = dto.teamId !== undefined && dto.teamId !== player.teamId;

    if (dto.teamId !== undefined) {
      const team = await this.teamRepo.findOne({
        where: { id: dto.teamId, workspaceId },
      });
      if (!team) {
        throw new NotFoundException('Team not found in this workspace');
      }

      const existing = await this.playerRepo.findOne({
        where: { teamId: dto.teamId, userId: player.userId },
      });
      if (existing && existing.id !== player.id) {
        throw new ConflictException(
          'This user is already registered as a player in the target team',
        );
      }

      player.teamId = dto.teamId;
      player.team = team;
    }

    Object.assign(player, {
      ...(dto.jerseyNumber !== undefined && { jerseyNumber: dto.jerseyNumber }),
    });

    const saved = await this.playerRepo.save(player);
    await this.searchService.indexPlayer(saved);

    if (isTransfer) {
      await this.workspacesService.sendNotification(
        player.userId,
        NotificationType.PLAYER_TRANSFERRED,
        `You've been transferred from ${oldTeamName} to ${player.team.name}.`,
        workspaceId,
        { oldTeam: oldTeamName, newTeam: player.team.name },
      );
    }

    return saved;
  }

  async removePlayer(
    workspaceId: string,
    playerId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'player.manage',
    );
    const player = await this.playerRepo.findOne({
      where: { id: playerId, workspaceId },
    });
    if (!player) {
      throw new NotFoundException('Player not found in this workspace');
    }

    // Notify the player
    const team = await this.teamRepo.findOne({ where: { id: player.teamId } });
    await this.workspacesService.sendNotification(
      player.userId,
      NotificationType.PLAYER_REMOVED_FROM_TEAM,
      `You've been removed from team ${team?.name ?? 'Unknown'}.`,
      workspaceId,
      { teamName: team?.name },
    );

    player.deletedAt = new Date();
    await this.playerRepo.save(player);
    await this.searchService.deletePlayer(playerId);
  }

  async getPlayerStats(workspaceId: string, playerId: string, userId: string) {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const player = await this.playerRepo.findOne({
      where: { id: playerId, workspaceId },
      relations: { user: true, team: true },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // 1. Find all competitions this team is registered in
    const compTeams = await this.memberRepo.manager.find(CompetitionTeam, {
      where: { teamId: player.teamId },
      relations: {
        competition: {
          sport: true,
        },
      },
    });

    const competitionIds = compTeams.map((ct) => ct.competitionId);

    // 2. Fetch all completed match-player entries for this player
    const completedMatchPlayers = await this.matchPlayerRepo.find({
      where: { playerId, isPlaying: true, match: { status: 'completed' } },
      relations: {
        match: {
          stage: {
            competition: {
              sport: true,
            },
          },
        },
      },
    });

    const matchIds = completedMatchPlayers.map((mp) => mp.matchId);

    // 3. Find the maximum rating in each match to see if player was MVP
    const maxRatings = new Map<string, number>();
    if (matchIds.length > 0) {
      const allMatchPlayersInMatches = await this.matchPlayerRepo.find({
        where: { matchId: In(matchIds), isPlaying: true },
      });
      for (const amp of allMatchPlayersInMatches) {
        if (amp.rating !== null) {
          const rVal = Number(amp.rating);
          const currentMax = maxRatings.get(amp.matchId) ?? -1;
          if (rVal > currentMax) {
            maxRatings.set(amp.matchId, rVal);
          }
        }
      }
    }

    const allTimeGames = completedMatchPlayers.length;
    let allTimeGoals = 0;
    let allTimeAssists = 0;
    let allTimeRuns = 0;
    let allTimeWickets = 0;
    let allTimeRalliesWon = 0;
    let allTimeRalliesLost = 0;
    let allTimeMvps = 0;
    let totalRatingSum = 0;
    let ratedGamesCount = 0;

    // Process career stats
    for (const cmp of completedMatchPlayers) {
      const m = cmp.match;
      const sport = m?.stage?.competition?.sport?.code ?? 'football';
      const liveData = m?.liveData || {};

      // MVP calculation
      if (cmp.rating !== null) {
        const rVal = Number(cmp.rating);
        totalRatingSum += rVal;
        ratedGamesCount++;
        const maxR = maxRatings.get(cmp.matchId);
        if (maxR !== undefined && rVal === maxR) {
          allTimeMvps++;
        }
      }

      if (sport === 'football') {
        const events = liveData.events || [];
        for (const ev of events) {
          if (
            ev.type === 'goal' &&
            ev.goalType !== 'own_goal' &&
            (ev.playerUserId === player.userId || ev.playerId === player.id)
          ) {
            allTimeGoals++;
          }
          const isSelfAssist =
            ev.assistPlayerUserId === player.userId ||
            ev.assistPlayerId === player.id;
          if (
            ev.type === 'goal' &&
            ev.goalType !== 'own_goal' &&
            isSelfAssist &&
            ev.playerUserId !== player.userId &&
            ev.playerId !== player.id
          ) {
            allTimeAssists++;
          } else if (ev.type === 'assist' && isSelfAssist) {
            allTimeAssists++;
          }
        }
      } else if (sport === 'cricket') {
        const inningsList = liveData.inningsData || [];
        for (const inn of inningsList) {
          const batStats = inn.batsmanStats || {};
          const myBat = batStats[player.user.username];
          if (myBat) {
            allTimeRuns += myBat.runs ?? 0;
          }
          const bowlStats = inn.bowlerStats || {};
          const myBowl = bowlStats[player.user.username];
          if (myBowl) {
            allTimeWickets += myBowl.wickets ?? 0;
          }
        }
      } else if (sport === 'badminton') {
        const rallies = liveData.rallies || [];
        const isHome = m?.homeTeamId === player.teamId;
        for (const r of rallies) {
          if (r.winnerSide === 'none') continue;
          if (isHome) {
            if (r.winnerSide === 'home') allTimeRalliesWon++;
            else allTimeRalliesLost++;
          } else {
            if (r.winnerSide === 'away') allTimeRalliesWon++;
            else allTimeRalliesLost++;
          }
        }
      }
    }

    const allTimeAvgRating =
      ratedGamesCount > 0
        ? Math.round((totalRatingSum / ratedGamesCount) * 100) / 100
        : 0;

    // Statistics by Competition
    const competitionsStatsList: any[] = [];
    for (const ct of compTeams) {
      const comp = ct.competition;
      const compMatchPlayers = completedMatchPlayers.filter(
        (cmp) => cmp.match?.stage?.competitionId === comp.id,
      );

      let compGoals = 0;
      let compAssists = 0;
      let compRuns = 0;
      let compWickets = 0;
      let compRalliesWon = 0;
      let compRalliesLost = 0;
      let compMvps = 0;
      let compRatingSum = 0;
      let compRatedCount = 0;

      for (const cmp of compMatchPlayers) {
        const m = cmp.match;
        const liveData = m?.liveData || {};

        if (cmp.rating !== null) {
          const rVal = Number(cmp.rating);
          compRatingSum += rVal;
          compRatedCount++;
          const maxR = maxRatings.get(cmp.matchId);
          if (maxR !== undefined && rVal === maxR) {
            compMvps++;
          }
        }

        if (comp.sport?.code === 'football') {
          const events = liveData.events || [];
          for (const ev of events) {
            if (
              ev.type === 'goal' &&
              ev.goalType !== 'own_goal' &&
              (ev.playerUserId === player.userId || ev.playerId === player.id)
            ) {
              compGoals++;
            }
            const isSelfAssist =
              ev.assistPlayerUserId === player.userId ||
              ev.assistPlayerId === player.id;
            if (
              ev.type === 'goal' &&
              ev.goalType !== 'own_goal' &&
              isSelfAssist &&
              ev.playerUserId !== player.userId &&
              ev.playerId !== player.id
            ) {
              compAssists++;
            } else if (ev.type === 'assist' && isSelfAssist) {
              compAssists++;
            }
          }
        } else if (comp.sport?.code === 'cricket') {
          const inningsList = liveData.inningsData || [];
          for (const inn of inningsList) {
            const batStats = inn.batsmanStats || {};
            const myBat = batStats[player.user.username];
            if (myBat) {
              compRuns += myBat.runs ?? 0;
            }
            const bowlStats = inn.bowlerStats || {};
            const myBowl = bowlStats[player.user.username];
            if (myBowl) {
              compWickets += myBowl.wickets ?? 0;
            }
          }
        } else if (comp.sport?.code === 'badminton') {
          const rallies = liveData.rallies || [];
          const isHome = m?.homeTeamId === player.teamId;
          for (const r of rallies) {
            if (r.winnerSide === 'none') continue;
            if (isHome) {
              if (r.winnerSide === 'home') compRalliesWon++;
              else compRalliesLost++;
            } else {
              if (r.winnerSide === 'away') compRalliesWon++;
              else compRalliesLost++;
            }
          }
        }
      }

      competitionsStatsList.push({
        competitionId: comp.id,
        competitionName: comp.name,
        sportCode: comp.sport?.code ?? 'football',
        gamesPlayed: compMatchPlayers.length,
        goals: compGoals,
        assists: compAssists,
        runs: compRuns,
        wickets: compWickets,
        ralliesWon: compRalliesWon,
        ralliesLost: compRalliesLost,
        mvps: compMvps,
        avgRating:
          compRatedCount > 0
            ? Math.round((compRatingSum / compRatedCount) * 100) / 100
            : 0,
      });
    }

    return {
      player: {
        id: player.id,
        jerseyNumber: player.jerseyNumber,
        team: {
          id: player.team?.id,
          name: player.team?.name,
          logoUrl: player.team?.logoUrl,
          primaryColor: player.team?.primaryColor,
          secondaryColor: player.team?.secondaryColor,
        },
        user: {
          id: player.user?.id,
          username: player.user?.username,
          avatarUrl: player.user?.avatarUrl,
        },
      },
      allTime: {
        participations: competitionIds.length,
        gamesPlayed: allTimeGames,
        goals: allTimeGoals,
        assists: allTimeAssists,
        runs: allTimeRuns,
        wickets: allTimeWickets,
        ralliesWon: allTimeRalliesWon,
        ralliesLost: allTimeRalliesLost,
        mvps: allTimeMvps,
        avgRating: allTimeAvgRating,
      },
      competitions: competitionsStatsList,
    };
  }
}
