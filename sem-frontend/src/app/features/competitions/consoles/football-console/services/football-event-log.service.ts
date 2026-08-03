import { Injectable } from '@angular/core';
import {
  FootballAuditEntry,
  FootballDeletedEvent,
  FootballEvent,
  FootballLiveData,
} from '../models/football-console.interface';

/**
 * Pure helpers for mutating the events array of a football live data blob.
 * Kept side-effect free so components/services can compose these into a
 * single updateMatch payload.
 */
@Injectable({ providedIn: 'root' })
export class FootballEventLogService {
  cloneLive(live: FootballLiveData | undefined | null): FootballLiveData {
    const cloned: FootballLiveData = live ? { ...live } : {};
    if (!cloned.events) cloned.events = [];
    return cloned;
  }

  minuteFromSeconds(seconds: number): number {
    return Math.floor((seconds || 0) / 60) + 1;
  }

  pushEvent(live: FootballLiveData, event: FootballEvent): FootballLiveData {
    const events = live.events ?? [];
    return { ...live, events: [...events, event] };
  }

  removeAt(
    live: FootballLiveData,
    index: number,
  ): { live: FootballLiveData; removed: FootballEvent | null } {
    const events = live.events ?? [];
    if (index < 0 || index >= events.length) {
      return { live, removed: null };
    }
    const removed = events[index];
    const nextEvents = events.filter((_, i) => i !== index);
    return { live: { ...live, events: nextEvents }, removed };
  }

  archiveDeleted(live: FootballLiveData, event: FootballEvent): FootballLiveData {
    const entry: FootballDeletedEvent = {
      ...event,
      _deletedAt: new Date().toISOString(),
      _action: 'deleted',
    };
    const bucket = Array.isArray(live._deletedEvents) ? [...live._deletedEvents, entry] : [entry];
    return { ...live, _deletedEvents: bucket };
  }

  applyEdit(live: FootballLiveData, index: number, minute: number, note: string): FootballLiveData {
    const events = live.events ?? [];
    if (index < 0 || index >= events.length) return live;
    const original = events[index];
    const auditEntry: FootballAuditEntry = {
      action: 'edited',
      at: new Date().toISOString(),
      previousMinute: original.minute,
      previousNote: original._note ?? null,
    };
    const audit: FootballAuditEntry[] = Array.isArray(original._audit)
      ? [...original._audit, auditEntry]
      : [auditEntry];
    const nextEvents = events.map((e, i) =>
      i === index
        ? {
            ...e,
            minute,
            _note: note || undefined,
            _audit: audit,
          }
        : e,
    );
    return { ...live, events: nextEvents };
  }

  publishAll(live: FootballLiveData): FootballLiveData {
    const events = (live.events ?? []).map((e) => ({ ...e, published: true }));
    return { ...live, events };
  }

  countYellowsFor(live: FootballLiveData, playerUserId: string): number {
    return (live.events ?? []).filter(
      (e) => e.type === 'card' && e.playerUserId === playerUserId && e.cardType === 'yellow',
    ).length;
  }

  findLastGoalIndex(live: FootballLiveData, teamId: string): number {
    const events = live.events ?? [];
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.type === 'goal' && e.teamId === teamId) return i;
    }
    return -1;
  }
}
