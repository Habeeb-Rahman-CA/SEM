import { Injectable } from '@angular/core';
import { Match, MatchPlayer, Player } from '../../../../workspaces/services/workspace.service';
import { FootballEvent } from '../models/football-console.interface';

interface RosterState {
  inactiveIds: Set<string>;
  subbedInUserIds: Set<string>;
}

/**
 * Derives the "who is on the pitch" and "who is on the bench" player lists
 * for a given team by cross-referencing the current match lineup with
 * cards, substitutions and injuries recorded in liveData.
 */
@Injectable({ providedIn: 'root' })
export class FootballRosterService {
  private collectState(match: Match | null | undefined): RosterState {
    const inactiveIds = new Set<string>();
    const subbedInUserIds = new Set<string>();
    if (!match?.liveData?.events) {
      return { inactiveIds, subbedInUserIds };
    }
    for (const ev of match.liveData.events as FootballEvent[]) {
      if (ev.type === 'card' && (ev.cardType === 'red' || ev.cardType === 'second_yellow')) {
        if (ev.playerUserId) inactiveIds.add(ev.playerUserId);
      }
      if (ev.type === 'substitution') {
        if (ev.playerOutId) inactiveIds.add(ev.playerOutId);
        if (ev.playerInId) subbedInUserIds.add(ev.playerInId);
      }
      if (ev.type === 'injury' && ev.substituted) {
        if (ev.playerUserId) inactiveIds.add(ev.playerUserId);
      }
    }
    return { inactiveIds, subbedInUserIds };
  }

  playing(
    teamId: string | null | undefined,
    match: Match | null | undefined,
    allPlayers: Player[],
    lineup: MatchPlayer[],
  ): Player[] {
    if (!teamId) return [];
    const { inactiveIds, subbedInUserIds } = this.collectState(match);
    const teamPlayers = allPlayers.filter((p) => p.teamId === teamId && !inactiveIds.has(p.userId));
    const hasMappedLineup = lineup.some((le) => le.teamId === teamId && le.isPlaying);
    if (!hasMappedLineup) return teamPlayers;
    const playingPlayerIds = new Set(
      lineup.filter((le) => le.teamId === teamId && le.isPlaying).map((le) => le.playerId),
    );
    return teamPlayers.filter((p) => playingPlayerIds.has(p.id) || subbedInUserIds.has(p.userId));
  }

  bench(
    teamId: string | null | undefined,
    match: Match | null | undefined,
    allPlayers: Player[],
    lineup: MatchPlayer[],
  ): Player[] {
    if (!teamId) return [];
    const { inactiveIds, subbedInUserIds } = this.collectState(match);
    const teamPlayers = allPlayers.filter(
      (p) => p.teamId === teamId && !inactiveIds.has(p.userId) && !subbedInUserIds.has(p.userId),
    );
    const hasMappedLineup = lineup.some((le) => le.teamId === teamId && le.isPlaying);
    if (!hasMappedLineup) return teamPlayers;
    const benchPlayerIds = new Set(
      lineup.filter((le) => le.teamId === teamId && !le.isPlaying).map((le) => le.playerId),
    );
    return teamPlayers.filter((p) => benchPlayerIds.has(p.id));
  }
}
