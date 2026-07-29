import { Injectable } from '@nestjs/common';

export interface LockInfo {
  userId: string;
  username: string;
  expiresAt: number;
}

@Injectable()
export class MatchLockService {
  private locks = new Map<string, LockInfo>();
  private readonly LOCK_TIMEOUT_MS = 60000; // 60 seconds timeout

  acquireLock(matchId: string, userId: string, username: string): { success: boolean; lockedBy?: string; expiresAt?: number } {
    const now = Date.now();
    const currentLock = this.locks.get(matchId);

    if (currentLock && currentLock.expiresAt > now && currentLock.userId !== userId) {
      return {
        success: false,
        lockedBy: currentLock.username,
        expiresAt: currentLock.expiresAt,
      };
    }

    const expiresAt = now + this.LOCK_TIMEOUT_MS;
    this.locks.set(matchId, {
      userId,
      username,
      expiresAt,
    });

    return {
      success: true,
      expiresAt,
    };
  }

  releaseLock(matchId: string, userId: string): boolean {
    const currentLock = this.locks.get(matchId);
    if (currentLock && currentLock.userId === userId) {
      this.locks.delete(matchId);
      return true;
    }
    return false;
  }

  isLocked(matchId: string, userId: string): { locked: boolean; username?: string } {
    const now = Date.now();
    const currentLock = this.locks.get(matchId);

    if (currentLock && currentLock.expiresAt > now && currentLock.userId !== userId) {
      return {
        locked: true,
        username: currentLock.username,
      };
    }

    return {
      locked: false,
    };
  }

  forceReleaseLock(matchId: string): void {
    this.locks.delete(matchId);
  }
}
