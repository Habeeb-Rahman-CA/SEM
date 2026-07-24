import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competition } from '../../workspaces/entities/competition.entity';
import { Match } from '../../workspaces/entities/match.entity';
import { CompetitionTeam } from '../../workspaces/entities/competition-team.entity';
import { Team } from '../../workspaces/entities/team.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { NotificationType } from '../../workspaces/entities/notification.entity';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { StatisticsRatingsService } from './statistics-ratings.service';
import { CompetitionRankingsService } from './competition-rankings.service';

@Injectable()
export class CompetitionCompletionService {
  constructor(
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(CompetitionTeam)
    private readonly competitionTeamRepo: Repository<CompetitionTeam>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    private readonly workspacesService: WorkspacesService,
    private readonly statisticsRatingsService: StatisticsRatingsService,
    private readonly competitionRankingsService: CompetitionRankingsService,
  ) {}

  async checkAndAutoCompleteCompetition(competitionId: string): Promise<void> {
    const comp = await this.competitionRepo.findOne({
      where: { id: competitionId },
      relations: { stages: true, event: true },
    });
    if (!comp || comp.stages.length === 0) return;

    const sortedStages = [...comp.stages].sort(
      (a, b) => a.sequence - b.sequence,
    );
    const lastStage = sortedStages[sortedStages.length - 1];

    const matches = await this.matchRepo.find({
      where: { stageId: lastStage.id },
    });
    if (matches && matches.length > 0) {
      const allCompleted = matches.every((m: any) => m.status === 'completed');
      if (allCompleted && comp.status !== 'completed') {
        comp.status = 'completed';
        const savedComp = await this.competitionRepo.save(comp);
        const workspaceId = comp.event.workspaceId;

        const compTeams = await this.competitionTeamRepo.find({
          where: { competitionId },
        });
        const teamIds = compTeams.map((ct) => ct.teamId);
        const allCompetingPlayers =
          await this.workspacesService.getTeamsPlayerUserIds(teamIds);
        await this.workspacesService.sendNotificationToMany(
          allCompetingPlayers,
          NotificationType.COMPETITION_COMPLETED,
          `Competition "${savedComp.name}" has been completed!`,
          workspaceId,
          { competitionId, competitionName: savedComp.name },
        );

        try {
          const rankings = await this.competitionRankingsService.getCompetitionRankings(competitionId);
          let championTeamId: string | null = null;
          let runnerUpTeamId: string | null = null;
          for (const [tId, pos] of rankings.entries()) {
            if (pos === 1) championTeamId = tId;
            if (pos === 2) runnerUpTeamId = tId;
          }

          if (championTeamId) {
            const championTeam = await this.teamRepo.findOne({
              where: { id: championTeamId },
            });
            if (championTeam) {
              const memberIds =
                await this.workspacesService.getWorkspaceMemberUserIds(
                  workspaceId,
                );
              await this.workspacesService.sendNotificationToMany(
                memberIds,
                NotificationType.COMPETITION_CHAMPION_ANNOUNCEMENT,
                `🥇 ${championTeam.name} has won the ${savedComp.name} competition!`,
                workspaceId,
                {
                  competitionId,
                  competitionName: savedComp.name,
                  championTeamId,
                  championTeamName: championTeam.name,
                },
              );

              const winningPlayers =
                await this.workspacesService.getTeamPlayerUserIds(
                  championTeamId,
                );
              await this.workspacesService.sendNotificationToMany(
                winningPlayers,
                NotificationType.COMPETITION_CHAMPION,
                `🥇 Congratulations! Your team ${championTeam.name} won ${savedComp.name}!`,
                workspaceId,
                { competitionId, competitionName: savedComp.name },
              );
            }
          }

          if (runnerUpTeamId) {
            const runnerUpTeam = await this.teamRepo.findOne({
              where: { id: runnerUpTeamId },
            });
            if (runnerUpTeam) {
              const runnerUpPlayers =
                await this.workspacesService.getTeamPlayerUserIds(
                  runnerUpTeamId,
                );
              await this.workspacesService.sendNotificationToMany(
                runnerUpPlayers,
                NotificationType.COMPETITION_RUNNER_UP,
                `🥈 Great performance! Your team ${runnerUpTeam.name} finished as runner-up in ${savedComp.name}.`,
                workspaceId,
                { competitionId, competitionName: savedComp.name },
              );
            }
          }
        } catch (e) {
          // ignore rankings error
        }

        try {
          const workspace = await this.workspaceRepo.findOne({
            where: { id: workspaceId },
          });
          const ownerId = workspace?.ownerId ?? '';
          const bestPlayerData =
            await this.statisticsRatingsService.getCompetitionBestPlayer(
              workspaceId,
              comp.eventId,
              competitionId,
              ownerId,
            );
          if (bestPlayerData && bestPlayerData.bestPlayer) {
            const bestPlayer = bestPlayerData.bestPlayer;
            const playerName = bestPlayer.player?.user?.username ?? 'a player';
            const teamName = bestPlayer.team?.name ?? 'their team';
            const rating = bestPlayer.rating;

            await this.workspacesService.sendNotification(
              bestPlayer.player.userId,
              NotificationType.BEST_PLAYER_OF_TOURNAMENT,
              `⭐ You've been named the Best Player of ${savedComp.name} with a rating of ${rating}!`,
              workspaceId,
              { competitionId, competitionName: savedComp.name, rating },
            );

            const memberIds =
              await this.workspacesService.getWorkspaceMemberUserIds(
                workspaceId,
              );
            await this.workspacesService.sendNotificationToMany(
              memberIds,
              NotificationType.BEST_PLAYER_ANNOUNCEMENT,
              `⭐ ${playerName} (${teamName}) is the Best Player of ${savedComp.name}!`,
              workspaceId,
              {
                competitionId,
                competitionName: savedComp.name,
                playerId: bestPlayer.playerId,
                playerName,
                teamName,
                rating,
              },
            );
          }
        } catch (e) {
          // ignore best player error
        }
      }
    }
  }
}
