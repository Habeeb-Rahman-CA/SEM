import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { Role } from './entities/role.entity';
import { Team } from '../teams/entities/team.entity';
import { Player } from '../players/entities/player.entity';
import { Event } from '../events/entities/event.entity';
import { Sport } from './entities/sport.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { CompetitionStage } from '../competitions/entities/competition-stage.entity';
import { Match } from '../competitions/entities/match.entity';
import { CompetitionTeam } from '../competitions/entities/competition-team.entity';
import { Permission } from './entities/permission.entity';
import { Venue } from '../venues/entities/venue.entity';
import { Notification } from './entities/notification.entity';
import { MatchPlayer } from '../players/entities/match-player.entity';
import { AuditLog } from './entities/audit-log.entity';
import { SystemConfig } from './entities/system-config.entity';
import { WorkspaceFile } from './entities/workspace-file.entity';
import { WorkspaceFileVersion } from './entities/workspace-file-version.entity';
import { EventTemplate } from '../events/entities/event-template.entity';
import { CompetitionTemplate } from '../competitions/entities/competition-template.entity';
import { FixtureTemplate } from '../competitions/entities/fixture-template.entity';
import { WorkspaceAnalyticsSnapshot } from './entities/workspace-analytics-snapshot.entity';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { SystemSettingsController } from './system-settings.controller';
import { FilesController } from './files/files.controller';
import { FilesService } from './files/files.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { UsersModule } from '../users/users.module';
import { UploadModule } from '../upload/upload.module';
import { EventsGateway } from './events.gateway';
import { SearchModule } from '../search/search.module';
import { CommerceConfigModule } from '../commerce-config/commerce-config.module';
import { AiModule } from '../ai/ai.module';

// Extracted Domain Services
import { NotificationsService } from './notifications/notifications.service';
import { EmailService } from '../../integrations/email/email.service';
import { AuditLogsService } from './audit-logs/audit-logs.service';
import { SystemConfigService } from './system-config/system-config.service';
import { RolesPermissionsService } from './roles-permissions/roles-permissions.service';
import { WorkspaceMembersService } from './members/members.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      WorkspaceMember,
      Role,
      Team,
      Player,
      Event,
      Sport,
      Competition,
      CompetitionStage,
      Match,
      CompetitionTeam,
      Permission,
      Venue,
      Notification,
      MatchPlayer,
      AuditLog,
      SystemConfig,
      WorkspaceFile,
      WorkspaceFileVersion,
      EventTemplate,
      CompetitionTemplate,
      FixtureTemplate,
      WorkspaceAnalyticsSnapshot,
    ]),
    UsersModule,
    UploadModule,
    forwardRef(() => SearchModule),
    CommerceConfigModule,
    AiModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>(
          'JWT_SECRET',
          'super-secret-key-12345',
        ),
        signOptions: {
          expiresIn: configService.get<any>('JWT_EXPIRATION', '24h'),
        },
      }),
    }),
  ],
  controllers: [
    WorkspacesController,
    SystemSettingsController,
    FilesController,
    AnalyticsController,
  ],
  providers: [
    WorkspacesService,
    EventsGateway,
    NotificationsService,
    EmailService,
    AuditLogsService,
    SystemConfigService,
    RolesPermissionsService,
    WorkspaceMembersService,
    FilesService,
    AnalyticsService,
  ],
  exports: [
    WorkspacesService,
    EventsGateway,
    NotificationsService,
    EmailService,
    AuditLogsService,
    SystemConfigService,
    RolesPermissionsService,
    WorkspaceMembersService,
  ],
})
export class WorkspacesModule {}
