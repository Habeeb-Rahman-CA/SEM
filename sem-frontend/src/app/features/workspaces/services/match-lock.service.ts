import { Injectable, inject } from '@angular/core';
import { CompetitionService } from '../../competitions/services/competition.service';
import { UiService } from '../../../core/services/ui.service';
import { extractMatchIds, MatchLike } from '../utils/match-context.util';

export interface MatchLockRequest {
  workspaceId: string;
  match: MatchLike & { id: string; status?: string };
}

export interface AcquireResult {
  success: boolean;
  lockedBy?: string | null;
}

/**
 * Acquires and heart-beats an edit lock on a match while a referee is scoring
 * it. The service owns the interval so the calling component no longer needs
 * to store or clear it manually.
 */
@Injectable({ providedIn: 'root' })
export class MatchLockService {
  private competitionService = inject(CompetitionService);
  private uiService = inject(UiService);

  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private readonly heartbeatMs = 20000;

  acquire(request: MatchLockRequest): Promise<AcquireResult> {
    const ids = this.contextIds(request);
    if (!ids) return Promise.resolve({ success: false });

    return new Promise((resolve) => {
      this.competitionService
        .acquireMatchLock(
          ids.workspaceId,
          ids.eventId,
          ids.competitionId,
          ids.stageId,
          request.match.id,
        )
        .subscribe({
          next: (res) => resolve({ success: !!res.success, lockedBy: res.lockedBy ?? null }),
          error: (err) => {
            this.uiService.error(
              err.error?.message ||
                'Failed to acquire edit lock. The match may be currently edited by another official.',
            );
            resolve({ success: false });
          },
        });
    });
  }

  startHeartbeat(request: MatchLockRequest, onLost: () => void): void {
    this.stopHeartbeat();
    const ids = this.contextIds(request);
    if (!ids) return;

    this.heartbeat = setInterval(() => {
      this.competitionService
        .acquireMatchLock(
          ids.workspaceId,
          ids.eventId,
          ids.competitionId,
          ids.stageId,
          request.match.id,
        )
        .subscribe({
          error: (err) => {
            console.warn('Failed to renew match lock', err);
            this.uiService.error(
              err.error?.message || 'Lock expired or lost. Another official may have taken over.',
            );
            this.stopHeartbeat();
            onLost();
          },
        });
    }, this.heartbeatMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  release(request: MatchLockRequest): void {
    this.stopHeartbeat();
    if (this.uiService.isOffline()) return;
    const ids = this.contextIds(request);
    if (!ids) return;

    this.competitionService
      .releaseMatchLock(
        ids.workspaceId,
        ids.eventId,
        ids.competitionId,
        ids.stageId,
        request.match.id,
      )
      .subscribe({
        error: (err) => console.warn('Failed to release match lock', err),
      });
  }

  private contextIds(request: MatchLockRequest): {
    workspaceId: string;
    eventId: string;
    competitionId: string;
    stageId: string;
  } | null {
    const ids = extractMatchIds(request.match);
    if (!request.workspaceId || !ids.eventId || !ids.competitionId || !ids.stageId) return null;
    return {
      workspaceId: request.workspaceId,
      eventId: ids.eventId,
      competitionId: ids.competitionId,
      stageId: ids.stageId,
    };
  }
}
