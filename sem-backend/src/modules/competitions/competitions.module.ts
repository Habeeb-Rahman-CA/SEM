import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competition } from './entities/competition.entity';
import { CompetitionStage } from './entities/competition-stage.entity';
import { Match } from './entities/match.entity';
import { MatchPlayer } from '../players/entities/match-player.entity';
import { CompetitionTeam } from './entities/competition-team.entity';
import { Sport } from '../workspaces/entities/sport.entity';
import { Event } from '../events/entities/event.entity';
import { Team } from '../teams/entities/team.entity';
import { Player } from '../players/entities/player.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { Venue } from '../venues/entities/venue.entity';
import { CompetitionsService } from './competitions.service';
import { CompetitionsController } from './competitions.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { FixturesGeneratorService } from './services/fixtures-generator.service';
import { MatchLineupService } from './services/match-lineup.service';
import { StatisticsRatingsService } from './services/statistics-ratings.service';
import { BracketAdvancementService } from './services/bracket-advancement.service';
import { CompetitionRankingsService } from './services/competition-rankings.service';
import { MatchGenerationService } from './services/match-generation.service';
import { CompetitionCompletionService } from './services/competition-completion.service';
import { SportEngineRegistry } from './sports/sport-engine.registry';
import { MatchLockService } from './services/match-lock.service';
import { CompetitionTemplatesService } from './services/competition-templates.service';
import { FixtureTemplatesService } from './services/fixture-templates.service';
import { AiSummaryService } from './services/ai-summary.service';
import { CompetitionPredictionsService } from './services/competition-predictions.service';
import {
  CompetitionTemplatesController,
  FixtureTemplatesController,
} from './competition-fixture-templates.controller';
import { CompetitionTemplate } from './entities/competition-template.entity';
import { FixtureTemplate } from './entities/fixture-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Competition,
      CompetitionStage,
      Match,
      MatchPlayer,
      CompetitionTeam,
      Sport,
      Event,
      Team,
      Player,
      Workspace,
      WorkspaceMember,
      Venue,
      CompetitionTemplate,
      FixtureTemplate,
    ]),
    WorkspacesModule,
  ],
  controllers: [
    CompetitionsController,
    CompetitionTemplatesController,
    FixtureTemplatesController,
  ],
  providers: [
    CompetitionsService,
    FixturesGeneratorService,
    MatchLineupService,
    StatisticsRatingsService,
    BracketAdvancementService,
    CompetitionRankingsService,
    MatchGenerationService,
    CompetitionCompletionService,
    SportEngineRegistry,
    MatchLockService,
    CompetitionTemplatesService,
    FixtureTemplatesService,
    AiSummaryService,
    CompetitionPredictionsService,
  ],
  exports: [
    CompetitionsService,
    FixturesGeneratorService,
    MatchLineupService,
    StatisticsRatingsService,
    BracketAdvancementService,
    CompetitionRankingsService,
    MatchGenerationService,
    CompetitionCompletionService,
    SportEngineRegistry,
    MatchLockService,
    CompetitionTemplatesService,
    FixtureTemplatesService,
    AiSummaryService,
    CompetitionPredictionsService,
  ],
})
export class CompetitionsModule {}
