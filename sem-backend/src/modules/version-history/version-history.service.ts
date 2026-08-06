import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';

export type VersionEntityType =
  'event_rulebook' | 'match_schedule' | 'team_roster' | 'workspace_policy';

export interface VersionRecord {
  id: string;
  workspaceId: string;
  entityType: VersionEntityType;
  entityId: string;
  versionNumber: number;
  changeSummary: string;
  authorName: string;
  createdAt: string;
  snapshotData: Record<string, any>;
}

@Injectable()
export class VersionHistoryService {
  private versionsStore: Map<string, VersionRecord[]> = new Map();

  constructor(private readonly workspacesService: WorkspacesService) {
    this.seedInitialVersions();
  }

  private seedInitialVersions() {
    const defaultVersions: VersionRecord[] = [
      {
        id: 'ver-101',
        workspaceId: 'default-ws',
        entityType: 'event_rulebook',
        entityId: 'rulebook-2026',
        versionNumber: 1,
        changeSummary: 'Initial draft of Summer Championship 2026 rulebook',
        authorName: 'Sarah Jenkins',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
        snapshotData: {
          title: 'Summer Championship 2026 Rulebook',
          maxPlayersPerRoster: 18,
          matchDurationMinutes: 80,
          substitutionLimit: 5,
          overtimePolicy: 'Extra Time 15m',
        },
      },
      {
        id: 'ver-102',
        workspaceId: 'default-ws',
        entityType: 'event_rulebook',
        entityId: 'rulebook-2026',
        versionNumber: 2,
        changeSummary:
          'Increased roster limit to 22 players & updated substitution rules',
        authorName: 'Ahmed Al-Mansoor',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        snapshotData: {
          title: 'Summer Championship 2026 Rulebook',
          maxPlayersPerRoster: 22,
          matchDurationMinutes: 90,
          substitutionLimit: 7,
          overtimePolicy: 'Penalty Shootout Immediate',
        },
      },
      {
        id: 'ver-103',
        workspaceId: 'default-ws',
        entityType: 'event_rulebook',
        entityId: 'rulebook-2026',
        versionNumber: 3,
        changeSummary: 'Added VAR review guidelines & updated prize allocation',
        authorName: 'David Miller',
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2h ago
        snapshotData: {
          title: 'Summer Championship 2026 Rulebook (Final)',
          maxPlayersPerRoster: 22,
          matchDurationMinutes: 90,
          substitutionLimit: 7,
          overtimePolicy: 'Extra Time 15m then Penalty Shootout',
          varEnabled: true,
          prizePoolUSD: 50000,
        },
      },
    ];

    this.versionsStore.set('default-ws', defaultVersions);
  }

  async listVersions(
    workspaceId: string,
    entityId: string = 'rulebook-2026',
    userId?: string,
  ): Promise<VersionRecord[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.versionsStore.get(workspaceId) ||
      this.versionsStore.get('default-ws') ||
      [];
    return list
      .filter((v) => v.entityId === entityId || !entityId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async createVersion(
    workspaceId: string,
    payload: {
      entityType: VersionEntityType;
      entityId: string;
      changeSummary: string;
      authorName?: string;
      snapshotData: Record<string, any>;
    },
    userId?: string,
  ): Promise<VersionRecord> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const currentList = this.versionsStore.get(workspaceId) || [];
    const maxVer = currentList.reduce(
      (max, v) => Math.max(max, v.versionNumber),
      0,
    );

    const newVersion: VersionRecord = {
      id: `ver-${Date.now()}`,
      workspaceId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      versionNumber: maxVer + 1,
      changeSummary: payload.changeSummary,
      authorName: payload.authorName || 'Workspace Editor',
      createdAt: new Date().toISOString(),
      snapshotData: payload.snapshotData,
    };

    this.versionsStore.set(workspaceId, [newVersion, ...currentList]);
    return newVersion;
  }

  async restoreVersion(
    workspaceId: string,
    payload: { entityId: string; targetVersionNumber: number },
    userId?: string,
  ): Promise<{ restoredVersion: VersionRecord; newCheckpoint: VersionRecord }> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.versionsStore.get(workspaceId) ||
      this.versionsStore.get('default-ws') ||
      [];
    const target = list.find(
      (v) =>
        v.entityId === payload.entityId &&
        v.versionNumber === payload.targetVersionNumber,
    );

    if (!target) {
      throw new NotFoundException(
        `Version ${payload.targetVersionNumber} not found for entity ${payload.entityId}`,
      );
    }

    // Create a new checkpoint entry that restores the target snapshot
    const maxVer = list.reduce((max, v) => Math.max(max, v.versionNumber), 0);
    const newCheckpoint: VersionRecord = {
      id: `ver-${Date.now()}`,
      workspaceId,
      entityType: target.entityType,
      entityId: target.entityId,
      versionNumber: maxVer + 1,
      changeSummary: `Restored back to Version ${target.versionNumber}`,
      authorName: 'Workspace Admin',
      createdAt: new Date().toISOString(),
      snapshotData: target.snapshotData,
    };

    this.versionsStore.set(workspaceId, [newCheckpoint, ...list]);

    return { restoredVersion: target, newCheckpoint };
  }
}
