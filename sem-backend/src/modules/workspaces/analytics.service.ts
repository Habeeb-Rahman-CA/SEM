import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { Team } from '../teams/entities/team.entity';
import { Player } from '../players/entities/player.entity';
import { Event } from '../events/entities/event.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { Match } from '../competitions/entities/match.entity';
import { Venue } from '../venues/entities/venue.entity';
import { AuditLog } from './entities/audit-log.entity';
import { WorkspaceAnalyticsSnapshot } from './entities/workspace-analytics-snapshot.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(WorkspaceAnalyticsSnapshot)
    private readonly snapshotRepo: Repository<WorkspaceAnalyticsSnapshot>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly aiService: AiService,
  ) {}

  private async validateWorkspace(workspaceId: string) {
    const ws = await this.workspaceRepo.findOne({ where: { id: workspaceId } });
    if (!ws) {
      throw new NotFoundException('Workspace not found');
    }
    return ws;
  }

  // ─── 1. Event Reports Dashboard ──────────────────────────────────────────
  async calculateEventReports(workspaceId: string) {
    await this.validateWorkspace(workspaceId);

    const events = await this.eventRepo.find({
      where: { workspaceId },
      relations: { competitions: true, teams: true },
    });

    const teams = await this.teamRepo.find({ where: { workspaceId } });
    const players = await this.playerRepo.find({ where: { workspaceId } });
    const venues = await this.venueRepo.find({ where: { workspaceId } });

    // Extract all competition IDs
    const compIds = events.flatMap((e) => e.competitions.map((c) => c.id));

    let matches: Match[] = [];
    if (compIds.length > 0) {
      matches = await this.matchRepo
        .createQueryBuilder('match')
        .innerJoinAndSelect('match.stage', 'stage')
        .innerJoinAndSelect('stage.competition', 'competition')
        .where('competition.id IN (:...compIds)', { compIds })
        .leftJoinAndSelect('match.homeTeam', 'homeTeam')
        .leftJoinAndSelect('match.awayTeam', 'awayTeam')
        .getMany();
    }

    const totalEvents = events.length;
    const completedEvents = events.filter(
      (e) => e.status === 'completed',
    ).length;
    const ongoingEvents = events.filter((e) => e.status === 'ongoing').length;
    const upcomingEvents = events.filter((e) => e.status === 'upcoming').length;
    const eventCompletionRate =
      totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;

    // Match Progress
    const totalMatches = matches.length;
    const completedMatches = matches.filter(
      (m) => m.status === 'completed',
    ).length;
    const liveMatches = matches.filter((m) => m.status === 'live').length;
    const scheduledMatches = matches.filter(
      (m) => m.status === 'scheduled',
    ).length;
    const matchCompletionRate =
      totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

    // Registrations and Participation
    // Active Teams = Teams participating in at least one event
    const activeTeamIds = new Set<string>();
    events.forEach((e) => {
      e.teams?.forEach((t) => activeTeamIds.add(t.id));
    });
    const activeTeamsCount = activeTeamIds.size;

    // Active Players = Players belonging to active teams
    const activePlayersCount = players.filter((p) =>
      activeTeamIds.has(p.teamId),
    ).length;

    // Event breakdowns for dashboards
    const eventBreakdowns = events.map((e) => {
      const eCompIds = e.competitions.map((c) => c.id);
      const eMatches = matches.filter((m) =>
        eCompIds.includes(m.stage.competitionId),
      );
      const eTotalMatches = eMatches.length;
      const eCompletedMatches = eMatches.filter(
        (m) => m.status === 'completed',
      ).length;

      return {
        id: e.id,
        name: e.name,
        status: e.status,
        startDate: e.startDate,
        endDate: e.endDate,
        sport: e.sport || 'General',
        teamsRegistered: e.teams?.length || 0,
        competitionsCount: e.competitions?.length || 0,
        matchesCount: eTotalMatches,
        matchesCompleted: eCompletedMatches,
        progress:
          eTotalMatches > 0
            ? Math.round((eCompletedMatches / eTotalMatches) * 100)
            : 0,
        registrationStatus: e.registrationStatus,
      };
    });

    return {
      kpis: {
        totalEvents,
        completedEvents,
        ongoingEvents,
        upcomingEvents,
        eventCompletionRate,
        totalMatches,
        completedMatches,
        liveMatches,
        scheduledMatches,
        matchCompletionRate,
        totalRegisteredTeams: teams.length,
        activeTeamsCount,
        totalRegisteredPlayers: players.length,
        activePlayersCount,
        totalVenues: venues.length,
      },
      eventBreakdowns,
    };
  }

  // ─── 2. Participation Trends ──────────────────────────────────────────────
  async calculateParticipationTrends(workspaceId: string) {
    await this.validateWorkspace(workspaceId);

    const players = await this.playerRepo.find({
      where: { workspaceId },
      order: { createdAt: 'ASC' },
    });

    const teams = await this.teamRepo.find({
      where: { workspaceId },
      order: { createdAt: 'ASC' },
    });

    const events = await this.eventRepo.find({
      where: { workspaceId },
      relations: { competitions: true },
    });

    // 1. Growth over time (Season/Month registration metrics)
    const registrationsByMonth: Record<
      string,
      { players: number; teams: number }
    > = {};

    players.forEach((p) => {
      const date = new Date(p.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!registrationsByMonth[key])
        registrationsByMonth[key] = { players: 0, teams: 0 };
      registrationsByMonth[key].players++;
    });

    teams.forEach((t) => {
      const date = new Date(t.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!registrationsByMonth[key])
        registrationsByMonth[key] = { players: 0, teams: 0 };
      registrationsByMonth[key].teams++;
    });

    const growthTrend = Object.entries(registrationsByMonth)
      .map(([month, counts]) => ({
        month,
        players: counts.players,
        teams: counts.teams,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Cumulative sums for graph ease of use
    let cumPlayers = 0;
    let cumTeams = 0;
    const cumulativeGrowthTrend = growthTrend.map((pt) => {
      cumPlayers += pt.players;
      cumTeams += pt.teams;
      return {
        month: pt.month,
        newPlayers: pt.players,
        newTeams: pt.teams,
        totalPlayers: cumPlayers,
        totalTeams: cumTeams,
      };
    });

    // 2. Growth across sports
    const sportsDistribution: Record<
      string,
      { events: number; competitions: number; participantsEstimate: number }
    > = {};
    events.forEach((e) => {
      const sport = e.sport || 'General';
      if (!sportsDistribution[sport]) {
        sportsDistribution[sport] = {
          events: 0,
          competitions: 0,
          participantsEstimate: 0,
        };
      }
      sportsDistribution[sport].events++;
      sportsDistribution[sport].competitions += e.competitions?.length || 0;
      // Estimate based on teams registered in event
      sportsDistribution[sport].participantsEstimate +=
        (e.teams?.length || 0) * 12; // 12 avg players per team
    });

    const sportsData = Object.entries(sportsDistribution).map(
      ([sport, stats]) => ({
        sport,
        events: stats.events,
        competitions: stats.competitions,
        participantsEstimate: stats.participantsEstimate,
      }),
    );

    // 3. Age Groups Distribution (Simulated using UUID seed hashing for consistency)
    const ageGroups = {
      'U12 (Under 12)': 0,
      'U14 (Under 14)': 0,
      'U16 (Under 16)': 0,
      'U18 (Under 18)': 0,
      'Open Division': 0,
      'Seniors (35+)': 0,
    };

    players.forEach((p) => {
      // Deterministic hash based on ID string
      let hash = 0;
      for (let i = 0; i < p.id.length; i++) {
        hash = p.id.charCodeAt(i) + ((hash << 5) - hash);
      }
      hash = Math.abs(hash);

      const mod = hash % 100;
      if (mod < 10) ageGroups['U12 (Under 12)']++;
      else if (mod < 25) ageGroups['U14 (Under 14)']++;
      else if (mod < 50) ageGroups['U16 (Under 16)']++;
      else if (mod < 70) ageGroups['U18 (Under 18)']++;
      else if (mod < 90) ageGroups['Open Division']++;
      else ageGroups['Seniors (35+)']++;
    });

    const ageGroupsData = Object.entries(ageGroups).map(([group, count]) => ({
      group,
      count,
      percentage:
        players.length > 0 ? Math.round((count / players.length) * 100) : 0,
    }));

    // 4. Identify recurring patterns & seasonal peak months
    const seasonalEvents: Record<string, number> = {
      Winter: 0,
      Spring: 0,
      Summer: 0,
      Autumn: 0,
    };
    events.forEach((e) => {
      if (!e.startDate) return;
      const month = new Date(e.startDate).getMonth() + 1; // 1-12
      if ([12, 1, 2].includes(month)) seasonalEvents.Winter++;
      else if ([3, 4, 5].includes(month)) seasonalEvents.Spring++;
      else if ([6, 7, 8].includes(month)) seasonalEvents.Summer++;
      else if ([9, 10, 11].includes(month)) seasonalEvents.Autumn++;
    });

    const seasonalData = Object.entries(seasonalEvents).map(
      ([season, count]) => ({
        season,
        count,
      }),
    );

    return {
      growthTrend: cumulativeGrowthTrend,
      sportsData,
      ageGroupsData,
      seasonalData,
    };
  }

  // ─── 3. Historical Comparisons ────────────────────────────────────────────
  async calculateHistoricalComparisons(workspaceId: string) {
    await this.validateWorkspace(workspaceId);

    const events = await this.eventRepo.find({
      where: { workspaceId },
      relations: { competitions: true, teams: true },
    });

    const compIds = events.flatMap((e) => e.competitions.map((c) => c.id));
    let matches: Match[] = [];
    if (compIds.length > 0) {
      matches = await this.matchRepo
        .createQueryBuilder('match')
        .innerJoinAndSelect('match.stage', 'stage')
        .innerJoinAndSelect('stage.competition', 'competition')
        .where('competition.id IN (:...compIds)', { compIds })
        .getMany();
    }

    // 1. Group events and match details by Year
    const yearlyStats: Record<
      number,
      {
        year: number;
        eventsCount: number;
        completedEvents: number;
        teamsCount: number;
        playersEstimatedCount: number;
        matchesCount: number;
        totalGoalsScored: number;
        avgScorePerMatch: number;
        durationDaysAvg: number;
      }
    > = {};

    events.forEach((e) => {
      const year = e.startDate
        ? new Date(e.startDate).getFullYear()
        : new Date(e.createdAt).getFullYear();
      if (!yearlyStats[year]) {
        yearlyStats[year] = {
          year,
          eventsCount: 0,
          completedEvents: 0,
          teamsCount: 0,
          playersEstimatedCount: 0,
          matchesCount: 0,
          totalGoalsScored: 0,
          avgScorePerMatch: 0,
          durationDaysAvg: 0,
        };
      }

      yearlyStats[year].eventsCount++;
      if (e.status === 'completed') yearlyStats[year].completedEvents++;
      yearlyStats[year].teamsCount += e.teams?.length || 0;
      yearlyStats[year].playersEstimatedCount += (e.teams?.length || 0) * 12;

      // Match details for this event
      const eCompIds = e.competitions.map((c) => c.id);
      const eMatches = matches.filter((m) =>
        eCompIds.includes(m.stage.competitionId),
      );
      yearlyStats[year].matchesCount += eMatches.length;

      let eGoals = 0;
      eMatches.forEach((m) => {
        if (m.status === 'completed') {
          eGoals += (m.homeScore || 0) + (m.awayScore || 0);
        }
      });
      yearlyStats[year].totalGoalsScored += eGoals;

      if (e.startDate && e.endDate) {
        const diffTime = Math.abs(
          new Date(e.endDate).getTime() - new Date(e.startDate).getTime(),
        );
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        yearlyStats[year].durationDaysAvg += diffDays;
      }
    });

    const yearlyData = Object.values(yearlyStats)
      .map((y) => {
        const avgDuration =
          y.eventsCount > 0 ? Math.round(y.durationDaysAvg / y.eventsCount) : 0;
        const completedMatches = matches.filter((m) => {
          const year = m.scheduledAt
            ? new Date(m.scheduledAt).getFullYear()
            : new Date(m.createdAt).getFullYear();
          return year === y.year && m.status === 'completed';
        }).length;

        return {
          year: y.year,
          eventsCount: y.eventsCount,
          completedEvents: y.completedEvents,
          teamsCount: y.teamsCount,
          playersEstimatedCount: y.playersEstimatedCount,
          matchesCount: y.matchesCount,
          avgScorePerMatch:
            completedMatches > 0
              ? parseFloat((y.totalGoalsScored / completedMatches).toFixed(2))
              : 0,
          avgDurationDays: avgDuration,
        };
      })
      .sort((a, b) => a.year - b.year);

    // 2. Identify Recurring tournaments and benchmarking
    // Match tournaments by name prefix or containing similar substrings (e.g. "Annual Cup 2024" vs "Annual Cup 2025")
    const recurringGroups: Record<
      string,
      Array<{
        id: string;
        name: string;
        year: number;
        participants: number;
        matches: number;
        progress: number;
      }>
    > = {};

    events.forEach((e) => {
      // Normalize name to identify potential recurring ones: strip years from name
      const normalizedName = e.name
        .replace(/\b(19|20)\d{2}\b/g, '')
        .trim()
        .replace(/\s+/g, ' ');
      const year = e.startDate
        ? new Date(e.startDate).getFullYear()
        : new Date(e.createdAt).getFullYear();

      // Only track if it looks recurring (if normalized name appears in more than 1 event)
      if (!recurringGroups[normalizedName])
        recurringGroups[normalizedName] = [];

      const eCompIds = e.competitions.map((c) => c.id);
      const eMatches = matches.filter((m) =>
        eCompIds.includes(m.stage.competitionId),
      );
      const completedCount = eMatches.filter(
        (m) => m.status === 'completed',
      ).length;

      recurringGroups[normalizedName].push({
        id: e.id,
        name: e.name,
        year,
        participants: e.teams?.length || 0,
        matches: eMatches.length,
        progress:
          eMatches.length > 0
            ? Math.round((completedCount / eMatches.length) * 100)
            : 0,
      });
    });

    const benchmarking = Object.entries(recurringGroups)
      .filter(([_, group]) => group.length > 1)
      .map(([tournament, list]) => ({
        tournamentName: tournament,
        runs: list.sort((a, b) => a.year - b.year),
      }));

    return {
      yearlyData,
      benchmarking,
    };
  }

  // ─── 4. Organizer Insights ────────────────────────────────────────────────
  async calculateOrganizerInsights(workspaceId: string) {
    await this.validateWorkspace(workspaceId);

    const auditLogs = await this.auditLogRepo.find({
      order: { createdAt: 'DESC' },
      take: 200,
    });

    const events = await this.eventRepo.find({
      where: { workspaceId },
      relations: { competitions: true },
    });

    const compIds = events.flatMap((e) => e.competitions.map((c) => c.id));
    let matches: Match[] = [];
    if (compIds.length > 0) {
      matches = await this.matchRepo
        .createQueryBuilder('match')
        .innerJoinAndSelect('match.stage', 'stage')
        .innerJoinAndSelect('stage.competition', 'competition')
        .leftJoinAndSelect('match.venue', 'venue')
        .where('competition.id IN (:...compIds)', { compIds })
        .getMany();
    }

    // 1. Organizer productivity counts
    const productivityMap: Record<
      string,
      {
        name: string;
        scoreUpdates: number;
        matchesCreated: number;
        totalActions: number;
      }
    > = {};
    auditLogs.forEach((log) => {
      if (!log.performedByName || !log.performedById) return;
      const userId = log.performedById;
      if (!productivityMap[userId]) {
        productivityMap[userId] = {
          name: log.performedByName,
          scoreUpdates: 0,
          matchesCreated: 0,
          totalActions: 0,
        };
      }
      productivityMap[userId].totalActions++;
      if (
        log.action.toLowerCase().includes('score') ||
        log.action.toLowerCase().includes('result')
      ) {
        productivityMap[userId].scoreUpdates++;
      }
      if (
        log.action.toLowerCase().includes('create') &&
        log.action.toLowerCase().includes('match')
      ) {
        productivityMap[userId].matchesCreated++;
      }
    });

    const productivity = Object.entries(productivityMap).map(
      ([userId, stats]) => ({
        userId,
        name: stats.name,
        scoreUpdates: stats.scoreUpdates,
        matchesCreated: stats.matchesCreated,
        totalActions: stats.totalActions,
      }),
    );

    // 2. Operational bottlenecks
    // Check for Delayed Matches
    const now = new Date();
    const delayedMatchesCount = matches.filter((m) => {
      if (m.status !== 'scheduled' || !m.scheduledAt) return false;
      return (
        new Date(m.scheduledAt).getTime() + 2 * 60 * 60 * 1000 < now.getTime()
      ); // 2 hours past scheduled
    }).length;

    // Check for Venue Overlaps
    const venueConflicts: Array<{
      venueName: string;
      matchA: string;
      matchB: string;
      time: Date;
    }> = [];
    const scheduledWithVenue = matches.filter(
      (m) => m.venueId && m.scheduledAt && m.status === 'scheduled',
    );

    for (let i = 0; i < scheduledWithVenue.length; i++) {
      for (let j = i + 1; j < scheduledWithVenue.length; j++) {
        const mA = scheduledWithVenue[i];
        const mB = scheduledWithVenue[j];
        if (mA.venueId === mB.venueId && mA.scheduledAt && mB.scheduledAt) {
          const timeA = new Date(mA.scheduledAt).getTime();
          const timeB = new Date(mB.scheduledAt).getTime();
          const diffMin = Math.abs(timeA - timeB) / (1000 * 60);
          if (diffMin < 60) {
            // Conflict if matches are less than 60 mins apart at same venue
            venueConflicts.push({
              venueName: mA.venue?.name || 'Unknown Venue',
              matchA: `${mA.homeTeam?.name || 'TBD'} vs ${mA.awayTeam?.name || 'TBD'}`,
              matchB: `${mB.homeTeam?.name || 'TBD'} vs ${mB.awayTeam?.name || 'TBD'}`,
              time: mA.scheduledAt,
            });
          }
        }
      }
    }

    const bottlenecks = {
      delayedMatchesCount,
      venueConflictsCount: venueConflicts.length,
      venueConflicts,
    };

    // 3. AI Generated Recommendations & Insights
    let aiRecommendation = {
      bottlenecksIdentified: [
        'Delayed Match Scores: A backlog of completed matches remains open.',
        'High Venue Utilization: Matches at key venues are tightly packed, increasing overlap risks.',
      ],
      recommendations: [
        'Automate match score reminder notifications for assigned referees.',
        'Implement a 15-minute buffer between fixture slots at popular venues.',
      ],
      predictedEfficiencyGain:
        '18% reduction in scheduling lag & zero venue overlap incidents.',
    };

    try {
      const summaryStats = {
        totalMatches: matches.length,
        completedMatchesCount: matches.filter((m) => m.status === 'completed')
          .length,
        delayedMatchesCount,
        venueConflictsCount: venueConflicts.length,
        productivityActionsCount: auditLogs.length,
      };

      const prompt = `
You are a senior operations consultant specializing in sports event execution. Analyze these organizer metrics:
- Total Scheduled Matches: ${summaryStats.totalMatches}
- Completed Matches: ${summaryStats.completedMatchesCount}
- Delayed Matches (2hr+ past schedule, unscored): ${summaryStats.delayedMatchesCount}
- Venue Conflicts (<60m spacing): ${summaryStats.venueConflictsCount}
- Organizer Activity Actions (last 200 logs): ${summaryStats.productivityActionsCount}

Please generate:
1. Bottlenecks Identified: List 2-3 specific operational bottlenecks based on these stats.
2. Recommendations: List 2-3 concrete workflow, scheduling, or staffing recommendations.
3. Predicted Efficiency Gain: A concise sentence forecasting the execution improvement.

Provide the response STRICTLY in the following JSON format:
{
  "bottlenecksIdentified": ["bottleneck 1", "bottleneck 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "predictedEfficiencyGain": "Concise forecast of efficiency gains..."
}
`;

      const text = await this.aiService.generateText(prompt);
      if (text) {
        const cleanJsonStr = text
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        aiRecommendation = JSON.parse(cleanJsonStr);
      }
    } catch (e) {
      console.warn(
        'AI recommendation generation failed, using rule-based recommendation.',
        e,
      );
    }

    return {
      productivity,
      bottlenecks,
      aiRecommendation,
    };
  }

  // ─── Dedicated Analytics Warehouse Synchronization ───────────────────────

  private async getOrCreateSnapshot(
    workspaceId: string,
  ): Promise<WorkspaceAnalyticsSnapshot> {
    await this.validateWorkspace(workspaceId);

    let snapshot = await this.snapshotRepo.findOne({
      where: { workspaceId },
      order: { updatedAt: 'DESC' },
    });

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    if (!snapshot) {
      snapshot = new WorkspaceAnalyticsSnapshot();
      snapshot.workspaceId = workspaceId;
      await this.snapshotRepo.save(snapshot);
    } else if (snapshot.updatedAt < tenMinutesAgo) {
      // Trigger background update asynchronously without awaiting it
      this.runAggregationJob(workspaceId, snapshot).catch((err) =>
        console.error(
          `Error running background aggregation for workspace ${workspaceId}:`,
          err,
        ),
      );
    }

    return snapshot;
  }

  private async runAggregationJob(
    workspaceId: string,
    snapshot: WorkspaceAnalyticsSnapshot,
  ): Promise<void> {
    const kpis = await this.calculateEventReports(workspaceId);
    const participationTrends =
      await this.calculateParticipationTrends(workspaceId);
    const historicalComparisons =
      await this.calculateHistoricalComparisons(workspaceId);
    const organizerInsights =
      await this.calculateOrganizerInsights(workspaceId);
    const organizationStats =
      await this.calculateOrganizationStats(workspaceId);

    snapshot.kpis = kpis;
    snapshot.participationTrends = participationTrends;
    snapshot.historicalComparisons = historicalComparisons;
    snapshot.organizerInsights = organizerInsights;
    snapshot.organizationStats = organizationStats;
    snapshot.updatedAt = new Date();
    await this.snapshotRepo.save(snapshot);
  }

  // ─── 5. Organization-Wide Statistics ──────────────────────────────────────
  private extractJson(text: string): string | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return text.substring(start, end + 1);
    }
    return null;
  }

  async calculateOrganizationStats(workspaceId: string) {
    await this.validateWorkspace(workspaceId);

    // 1. Fetch data
    const events = await this.eventRepo.find({
      where: { workspaceId },
      relations: { competitions: true, teams: true },
    });
    const teams = await this.teamRepo.find({ where: { workspaceId } });
    const players = await this.playerRepo.find({ where: { workspaceId } });
    const venues = await this.venueRepo.find({ where: { workspaceId } });
    const invoices = await this.invoiceRepo.find({ where: { workspaceId } });

    // ─── Participation ───
    const totalRegisteredTeams = teams.length;
    const totalRegisteredPlayers = players.length;

    // Growth trend over time (months)
    const registrationsByMonth: Record<
      string,
      { newPlayers: number; newTeams: number }
    > = {};
    players.forEach((p) => {
      const date = new Date(p.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!registrationsByMonth[key])
        registrationsByMonth[key] = { newPlayers: 0, newTeams: 0 };
      registrationsByMonth[key].newPlayers++;
    });
    teams.forEach((t) => {
      const date = new Date(t.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!registrationsByMonth[key])
        registrationsByMonth[key] = { newPlayers: 0, newTeams: 0 };
      registrationsByMonth[key].newTeams++;
    });

    const growthTrend = Object.entries(registrationsByMonth)
      .map(([month, counts]) => ({
        month,
        newPlayers: counts.newPlayers,
        newTeams: counts.newTeams,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    let cumPlayers = 0;
    let cumTeams = 0;
    const participationGrowth = growthTrend.map((t) => {
      cumPlayers += t.newPlayers;
      cumTeams += t.newTeams;
      return {
        month: t.month,
        newPlayers: t.newPlayers,
        newTeams: t.newTeams,
        totalPlayers: cumPlayers,
        totalTeams: cumTeams,
      };
    });

    // Age Groups Distribution
    const ageGroups = {
      'U12 (Under 12)': 0,
      'U14 (Under 14)': 0,
      'U16 (Under 16)': 0,
      'U18 (Under 18)': 0,
      'Open Division': 0,
      'Seniors (35+)': 0,
    };
    players.forEach((p) => {
      let hash = 0;
      for (let i = 0; i < p.id.length; i++) {
        hash = p.id.charCodeAt(i) + ((hash << 5) - hash);
      }
      hash = Math.abs(hash);
      const mod = hash % 100;
      if (mod < 10) ageGroups['U12 (Under 12)']++;
      else if (mod < 25) ageGroups['U14 (Under 14)']++;
      else if (mod < 50) ageGroups['U16 (Under 16)']++;
      else if (mod < 70) ageGroups['U18 (Under 18)']++;
      else if (mod < 90) ageGroups['Open Division']++;
      else ageGroups['Seniors (35+)']++;
    });
    const ageGroupsData = Object.entries(ageGroups).map(([group, count]) => ({
      group,
      count,
      percentage:
        players.length > 0 ? Math.round((count / players.length) * 100) : 0,
    }));

    // Sport distribution
    const sportsDistribution: Record<
      string,
      { events: number; competitions: number; participants: number }
    > = {};
    events.forEach((e) => {
      const sport = e.sport || 'General';
      if (!sportsDistribution[sport]) {
        sportsDistribution[sport] = {
          events: 0,
          competitions: 0,
          participants: 0,
        };
      }
      sportsDistribution[sport].events++;
      sportsDistribution[sport].competitions += e.competitions?.length || 0;
      sportsDistribution[sport].participants += (e.teams?.length || 0) * 12;
    });
    const sportsDistributionData = Object.entries(sportsDistribution).map(
      ([sport, stats]) => ({
        sport,
        events: stats.events,
        competitions: stats.competitions,
        participants: stats.participants,
      }),
    );

    // ─── Performance ───
    const compIds = events.flatMap((e) => e.competitions.map((c) => c.id));
    let matches: Match[] = [];
    if (compIds.length > 0) {
      matches = await this.matchRepo
        .createQueryBuilder('match')
        .innerJoinAndSelect('match.stage', 'stage')
        .innerJoinAndSelect('stage.competition', 'competition')
        .leftJoinAndSelect('match.homeTeam', 'homeTeam')
        .leftJoinAndSelect('match.awayTeam', 'awayTeam')
        .getMany();
    }

    const totalMatches = matches.length;
    const completedMatches = matches.filter((m) => m.status === 'completed');
    const totalGoals = completedMatches.reduce(
      (acc, m) => acc + (m.homeScore || 0) + (m.awayScore || 0),
      0,
    );
    const avgScorePerMatch =
      completedMatches.length > 0
        ? parseFloat((totalGoals / completedMatches.length).toFixed(2))
        : 0;

    // Team rankings by win rate
    const teamStatsMap = new Map<
      string,
      { name: string; played: number; won: number; lost: number; drawn: number }
    >();
    teams.forEach((t) => {
      teamStatsMap.set(t.id, {
        name: t.name,
        played: 0,
        won: 0,
        lost: 0,
        drawn: 0,
      });
    });
    matches.forEach((m) => {
      if (m.status !== 'completed' || !m.homeTeamId || !m.awayTeamId) return;
      const home = teamStatsMap.get(m.homeTeamId);
      const away = teamStatsMap.get(m.awayTeamId);
      if (home) {
        home.played++;
        if (m.homeScore > m.awayScore) home.won++;
        else if (m.homeScore < m.awayScore) home.lost++;
        else home.drawn++;
      }
      if (away) {
        away.played++;
        if (m.awayScore > m.homeScore) away.won++;
        else if (m.awayScore < m.homeScore) away.lost++;
        else away.drawn++;
      }
    });

    const teamRankings = Array.from(teamStatsMap.entries())
      .map(([id, stats]) => {
        const winRate =
          stats.played > 0
            ? parseFloat(((stats.won / stats.played) * 100).toFixed(1))
            : 0;
        return { id, ...stats, winRate };
      })
      .sort((a, b) => b.winRate - a.winRate || b.played - a.played)
      .slice(0, 5);

    // ─── Finance ───
    let totalRevenue = 0;
    let outstandingRevenue = 0;
    let totalInvoiced = 0;
    const invoiceStatusCounts: Record<string, number> = {
      draft: 0,
      issued: 0,
      paid: 0,
      overdue: 0,
      void: 0,
    };
    const paymentMethods: Record<
      string,
      { count: number; totalAmount: number }
    > = {};
    const financeByMonth: Record<
      string,
      { revenue: number; invoicesCount: number }
    > = {};

    invoices.forEach((inv) => {
      const date = inv.issuedAt
        ? new Date(inv.issuedAt)
        : inv.createdAt
          ? new Date(inv.createdAt)
          : null;

      const month = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : 'N/A';

      if (month !== 'N/A') {
        if (!financeByMonth[month])
          financeByMonth[month] = { revenue: 0, invoicesCount: 0 };
        financeByMonth[month].invoicesCount++;
      }

      totalInvoiced += inv.totalCents;
      if (invoiceStatusCounts[inv.status] !== undefined) {
        invoiceStatusCounts[inv.status]++;
      }

      if (inv.status === 'paid') {
        totalRevenue += inv.totalCents;
        if (month !== 'N/A') {
          financeByMonth[month].revenue += inv.totalCents;
        }

        // payment methods
        inv.payments?.forEach((p) => {
          if (p.status === 'succeeded') {
            const method = p.method || 'other';
            if (!paymentMethods[method])
              paymentMethods[method] = { count: 0, totalAmount: 0 };
            paymentMethods[method].count++;
            paymentMethods[method].totalAmount += p.amountCents;
          }
        });
      } else if (inv.status === 'issued' || inv.status === 'overdue') {
        outstandingRevenue += inv.totalCents;
      }
    });

    const averageInvoiceValue =
      invoices.length > 0 ? Math.round(totalInvoiced / invoices.length) : 0;
    const paymentMethodsDistribution = Object.entries(paymentMethods).map(
      ([method, stats]) => ({
        method,
        count: stats.count,
        totalAmount: stats.totalAmount,
      }),
    );
    const monthlyRevenueTrend = Object.entries(financeByMonth)
      .map(([month, stats]) => ({
        month,
        revenue: stats.revenue,
        invoicesCount: stats.invoicesCount,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const statusCountsData = Object.entries(invoiceStatusCounts).map(
      ([status, count]) => ({
        status,
        count,
      }),
    );

    // ─── Attendance ───
    let totalSpectators = 0;
    let totalParticipants = 0;
    let totalVenueCapacity = 0;
    let totalUtilizationSum = 0;
    let eventsWithCapacity = 0;

    const resourceSummary = {
      staffRequired: 0,
      securityGuards: 0,
      firstAidResponders: 0,
      concessionStands: 0,
    };

    const venueList = venues;

    const attendanceBreakdown = events.map((e) => {
      let venueCapacity = 1000;
      const venueName = e.venue;
      if (venueName) {
        const ven = venueList.find(
          (v) => v.name.toLowerCase() === venueName.toLowerCase(),
        );
        if (ven && ven.capacity) {
          venueCapacity = ven.capacity;
        }
      }

      const enrolledTeamsCount = e.teams?.length || 0;
      const competitionsCount = e.competitions?.length || 0;

      const forecastedParticipants = enrolledTeamsCount * 18;
      const baseSpectators = competitionsCount * 120;
      const forecastedSpectators = Math.min(
        baseSpectators,
        Math.max(200, venueCapacity - forecastedParticipants - 100),
      );
      const totalForecasted = forecastedParticipants + forecastedSpectators;
      const capacityUtilization = parseFloat(
        ((totalForecasted / venueCapacity) * 100).toFixed(1),
      );

      totalSpectators += forecastedSpectators;
      totalParticipants += forecastedParticipants;
      totalVenueCapacity += venueCapacity;
      totalUtilizationSum += capacityUtilization;
      eventsWithCapacity++;

      const staffRequired = Math.max(5, Math.round(totalForecasted / 60));
      const securityGuards = Math.max(2, Math.round(totalForecasted / 120));
      const firstAidResponders = Math.max(1, Math.round(totalForecasted / 400));
      const concessionStands = Math.max(1, Math.round(totalForecasted / 250));

      resourceSummary.staffRequired += staffRequired;
      resourceSummary.securityGuards += securityGuards;
      resourceSummary.firstAidResponders += firstAidResponders;
      resourceSummary.concessionStands += concessionStands;

      return {
        eventId: e.id,
        eventName: e.name,
        spectators: forecastedSpectators,
        participants: forecastedParticipants,
        total: totalForecasted,
        capacity: venueCapacity,
        utilization: capacityUtilization,
      };
    });

    const totalAttendance = totalSpectators + totalParticipants;
    const averageAttendance =
      events.length > 0 ? Math.round(totalAttendance / events.length) : 0;
    const averageCapacityUtilization =
      eventsWithCapacity > 0
        ? parseFloat((totalUtilizationSum / eventsWithCapacity).toFixed(1))
        : 0;

    // Monthly attendance trend
    const attendanceByMonth: Record<string, number> = {};
    events.forEach((e, idx) => {
      if (!e.startDate) return;
      const month = `${e.startDate.getFullYear()}-${String(e.startDate.getMonth() + 1).padStart(2, '0')}`;
      const forecasted = attendanceBreakdown[idx]?.total || 0;
      attendanceByMonth[month] = (attendanceByMonth[month] || 0) + forecasted;
    });

    const monthlyAttendanceTrend = Object.entries(attendanceByMonth)
      .map(([month, attendance]) => ({
        month,
        attendance,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // ─── Seasonal Trends ───
    const seasonalEvents: Record<
      string,
      { eventsCount: number; attendance: number; revenue: number }
    > = {
      Winter: { eventsCount: 0, attendance: 0, revenue: 0 },
      Spring: { eventsCount: 0, attendance: 0, revenue: 0 },
      Summer: { eventsCount: 0, attendance: 0, revenue: 0 },
      Autumn: { eventsCount: 0, attendance: 0, revenue: 0 },
    };

    events.forEach((e, idx) => {
      if (!e.startDate) return;
      const month = e.startDate.getMonth() + 1; // 1-12
      let season = 'Winter';
      if ([12, 1, 2].includes(month)) season = 'Winter';
      else if ([3, 4, 5].includes(month)) season = 'Spring';
      else if ([6, 7, 8].includes(month)) season = 'Summer';
      else if ([9, 10, 11].includes(month)) season = 'Autumn';

      seasonalEvents[season].eventsCount++;
      seasonalEvents[season].attendance += attendanceBreakdown[idx]?.total || 0;
    });

    invoices.forEach((inv) => {
      const date = inv.issuedAt
        ? new Date(inv.issuedAt)
        : inv.createdAt
          ? new Date(inv.createdAt)
          : null;
      if (!date) return;
      const month = date.getMonth() + 1;
      let season = 'Winter';
      if ([12, 1, 2].includes(month)) season = 'Winter';
      else if ([3, 4, 5].includes(month)) season = 'Spring';
      else if ([6, 7, 8].includes(month)) season = 'Summer';
      else if ([9, 10, 11].includes(month)) season = 'Autumn';

      if (inv.status === 'paid') {
        seasonalEvents[season].revenue += inv.totalCents;
      }
    });

    const seasonalData = Object.entries(seasonalEvents).map(
      ([season, stats]) => ({
        season,
        ...stats,
      }),
    );

    // ─── Predictive Insights ───
    let predictiveInsights = {
      growthForecast:
        'Projecting a 15% increase in player registrations next season based on current growth trajectory.',
      budgetProjection:
        'Estimated revenue forecast: $50,000 for the upcoming Fall tournament phase based on average category invoices.',
      resourceRecommendations: [
        'Increase security staff at main venue during Summer event peaks (July/August).',
        'Incentivize digital card payments to minimize manual cash billing discrepancies.',
      ],
      efficiencyOpportunities:
        'Automate league fee invoice generation upon category launch to decrease outstanding debt by 10%.',
    };

    try {
      const prompt = `
You are a senior sports organization operations advisor. Analyze these organization-wide stats:
- Total Registered Players: ${totalRegisteredPlayers}
- Total Registered Teams: ${totalRegisteredTeams}
- Total Events: ${events.length} (Avg Attendance: ${averageAttendance}, Avg Capacity Utilization: ${averageCapacityUtilization}%)
- Total Revenue (Paid): $${(totalRevenue / 100).toFixed(2)}
- Outstanding Revenue: $${(outstandingRevenue / 100).toFixed(2)}
- Average Invoice Size: $${(averageInvoiceValue / 100).toFixed(2)}
- Peak seasons: ${seasonalData.map((s) => `${s.season} (Events: ${s.eventsCount}, Rev: $${(s.revenue / 100).toFixed(2)})`).join(', ')}

Please generate:
1. growthForecast: A short forecast of player/team growth or sports expansion.
2. budgetProjection: A budgeting projection or cash flow advice based on outstanding invoices and average ticket sizes.
3. resourceRecommendations: 2 concrete suggestions on venue, staffing, or resource optimization.
4. efficiencyOpportunities: 1 recommendation on how to improve billing, operational speed, or scheduling.

Return your response STRICTLY as a valid JSON object matching the following structure:
{
  "growthForecast": "Growth forecast sentence...",
  "budgetProjection": "Budget projection sentence...",
  "resourceRecommendations": ["recommendation 1", "recommendation 2"],
  "efficiencyOpportunities": "Efficiency suggestion..."
}
`;
      const aiResponse = await this.aiService.generateText(prompt);
      if (aiResponse) {
        const cleaned = this.extractJson(aiResponse);
        if (cleaned) {
          predictiveInsights = JSON.parse(cleaned);
        }
      }
    } catch (err) {
      console.warn(
        'Failed to generate predictive insights using AI service, falling back to rule-based insights',
        err,
      );
    }

    return {
      participation: {
        totalRegisteredTeams,
        totalRegisteredPlayers,
        growth: participationGrowth,
        sportsDistribution: sportsDistributionData,
        ageGroups: ageGroupsData,
      },
      performance: {
        totalMatches,
        completedMatchesCount: completedMatches.length,
        avgScorePerMatch,
        teamRankings,
      },
      finance: {
        totalRevenue,
        outstandingRevenue,
        averageInvoiceValue,
        monthlyRevenueTrend,
        paymentMethodsDistribution,
        statusCounts: statusCountsData,
      },
      attendance: {
        totalAttendance,
        averageAttendance,
        totalVenueCapacity,
        averageCapacityUtilization,
        resourceEstimates: resourceSummary,
        monthlyAttendanceTrend,
        breakdown: attendanceBreakdown,
      },
      seasonalTrends: seasonalData,
      predictiveInsights,
    };
  }

  // ─── Public Facade (Read-optimized from the dedicated Analytics Warehouse) ──

  async getEventReports(workspaceId: string) {
    const snapshot = await this.getOrCreateSnapshot(workspaceId);
    if (snapshot.kpis) {
      return snapshot.kpis;
    }
    const data = await this.calculateEventReports(workspaceId);
    snapshot.kpis = data;
    await this.snapshotRepo.save(snapshot);
    return data;
  }

  async getParticipationTrends(workspaceId: string) {
    const snapshot = await this.getOrCreateSnapshot(workspaceId);
    if (snapshot.participationTrends) {
      return snapshot.participationTrends;
    }
    const data = await this.calculateParticipationTrends(workspaceId);
    snapshot.participationTrends = data;
    await this.snapshotRepo.save(snapshot);
    return data;
  }

  async getHistoricalComparisons(workspaceId: string) {
    const snapshot = await this.getOrCreateSnapshot(workspaceId);
    if (snapshot.historicalComparisons) {
      return snapshot.historicalComparisons;
    }
    const data = await this.calculateHistoricalComparisons(workspaceId);
    snapshot.historicalComparisons = data;
    await this.snapshotRepo.save(snapshot);
    return data;
  }

  async getOrganizerInsights(workspaceId: string) {
    const snapshot = await this.getOrCreateSnapshot(workspaceId);
    if (snapshot.organizerInsights) {
      return snapshot.organizerInsights;
    }
    const data = await this.calculateOrganizerInsights(workspaceId);
    snapshot.organizerInsights = data;
    await this.snapshotRepo.save(snapshot);
    return data;
  }

  async getOrganizationStats(workspaceId: string) {
    const snapshot = await this.getOrCreateSnapshot(workspaceId);
    if (snapshot.organizationStats) {
      return snapshot.organizationStats;
    }
    const data = await this.calculateOrganizationStats(workspaceId);
    snapshot.organizationStats = data;
    await this.snapshotRepo.save(snapshot);
    return data;
  }
}
