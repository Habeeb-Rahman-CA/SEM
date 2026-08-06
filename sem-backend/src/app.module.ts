import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { UploadModule } from './modules/upload/upload.module';
import { VenuesModule } from './modules/venues/venues.module';
import { TeamsModule } from './modules/teams/teams.module';
import { PlayersModule } from './modules/players/players.module';
import { EventsModule } from './modules/events/events.module';
import { CompetitionsModule } from './modules/competitions/competitions.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { ShareModule } from './modules/share/share.module';
import { SeoModule } from './modules/seo/seo.module';
import { CommerceConfigModule } from './modules/commerce-config/commerce-config.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { BillingModule } from './modules/billing/billing.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SponsorsModule } from './modules/sponsors/sponsors.module';
import { AdvertisementsModule } from './modules/advertisements/advertisements.module';
import { BrandingModule } from './modules/branding/branding.module';
import { LicensingModule } from './modules/licensing/licensing.module';
import { SearchModule } from './modules/search/search.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingModule } from './shared/logger/logging.module';
import { MonitoringModule } from './shared/monitoring/monitoring.module';
import { BackupModule } from './jobs/cron/backup/backup.module';
import { RecoveryModule } from './common/recovery/recovery.module';
import { AiModule } from './modules/ai/ai.module';
import { VolunteersModule } from './modules/volunteers/volunteers.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { MedicalModule } from './modules/medical/medical.module';
import { AccreditationModule } from './modules/accreditation/accreditation.module';
import { StreamingModule } from './modules/streaming/streaming.module';
import { AutomationModule } from './modules/automation/automation.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { RostersModule } from './modules/rosters/rosters.module';
import { FinanceModule } from './modules/finance/finance.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { TeamAlertsModule } from './modules/team-alerts/team-alerts.module';
import { BootstrapModule } from './modules/bootstrap/bootstrap.module';
import { CacheModule } from './common/cache/cache.module';
import { ActivityTimelineModule } from './modules/activity-timeline/activity-timeline.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { TrashModule } from './modules/trash/trash.module';
import { DraftsModule } from './modules/drafts/drafts.module';
import { SavedFiltersModule } from './modules/saved-filters/saved-filters.module';
import { CustomDashboardModule } from './modules/custom-dashboard/custom-dashboard.module';
import { NotificationCenterModule } from './modules/notification-center/notification-center.module';
import { VersionHistoryModule } from './modules/version-history/version-history.module';
import { DynamicFormsModule } from './modules/dynamic-forms/dynamic-forms.module';
import { WorkflowBuilderModule } from './modules/workflow-builder/workflow-builder.module';
import { RealtimeModule } from './common/realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const slowMs = configService.get<number>('DB_SLOW_QUERY_MS', 500);
        // Lazy-load so unit tests without the file still boot cleanly

        const { SlowQueryLogger } = require('./common/db/slow-query.logger');
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_DATABASE', 'sem_db'),
          autoLoadEntities: true,
          synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
          // ── Slow-query logging ────────────────────────────────────
          // TypeORM emits a warn to `logger` for any query exceeding
          // maxQueryExecutionTime. Our custom logger formats it and
          // stays silent otherwise, keeping log volume manageable.
          maxQueryExecutionTime: slowMs,
          logger: new SlowQueryLogger(
            slowMs,
            configService.get<boolean>('DB_VERBOSE_LOG', false),
          ),
          logging: ['error', 'schema', 'warn', 'migration'],
          // ── Connection pool tuning ────────────────────────────────
          // pg driver defaults are conservative (max 10). Bump to match
          // typical Nest worker concurrency; idleTimeout closes cold
          // sockets and connectionTimeout fast-fails when the pool is
          // exhausted so callers get a real error rather than hanging.
          extra: {
            max: configService.get<number>('DB_POOL_MAX', 20),
            min: configService.get<number>('DB_POOL_MIN', 2),
            idleTimeoutMillis: configService.get<number>(
              'DB_POOL_IDLE_MS',
              30_000,
            ),
            connectionTimeoutMillis: configService.get<number>(
              'DB_POOL_CONNECTION_TIMEOUT_MS',
              10_000,
            ),
            statement_timeout: configService.get<number>(
              'DB_STATEMENT_TIMEOUT_MS',
              30_000,
            ),
          },
        };
      },
    }),
    ScheduleModule.forRoot(),
    TerminusModule,
    UsersModule,
    AuthModule,
    WorkspacesModule,
    UploadModule,
    VenuesModule,
    TeamsModule,
    PlayersModule,
    EventsModule,
    CompetitionsModule,
    GalleryModule,
    ShareModule,
    SeoModule,
    CommerceConfigModule,
    SubscriptionsModule,
    BillingModule,
    PaymentsModule,
    SponsorsModule,
    AdvertisementsModule,
    BrandingModule,
    LicensingModule,
    SearchModule,
    LoggingModule,
    MonitoringModule,
    BackupModule,
    RecoveryModule,
    AiModule,
    VolunteersModule,
    EquipmentModule,
    MedicalModule,
    AccreditationModule,
    StreamingModule,
    AutomationModule,
    AuctionsModule,
    TransfersModule,
    RostersModule,
    FinanceModule,
    PoliciesModule,
    TeamAlertsModule,
    BootstrapModule,
    CacheModule,
    RealtimeModule,
    CertificatesModule,
    ActivityTimelineModule,
    TrashModule,
    DraftsModule,
    SavedFiltersModule,
    CustomDashboardModule,
    NotificationCenterModule,
    VersionHistoryModule,
    DynamicFormsModule,
    WorkflowBuilderModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Register as a global filter via DI so ErrorLoggerService is injected
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
