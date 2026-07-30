import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competition } from '../workspaces/entities/competition.entity';
import { CompetitionStage } from '../workspaces/entities/competition-stage.entity';
import { Match } from '../workspaces/entities/match.entity';
import { MatchPlayer } from '../workspaces/entities/match-player.entity';
import { CompetitionTeam } from '../workspaces/entities/competition-team.entity';
import { Sport } from '../workspaces/entities/sport.entity';
import { Event } from '../workspaces/entities/event.entity';
import { Team } from '../workspaces/entities/team.entity';
import { Player } from '../workspaces/entities/player.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { Venue } from '../workspaces/entities/venue.entity';
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
import {
  CompetitionTemplatesController,
  FixtureTemplatesController,
} from './competition-fixture-templates.controller';
import { CompetitionTemplate } from '../workspaces/entities/competition-template.entity';
import { FixtureTemplate } from '../workspaces/entities/fixture-template.entity';

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
  ],
})
export class CompetitionsModule {}
