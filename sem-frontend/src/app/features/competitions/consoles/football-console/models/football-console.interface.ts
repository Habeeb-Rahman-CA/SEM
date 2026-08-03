export type ConsoleMode = 'referee' | 'statistician';

export type FootballEventType =
  | 'goal'
  | 'card'
  | 'substitution'
  | 'offside'
  | 'foul'
  | 'free_kick'
  | 'corner_kick'
  | 'throw_in'
  | 'goal_kick'
  | 'injury'
  | 'penalty'
  | 'shootout_penalty';

export type FootballGoalType =
  'normal' | 'regular' | 'penalty' | 'free_kick' | 'header' | 'volley' | 'long_shot' | 'own_goal';

export type FootballCardType = 'yellow' | 'red' | 'second_yellow';
export type FootballPenaltyOutcome = 'scored' | 'missed' | 'saved' | 'hit_post';
export type FootballFreeKickType = 'direct' | 'indirect';

export interface FootballAuditEntry {
  action: string;
  at: string;
  previousMinute?: number;
  previousNote?: string | null;
}

export interface FootballEvent {
  type: FootballEventType;
  teamId?: string;
  minute?: number;
  published?: boolean;
  goalType?: FootballGoalType | string;
  cardType?: FootballCardType | string;
  playerUserId?: string;
  playerName?: string;
  playerInId?: string;
  playerOutId?: string;
  assistPlayerUserId?: string;
  assistPlayerName?: string;
  opponentPlayerUserId?: string;
  foulType?: string;
  freeKickType?: FootballFreeKickType | string;
  result?: string;
  side?: 'left' | 'right' | string;
  outcome?: FootballPenaltyOutcome | string;
  reason?: string;
  severity?: string;
  substituted?: boolean;
  order?: number;
  _note?: string;
  _audit?: FootballAuditEntry[];
}

export interface FootballDeletedEvent extends FootballEvent {
  _deletedAt: string;
  _action: 'deleted';
}

export interface FootballLiveData {
  started?: boolean;
  halfDurationMinutes?: number;
  extraTimeHalfDurationMinutes?: number;
  enableExtraTime?: boolean;
  enablePenaltyShootout?: boolean;
  currentHalf?: 1 | 2 | 3 | 4 | 5;
  elapsedSeconds?: number;
  timerRunning?: boolean;
  events?: FootballEvent[];
  shootoutHomeScore?: number;
  shootoutAwayScore?: number;
  result?: string;
  _deletedEvents?: FootballDeletedEvent[];
}

export interface FootballGoalPayload {
  teamId: string;
  goalType: string;
  scorerId: string;
  scorerCustomName?: string;
  assistId?: string;
  assistCustomName?: string;
}

export interface FootballCardPayload {
  teamId: string;
  playerId: string;
  cardType: 'yellow' | 'red';
}

export interface FootballPenaltyPayload {
  teamId: string;
  kickerId: string;
  outcome: FootballPenaltyOutcome;
}

export interface FootballSubstitutionPayload {
  teamId: string;
  playerOutId: string;
  playerInId: string;
  reason: string;
}

export interface FootballShootoutPenaltyPayload {
  teamId: string;
  playerUserId: string;
  outcome: FootballPenaltyOutcome;
}

export interface FootballMatchStartOptions {
  halfDurationMinutes: number;
  enableExtraTime: boolean;
  enablePenaltyShootout: boolean;
  extraTimeHalfDurationMinutes: number;
}

export interface FootballEditEventPayload {
  originalIndex: number;
  minute: number;
  note?: string;
}

export interface TimelineFilterState {
  type: string;
  playerId: string;
}

export interface FilteredFootballEvent extends FootballEvent {
  _originalIndex: number;
}
