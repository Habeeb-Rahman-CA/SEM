import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';

/**
 * All notification types in the system.
 * Grouped by category for easier maintenance.
 */
export enum NotificationType {
  // ── Workspace Lifecycle ──────────────────────────────
  WORKSPACE_CREATED = 'workspace_created',
  WORKSPACE_UPDATED = 'workspace_updated',
  WORKSPACE_DELETED = 'workspace_deleted',

  // ── Membership & Invitation ──────────────────────────
  MEMBER_INVITED = 'member_invited',
  INVITATION_ACCEPTED = 'invitation_accepted',
  INVITATION_REJECTED = 'invitation_rejected',
  MEMBER_JOINED = 'member_joined',
  MEMBER_ROLE_CHANGED = 'member_role_changed',
  MEMBER_REMOVED = 'member_removed',
  BULK_IMPORT_USER = 'bulk_import_user',
  BULK_IMPORT_COMPLETED = 'bulk_import_completed',

  // ── Team Management ──────────────────────────────────
  PLAYER_ADDED_TO_TEAM = 'player_added_to_team',
  PLAYER_REMOVED_FROM_TEAM = 'player_removed_from_team',
  PLAYER_TRANSFERRED = 'player_transferred',
  TEAM_CREATED = 'team_created',
  TEAM_DELETED = 'team_deleted',

  // ── Event Lifecycle ──────────────────────────────────
  EVENT_CREATED = 'event_created',
  EVENT_STARTED = 'event_started',
  EVENT_COMPLETED = 'event_completed',
  EVENT_CANCELLED = 'event_cancelled',
  EVENT_CHAMPION = 'event_champion',
  EVENT_CHAMPION_ANNOUNCEMENT = 'event_champion_announcement',

  // ── Competition Lifecycle ────────────────────────────
  COMPETITION_CREATED = 'competition_created',
  TEAM_ADDED_TO_COMPETITION = 'team_added_to_competition',
  TEAM_REMOVED_FROM_COMPETITION = 'team_removed_from_competition',
  FIXTURES_GENERATED = 'fixtures_generated',
  FIXTURES_RESET = 'fixtures_reset',
  COMPETITION_COMPLETED = 'competition_completed',
  COMPETITION_CHAMPION = 'competition_champion',
  COMPETITION_CHAMPION_ANNOUNCEMENT = 'competition_champion_announcement',
  COMPETITION_RUNNER_UP = 'competition_runner_up',
  BEST_PLAYER_OF_TOURNAMENT = 'best_player_of_tournament',
  BEST_PLAYER_ANNOUNCEMENT = 'best_player_announcement',

  // ── Match Lifecycle ──────────────────────────────────
  MATCH_SCHEDULED = 'match_scheduled',
  MATCH_DELAYED = 'match_delayed',
  MATCH_VENUE_CHANGED = 'match_venue_changed',
  MATCH_LINEUP_SET = 'match_lineup_set',
  MATCH_STARTED = 'match_started',
  MATCH_COMPLETED = 'match_completed',
  MATCH_WON = 'match_won',
  MATCH_LOST = 'match_lost',
  MATCH_WALKOVER = 'match_walkover',

  // ── Player Ratings & MVP ─────────────────────────────
  PLAYER_RATED = 'player_rated',
  PLAYER_RATING_UPDATED = 'player_rating_updated',
  MATCH_MVP = 'match_mvp',
  MATCH_MVP_ANNOUNCEMENT = 'match_mvp_announcement',

  // ── Account & Security ───────────────────────────────
  WELCOME = 'welcome',
  BULK_IMPORT_CHANGE_PASSWORD = 'bulk_import_change_password',
  PASSWORD_CHANGED = 'password_changed',
  PROFILE_UPDATED = 'profile_updated',

  // ── Tournament Advancement ───────────────────────────
  TEAM_ADVANCED = 'team_advanced',
  TEAM_ELIMINATED = 'team_eliminated',
  TEAM_QUALIFIED_FROM_GROUP = 'team_qualified_from_group',
}

/**
 * Map notification types to display icons for the frontend.
 */
export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  [NotificationType.WORKSPACE_CREATED]: '🏠',
  [NotificationType.WORKSPACE_UPDATED]: '⚙️',
  [NotificationType.WORKSPACE_DELETED]: '🗑️',
  [NotificationType.MEMBER_INVITED]: '📩',
  [NotificationType.INVITATION_ACCEPTED]: '✅',
  [NotificationType.INVITATION_REJECTED]: '❌',
  [NotificationType.MEMBER_JOINED]: '👋',
  [NotificationType.MEMBER_ROLE_CHANGED]: '🔄',
  [NotificationType.MEMBER_REMOVED]: '🚪',
  [NotificationType.BULK_IMPORT_USER]: '📥',
  [NotificationType.BULK_IMPORT_COMPLETED]: '📊',
  [NotificationType.PLAYER_ADDED_TO_TEAM]: '➕',
  [NotificationType.PLAYER_REMOVED_FROM_TEAM]: '➖',
  [NotificationType.PLAYER_TRANSFERRED]: '🔀',
  [NotificationType.TEAM_CREATED]: '🏟️',
  [NotificationType.TEAM_DELETED]: '🗑️',
  [NotificationType.EVENT_CREATED]: '🎪',
  [NotificationType.EVENT_STARTED]: '🚀',
  [NotificationType.EVENT_COMPLETED]: '🏁',
  [NotificationType.EVENT_CANCELLED]: '🚫',
  [NotificationType.EVENT_CHAMPION]: '🏆',
  [NotificationType.EVENT_CHAMPION_ANNOUNCEMENT]: '🏆',
  [NotificationType.COMPETITION_CREATED]: '📋',
  [NotificationType.TEAM_ADDED_TO_COMPETITION]: '📝',
  [NotificationType.TEAM_REMOVED_FROM_COMPETITION]: '📝',
  [NotificationType.FIXTURES_GENERATED]: '📅',
  [NotificationType.FIXTURES_RESET]: '🔄',
  [NotificationType.COMPETITION_COMPLETED]: '🏁',
  [NotificationType.COMPETITION_CHAMPION]: '🥇',
  [NotificationType.COMPETITION_CHAMPION_ANNOUNCEMENT]: '🥇',
  [NotificationType.COMPETITION_RUNNER_UP]: '🥈',
  [NotificationType.BEST_PLAYER_OF_TOURNAMENT]: '⭐',
  [NotificationType.BEST_PLAYER_ANNOUNCEMENT]: '⭐',
  [NotificationType.MATCH_SCHEDULED]: '📅',
  [NotificationType.MATCH_DELAYED]: '🕒',
  [NotificationType.MATCH_VENUE_CHANGED]: '🏟️',
  [NotificationType.MATCH_LINEUP_SET]: '📋',
  [NotificationType.MATCH_STARTED]: '🔴',
  [NotificationType.MATCH_COMPLETED]: '⚽',
  [NotificationType.MATCH_WON]: '🎉',
  [NotificationType.MATCH_LOST]: '😞',
  [NotificationType.MATCH_WALKOVER]: '⚠️',
  [NotificationType.PLAYER_RATED]: '📊',
  [NotificationType.PLAYER_RATING_UPDATED]: '📊',
  [NotificationType.MATCH_MVP]: '🌟',
  [NotificationType.MATCH_MVP_ANNOUNCEMENT]: '🌟',
  [NotificationType.WELCOME]: '👋',
  [NotificationType.BULK_IMPORT_CHANGE_PASSWORD]: '🔐',
  [NotificationType.PASSWORD_CHANGED]: '🔒',
  [NotificationType.PROFILE_UPDATED]: '👤',
  [NotificationType.TEAM_ADVANCED]: '🎯',
  [NotificationType.TEAM_ELIMINATED]: '💔',
  [NotificationType.TEAM_QUALIFIED_FROM_GROUP]: '🎯',
};

@Entity('notifications')
@Index('idx_notifications_user_id', ['userId'])
@Index('idx_notifications_workspace_id', ['workspaceId'])
@Index('idx_notifications_type', ['type'])
export class Notification extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  message: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'varchar', length: 60, default: NotificationType.WELCOME })
  type: NotificationType;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  icon: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;
}
