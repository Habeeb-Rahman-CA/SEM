import { Injectable, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';

export type CheckInSubjectKind = 'player' | 'member' | 'user' | 'team' | 'pass';

export interface CheckInRecord {
  id: string;
  workspaceId: string;
  eventId: string | null;
  scannedAt: string;
  code: string;
  subjectKind: CheckInSubjectKind | 'unknown';
  subjectId: string | null;
  displayName: string;
  detail?: string;
  verified: boolean;
  note?: string;
}

const STORAGE_KEY = (workspaceId: string) => `checkin_log_${workspaceId}`;

/**
 * CheckInService
 *
 * Persists the recent check-in log locally (per workspace) so that scans keep
 * a history across page reloads and — importantly — when the operator is
 * offline in the field. This is intentional: check-in gates are the exact
 * scenario where network can be unreliable and losing the log on refresh
 * would mean double-admitting participants.
 */
@Injectable({ providedIn: 'root' })
export class CheckInService {
  private storage = inject(StorageService);

  async load(workspaceId: string): Promise<CheckInRecord[]> {
    const raw = await this.storage.getItem(STORAGE_KEY(workspaceId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as CheckInRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async save(workspaceId: string, records: CheckInRecord[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEY(workspaceId), JSON.stringify(records));
  }

  async record(workspaceId: string, next: CheckInRecord): Promise<CheckInRecord[]> {
    const existing = await this.load(workspaceId);
    const merged = [next, ...existing.filter((r) => r.id !== next.id)].slice(0, 200);
    await this.save(workspaceId, merged);
    return merged;
  }

  async clear(workspaceId: string, eventId?: string | null): Promise<CheckInRecord[]> {
    if (!eventId) {
      await this.storage.removeItem(STORAGE_KEY(workspaceId));
      return [];
    }
    const remaining = (await this.load(workspaceId)).filter((r) => r.eventId !== eventId);
    await this.save(workspaceId, remaining);
    return remaining;
  }

  /**
   * Try to interpret a scanned code as an SEM URL or JSON payload. Falls back
   * to treating the string itself as a subject id — that way admins can print
   * plain-text badges with a member/player id and it still resolves.
   */
  parse(code: string): { kind: CheckInSubjectKind | 'unknown'; id: string | null; raw: string } {
    const raw = code.trim();

    // JSON payload: {"kind":"player","id":"..."}
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.id) {
          return {
            kind: (parsed.kind as CheckInSubjectKind) ?? 'unknown',
            id: String(parsed.id),
            raw,
          };
        }
      } catch {
        /* not JSON — try URL next */
      }
    }

    // sem://player/<id> or sem://pass/<id> or https://.../check-in?kind=&id=
    try {
      const url = new URL(raw);
      const kindParam = url.searchParams.get('kind') as CheckInSubjectKind | null;
      const idParam = url.searchParams.get('id');
      if (kindParam && idParam) return { kind: kindParam, id: idParam, raw };
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        const kindGuess = pathParts[pathParts.length - 2] as CheckInSubjectKind;
        const idGuess = pathParts[pathParts.length - 1];
        return { kind: kindGuess, id: idGuess, raw };
      }
    } catch {
      /* not a URL — fall through */
    }

    return { kind: 'unknown', id: raw, raw };
  }
}
