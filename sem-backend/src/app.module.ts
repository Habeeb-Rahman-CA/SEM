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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'sem_db'),
        autoLoadEntities: true,
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
      }),
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Register as a global filter via DI so ErrorLoggerService is injected
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
