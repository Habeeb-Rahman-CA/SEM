import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Notification,
  NotificationType,
  NOTIFICATION_ICONS,
} from '../entities/notification.entity';
import { Workspace } from '../entities/workspace.entity';
import { Match } from '../../competitions/entities/match.entity';
import { Player } from '../../players/entities/player.entity';
import { EventsGateway } from '../events.gateway';
import { UsersService } from '../../users/users.service';
import { EmailService } from '../../../integrations/email/email.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    private readonly eventsGateway: EventsGateway,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markNotificationsRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  /**
   * Send a single notification to one user.
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    message: string,
    workspaceId?: string | null,
    metadata?: Record<string, any> | null,
  ): Promise<void> {
    const notification = this.notificationRepo.create({
      userId,
      type,
      message,
      icon: NOTIFICATION_ICONS[type] || null,
      workspaceId: workspaceId ?? null,
      metadata: metadata ?? null,
    });
    const saved = await this.notificationRepo.save(notification);
    this.eventsGateway.sendNotification(userId, saved);

    // Asynchronously send corresponding email notification
    this.triggerEmailNotification(
      userId,
      type,
      message,
      workspaceId,
      metadata,
    ).catch((err) => {
      this.logger.error(
        `Failed to trigger email notification: ${err.message}`,
        err.stack,
      );
    });
  }

  /**
   * Send the same notification to multiple users at once.
   */
  async sendNotificationToMany(
    userIds: string[],
    type: NotificationType,
    message: string,
    workspaceId?: string | null,
    metadata?: Record<string, any> | null,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const uniqueIds = [...new Set(userIds)];
    const notifications = uniqueIds.map((uid) =>
      this.notificationRepo.create({
        userId: uid,
        type,
        message,
        icon: NOTIFICATION_ICONS[type] || null,
        workspaceId: workspaceId ?? null,
        metadata: metadata ?? null,
      }),
    );
    const saved = await this.notificationRepo.save(notifications);
    for (const notification of saved) {
      this.eventsGateway.sendNotification(notification.userId, notification);
    }

    // Asynchronously send email notifications to all recipients
    for (const uid of uniqueIds) {
      this.triggerEmailNotification(
        uid,
        type,
        message,
        workspaceId,
        metadata,
      ).catch((err) => {
        this.logger.error(
          `Failed to trigger email notification: ${err.message}`,
          err.stack,
        );
      });
    }
  }

  /**
   * Helper to resolve templates and send email notifications
   */
  private async triggerEmailNotification(
    userId: string,
    type: NotificationType,
    message: string,
    workspaceId?: string | null,
    metadata?: Record<string, any> | null,
  ): Promise<void> {
    // 1. Fetch recipient user details
    const user = await this.usersService.findOneById(userId);
    if (!user || !user.username) return;

    // Check if username is an email address, or fallback
    const email = user.username.includes('@')
      ? user.username
      : `${user.username}@sem-event.com`;

    // 2. Fetch workspace branding
    let workspaceName = 'Sports Event Management';
    let logoUrl: string | null = null;
    if (workspaceId) {
      const ws = await this.workspaceRepo.findOne({
        where: { id: workspaceId },
      });
      if (ws) {
        workspaceName = ws.name;
        logoUrl = ws.logoUrl;
      }
    }

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200',
    );
    const viewUrl = `${frontendUrl}${workspaceId ? `/public/events/${metadata?.eventId ?? ''}` : ''}`;

    // 3. Match type to email template
    switch (type) {
      case NotificationType.TEAM_ADDED_TO_COMPETITION:
        await this.emailService.sendRegistrationEmail(
          email,
          workspaceName,
          logoUrl,
          metadata?.teamName || 'Your Team',
          metadata?.competitionName || 'Competition',
          viewUrl,
        );
        break;

      case NotificationType.FIXTURES_GENERATED:
        await this.emailService.sendFixtureReleaseEmail(
          email,
          workspaceName,
          logoUrl,
          'League Stage',
          metadata?.competitionName || 'Competition',
          metadata?.competitionName || 'Event',
          viewUrl,
        );
        break;

      case NotificationType.MATCH_SCHEDULED:
        await this.emailService.sendScheduleUpdateEmail(
          email,
          workspaceName,
          logoUrl,
          metadata?.homeTeamName || 'Home Team',
          metadata?.awayTeamName || 'Away Team',
          metadata?.scheduledAt
            ? new Date(metadata.scheduledAt).toLocaleString()
            : 'TBD',
          metadata?.venueName || 'Venue TBD',
          metadata?.competitionName || 'Competition',
          metadata?.competitionName || 'Event',
          viewUrl,
        );
        break;

      case NotificationType.EVENT_CANCELLED:
        await this.emailService.sendCancellationEmail(
          email,
          workspaceName,
          logoUrl,
          metadata?.eventName || 'Event Match',
          metadata?.reason || 'Event cancelled by organizer.',
          metadata?.eventName || 'Event',
        );
        break;

      case NotificationType.EVENT_COMPLETED:
      case NotificationType.COMPETITION_COMPLETED:
        await this.emailService.sendEventCompletionEmail(
          email,
          workspaceName,
          logoUrl,
          metadata?.competitionName || 'Tournament',
          metadata?.championName || 'Winner',
          metadata?.runnerUpName || 'Runner Up',
          viewUrl,
        );
        break;

      case NotificationType.MATCH_STARTED:
        await this.emailService.sendMatchStartEmail(
          email,
          workspaceName,
          logoUrl,
          metadata?.homeTeamName || 'Home Team',
          metadata?.awayTeamName || 'Away Team',
          viewUrl,
        );
        break;

      case NotificationType.MATCH_COMPLETED:
        await this.emailService.sendMatchResultEmail(
          email,
          workspaceName,
          logoUrl,
          metadata?.homeTeamName || 'Home Team',
          metadata?.awayTeamName || 'Away Team',
          metadata?.homeScore ?? 0,
          metadata?.awayScore ?? 0,
          viewUrl,
        );
        break;

      case NotificationType.MATCH_DELAYED:
        await this.emailService.sendMatchDelayEmail(
          email,
          workspaceName,
          logoUrl,
          metadata?.homeTeamName || 'Home Team',
          metadata?.awayTeamName || 'Away Team',
          metadata?.scheduledAt
            ? new Date(metadata.scheduledAt).toLocaleString()
            : 'TBD',
          viewUrl,
        );
        break;

      case NotificationType.MATCH_VENUE_CHANGED:
        await this.emailService.sendVenueChangeEmail(
          email,
          workspaceName,
          logoUrl,
          metadata?.homeTeamName || 'Home Team',
          metadata?.awayTeamName || 'Away Team',
          metadata?.venueName || 'Venue TBD',
          viewUrl,
        );
        break;

      default:
        break;
    }
  }

  /**
   * Cron Job: Send match reminders to players 24 hours prior to scheduled start
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendMatchReminders(): Promise<void> {
    this.logger.log('Scanning for upcoming matches to send reminders...');
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingMatches = await this.matchRepo.find({
      where: {
        status: 'scheduled',
        scheduledAt: Between(now, tomorrow),
      },
      relations: {
        homeTeam: true,
        awayTeam: true,
        venue: true,
        stage: {
          competition: {
            event: true,
          },
        },
      },
    });

    for (const match of upcomingMatches) {
      if (!match.homeTeamId || !match.awayTeamId) continue;

      const event = match.stage?.competition?.event;
      const workspaceId = event?.workspaceId;

      // Get workspace details for branding
      let workspaceName = 'Sports Event Management';
      let logoUrl: string | null = null;
      if (workspaceId) {
        const ws = await this.workspaceRepo.findOne({
          where: { id: workspaceId },
        });
        if (ws) {
          workspaceName = ws.name;
          logoUrl = ws.logoUrl;
        }
      }

      // Check if we already sent a reminder notification for this match
      const existing = await this.notificationRepo.find({
        where: { workspaceId: workspaceId ? workspaceId : IsNull() },
      });
      const alreadyReminded = existing.some(
        (n) =>
          n.metadata?.matchId === match.id && n.metadata?.isReminder === true,
      );
      if (alreadyReminded) continue;

      // Fetch player user IDs for home and away teams
      const homePlayers = await this.playerRepo.find({
        where: { teamId: match.homeTeamId },
        select: { userId: true },
      });
      const awayPlayers = await this.playerRepo.find({
        where: { teamId: match.awayTeamId },
        select: { userId: true },
      });
      const homeUserIds = homePlayers.map((p) => p.userId).filter(Boolean);
      const awayUserIds = awayPlayers.map((p) => p.userId).filter(Boolean);
      const allPlayerIds = [...new Set([...homeUserIds, ...awayUserIds])];

      const matchTimeStr = match.scheduledAt
        ? match.scheduledAt.toLocaleString()
        : 'TBD';
      const venueName = match.venue?.name || 'TBD';
      const compName = match.stage?.competition?.name || 'Competition';
      const eventName = event?.name || 'Event';
      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:4200',
      );
      const viewUrl = `${frontendUrl}${event ? `/public/events/${event.id}` : ''}`;

      for (const userId of allPlayerIds) {
        const user = await this.usersService.findOneById(userId);
        if (!user || !user.username) continue;
        const email = user.username.includes('@')
          ? user.username
          : `${user.username}@sem-event.com`;

        // Send email reminder
        await this.emailService.sendReminderEmail(
          email,
          workspaceName,
          logoUrl,
          match.homeTeam?.name || 'Home Team',
          match.awayTeam?.name || 'Away Team',
          matchTimeStr,
          venueName,
          compName,
          eventName,
          viewUrl,
        );

        // Save in-app notification tracking
        const notification = this.notificationRepo.create({
          userId,
          type: NotificationType.WELCOME,
          message: `Match reminder: ${match.homeTeam?.name || 'Home'} vs ${match.awayTeam?.name || 'Away'} is scheduled for ${matchTimeStr}.`,
          icon: '📅',
          workspaceId: workspaceId || null,
          metadata: { matchId: match.id, isReminder: true },
        });
        await this.notificationRepo.save(notification);
      }
    }
  }
}
