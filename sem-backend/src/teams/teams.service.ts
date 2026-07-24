import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Team } from '../workspaces/entities/team.entity';
import { Player } from '../workspaces/entities/player.entity';
import { Match } from '../workspaces/entities/match.entity';
import { MatchPlayer } from '../workspaces/entities/match-player.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { CompetitionTeam } from '../workspaces/entities/competition-team.entity';
import { NotificationType } from '../workspaces/entities/notification.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { SearchService } from '../search/search.service';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayerRepo: Repository<MatchPlayer>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    private readonly workspacesService: WorkspacesService,
    private readonly searchService: SearchService,
  ) {}

  async getTeams(workspaceId: string, userId: string): Promise<Team[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.teamRepo.find({
      where: { workspaceId },
      order: { name: 'ASC' },
    });
  }

  async createTeam(
    workspaceId: string,
    dto: CreateTeamDto,
    userId: string,
  ): Promise<Team> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'team.manage',
    );

    let code = dto.code;
    if (!code) {
      // Auto-generate code if not provided (e.g. WAR423)
      const prefix = (dto.name || 'TEM')
        .substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z]/g, 'T');
      code = prefix + Math.floor(100 + Math.random() * 900);
    }

    // Check code uniqueness
    const existing = await this.teamRepo.findOne({ where: { code } });
    if (existing) {
      if (dto.code) {
        throw new ConflictException(`Team code "${code}" is already taken`);
      } else {
        // Regenerate unique one
        const prefix = (dto.name || 'TEM')
          .substring(0, 3)
          .toUpperCase()
          .replace(/[^A-Z]/g, 'T');
        code = prefix + Math.floor(1000 + Math.random() * 9000);
      }
    }

    const team = this.teamRepo.create({
      name: dto.name,
      code,
      description: dto.description ?? null,
      logoUrl: dto.logoUrl ?? null,
      primaryColor: dto.primaryColor ?? null,
      secondaryColor: dto.secondaryColor ?? null,
      workspaceId,
    });
    const saved = await this.teamRepo.save(team);
    await this.searchService.indexTeam(saved);

    // Notify workspace members
    const memberIds = await this.workspacesService.getWorkspaceMemberUserIds(
      workspaceId,
      userId,
    );
    await this.workspacesService.sendNotificationToMany(
      memberIds,
      NotificationType.TEAM_CREATED,
      `New team ${saved.name} has been created.`,
      workspaceId,
      { teamName: saved.name, teamId: saved.id },
    );

    return saved;
  }

  async updateTeam(
    workspaceId: string,
    teamId: string,
    dto: UpdateTeamDto,
    userId: string,
  ): Promise<Team> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'team.manage',
    );
    const team = await this.teamRepo.findOne({
      where: { id: teamId, workspaceId },
    });
    if (!team) {
      throw new NotFoundException('Team not found in this workspace');
    }

    // Check code uniqueness if changing
    if (dto.code && dto.code !== team.code) {
      const existing = await this.teamRepo.findOne({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException(`Team code "${dto.code}" is already taken`);
      }
    }

    Object.assign(team, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
      ...(dto.secondaryColor !== undefined && {
        secondaryColor: dto.secondaryColor,
      }),
    });

    const saved = await this.teamRepo.save(team);
    await this.searchService.indexTeam(saved);
    return saved;
  }

  async removeTeam(
    workspaceId: string,
    teamId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'team.manage',
    );
    const team = await this.teamRepo.findOne({
      where: { id: teamId, workspaceId },
    });
    if (!team) {
      throw new NotFoundException('Team not found in this workspace');
    }
    // Notify team players before deleting
    const playerUserIds =
      await this.workspacesService.getTeamPlayerUserIds(teamId);
    await this.workspacesService.sendNotificationToMany(
      playerUserIds,
      NotificationType.TEAM_DELETED,
      `Team ${team.name} has been deleted.`,
      workspaceId,
      { teamName: team.name },
    );

    team.deletedAt = new Date();
    await this.teamRepo.save(team);
    await this.searchService.deleteTeam(teamId);
  }

  async getTeamStats(workspaceId: string, teamId: string, userId: string) {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const team = await this.teamRepo.findOne({
      where: { id: teamId, workspaceId },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // 1. Find all competitions this team is registered in
    const compTeams = await this.memberRepo.manager.find(CompetitionTeam, {
      where: { teamId },
      relations: {
        competition: {
          sport: true,
        },
      },
    });

    const competitionIds = compTeams.map((ct) => ct.competitionId);

    // 2. Fetch squad/players of this team
    const squad = await this.playerRepo.find({
      where: { teamId },
      relations: { user: true },
    });
    const squadPlayerIds = squad.map((p) => p.id);
    const squadUserIds = squad.map((p) => p.userId);
    const squadUsernames = squad.map((p) => p.user?.username).filter(Boolean);

    // 3. Fetch completed matches involving this team
    const matches = await this.matchRepo.find({
      where: [
        { homeTeamId: teamId, status: 'completed' },
        { awayTeamId: teamId, status: 'completed' },
      ],
      relations: {
        stage: {
          competition: {
            sport: true,
          },
        },
        homeTeam: true,
        awayTeam: true,
      },
    });

    const matchIds = matches.map((m) => m.id);

    // 4. Fetch all rated match players from our team in these matches
    let squadMatchPlayers: MatchPlayer[] = [];
    if (matchIds.length > 0 && squadPlayerIds.length > 0) {
      squadMatchPlayers = await this.matchPlayerRepo.find({
        where: {
          matchId: In(matchIds),
          playerId: In(squadPlayerIds),
          isPlaying: true,
        },
        relations: { player: { user: true } },
      });
    }

    // Calculate maximum rating for each match in the completed matches to find MVPs
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

    // Career totals
    let allTimeGoals = 0;
    let allTimeAssists = 0;
    let allTimeRuns = 0;
    let allTimeWickets = 0;
    let allTimeRalliesWon = 0;
    let allTimeRalliesLost = 0;
    let allTimeMvps = 0;

    // Process goals & other stats from matches
    for (const m of matches) {
      const sport = m.stage?.competition?.sport?.code ?? 'football';
      const liveData = m.liveData || {};

      if (sport === 'football') {
        const isHome = m.homeTeamId === teamId;
        allTimeGoals += isHome ? m.homeScore : m.awayScore;

        const events = liveData.events || [];
        for (const ev of events) {
          const isSelfAssist =
            (ev.assistPlayerUserId &&
              squadUserIds.includes(ev.assistPlayerUserId)) ||
            (ev.assistPlayerId && squadPlayerIds.includes(ev.assistPlayerId));
          if (
            ev.type === 'goal' &&
            ev.goalType !== 'own_goal' &&
            isSelfAssist
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
          for (const username of Object.keys(batStats)) {
            if (squadUsernames.includes(username)) {
              allTimeRuns += batStats[username]?.runs ?? 0;
            }
          }
          const bowlStats = inn.bowlerStats || {};
          for (const username of Object.keys(bowlStats)) {
            if (squadUsernames.includes(username)) {
              allTimeWickets += bowlStats[username]?.wickets ?? 0;
            }
          }
        }
      } else if (sport === 'badminton') {
        const rallies = liveData.rallies || [];
        const isHome = m.homeTeamId === teamId;
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

    // Tally squad MVPs count
    for (const smp of squadMatchPlayers) {
      if (smp.rating !== null) {
        const rVal = Number(smp.rating);
        const maxR = maxRatings.get(smp.matchId);
        if (maxR !== undefined && rVal === maxR) {
          allTimeMvps++;
        }
      }
    }

    // Best player of this club in each sport
    const sportRatings = new Map<
      string,
      Map<string, { ratings: number[]; player: Player }>
    >();
    for (const smp of squadMatchPlayers) {
      const matchObj = matches.find((m) => m.id === smp.matchId);
      const sport = matchObj?.stage?.competition?.sport?.code ?? 'football';
      if (smp.rating === null) continue;

      if (!sportRatings.has(sport)) {
        sportRatings.set(sport, new Map());
      }
      const playersInSport = sportRatings.get(sport)!;
      if (!playersInSport.has(smp.playerId)) {
        playersInSport.set(smp.playerId, { ratings: [], player: smp.player });
      }
      playersInSport.get(smp.playerId)!.ratings.push(Number(smp.rating));
    }

    const bestPlayers: Record<
      string,
      {
        playerId: string;
        playerName: string;
        avatarUrl?: string | null;
        avgRating: number;
        appearances: number;
      } | null
    > = {
      football: null,
      cricket: null,
      badminton: null,
    };

    for (const [sport, playersMap] of sportRatings.entries()) {
      let topAvgRating = -1;
      let topPlayerInfo: any = null;

      for (const [playerId, data] of playersMap.entries()) {
        const avg =
          data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
        if (avg > topAvgRating) {
          topAvgRating = avg;
          topPlayerInfo = {
            playerId,
            playerName:
              data.player.user?.username ??
              data.player.jerseyNumber?.toString() ??
              'Player',
            avatarUrl: data.player.user?.avatarUrl,
            avgRating: Math.round(avg * 100) / 100,
            appearances: data.ratings.length,
          };
        }
      }
      bestPlayers[sport] = topPlayerInfo;
    }

    // Statistics by Competition
    const competitionsStatsList: any[] = [];
    for (const ct of compTeams) {
      const comp = ct.competition;
      const compMatches = matches.filter(
        (m) => m.stage?.competitionId === comp.id,
      );

      let compGoals = 0;
      let compAssists = 0;
      let compRuns = 0;
      let compWickets = 0;
      let compRalliesWon = 0;
      let compRalliesLost = 0;
      let compMvps = 0;

      for (const m of compMatches) {
        const liveData = m.liveData || {};
        if (comp.sport?.code === 'football') {
          const isHome = m.homeTeamId === teamId;
          compGoals += isHome ? m.homeScore : m.awayScore;

          const events = liveData.events || [];
          for (const ev of events) {
            const isSelfAssist =
              (ev.assistPlayerUserId &&
                squadUserIds.includes(ev.assistPlayerUserId)) ||
              (ev.assistPlayerId && squadPlayerIds.includes(ev.assistPlayerId));
            if (
              ev.type === 'goal' &&
              ev.goalType !== 'own_goal' &&
              isSelfAssist
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
            for (const username of Object.keys(batStats)) {
              if (squadUsernames.includes(username)) {
                compRuns += batStats[username]?.runs ?? 0;
              }
            }
            const bowlStats = inn.bowlerStats || {};
            for (const username of Object.keys(bowlStats)) {
              if (squadUsernames.includes(username)) {
                compWickets += bowlStats[username]?.wickets ?? 0;
              }
            }
          }
        } else if (comp.sport?.code === 'badminton') {
          const rallies = liveData.rallies || [];
          const isHome = m.homeTeamId === teamId;
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

      // Tally MVPs for this competition
      const compMatchIds = compMatches.map((m) => m.id);
      const compSquadMatchPlayers = squadMatchPlayers.filter((smp) =>
        compMatchIds.includes(smp.matchId),
      );
      for (const smp of compSquadMatchPlayers) {
        if (smp.rating !== null) {
          const rVal = Number(smp.rating);
          const maxR = maxRatings.get(smp.matchId);
          if (maxR !== undefined && rVal === maxR) {
            compMvps++;
          }
        }
      }

      // Best player for this team in this competition
      const compPlayerRatings = new Map<
        string,
        { ratings: number[]; player: Player }
      >();
      for (const smp of compSquadMatchPlayers) {
        if (smp.rating === null) continue;
        if (!compPlayerRatings.has(smp.playerId)) {
          compPlayerRatings.set(smp.playerId, {
            ratings: [],
            player: smp.player,
          });
        }
        compPlayerRatings.get(smp.playerId)!.ratings.push(Number(smp.rating));
      }

      let compBestPlayer: any = null;
      let compTopAvgRating = -1;
      for (const [playerId, data] of compPlayerRatings.entries()) {
        const avg =
          data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
        if (avg > compTopAvgRating) {
          compTopAvgRating = avg;
          compBestPlayer = {
            playerId,
            playerName:
              data.player.user?.username ??
              data.player.jerseyNumber?.toString() ??
              'Player',
            avatarUrl: data.player.user?.avatarUrl,
            avgRating: Math.round(avg * 100) / 100,
            appearances: data.ratings.length,
          };
        }
      }

      competitionsStatsList.push({
        competitionId: comp.id,
        competitionName: comp.name,
        sportCode: comp.sport?.code ?? 'football',
        gamesPlayed: compMatches.length,
        goals: compGoals,
        assists: compAssists,
        runs: compRuns,
        wickets: compWickets,
        ralliesWon: compRalliesWon,
        ralliesLost: compRalliesLost,
        mvps: compMvps,
        bestPlayer: compBestPlayer,
      });
    }

    return {
      team: {
        id: team.id,
        name: team.name,
        code: team.code,
        logoUrl: team.logoUrl,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        createdAt: team.createdAt,
      },
      allTime: {
        participations: competitionIds.length,
        totalGames: matches.length,
        goals: allTimeGoals,
        assists: allTimeAssists,
        runs: allTimeRuns,
        wickets: allTimeWickets,
        ralliesWon: allTimeRalliesWon,
        ralliesLost: allTimeRalliesLost,
        mvps: allTimeMvps,
      },
      bestPlayers,
      competitions: competitionsStatsList,
      squad: squad.map((p) => ({
        id: p.id,
        jerseyNumber: p.jerseyNumber,
        user: {
          id: p.user?.id,
          username: p.user?.username,
          avatarUrl: p.user?.avatarUrl,
        },
      })),
    };
  }
}
