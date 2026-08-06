import { Injectable } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'scored';

export type ActivityCategory =
  | 'team'
  | 'match'
  | 'venue'
  | 'registration'
  | 'certificate'
  | 'sponsor'
  | 'equipment'
  | 'transfer'
  | 'roster';

export interface ActivityLogEntry {
  id: string;
  workspaceId: string;
  timestamp: string; // ISO string
  formattedTime: string; // e.g. "10:20 AM"
  relativeTime: string; // e.g. "10m ago"
  actorName: string;
  actorAvatar?: string;
  actorRole?: string;
  action: ActivityAction;
  entityType: ActivityCategory;
  entityName: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  severity: 'info' | 'warning' | 'critical';
}

@Injectable()
export class ActivityTimelineService {
  private logsStore: Map<string, ActivityLogEntry[]> = new Map();

  constructor(private readonly workspacesService: WorkspacesService) {
    this.seedInitialActivityLogs();
  }

  private seedInitialActivityLogs() {
    const defaultWsLogs: ActivityLogEntry[] = [
      {
        id: 'act-101',
        workspaceId: 'default-ws',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15m ago
        formattedTime: '11:00 AM',
        relativeTime: '15m ago',
        actorName: 'Ali Hassan',
        actorRole: 'Registrar',
        action: 'approved',
        entityType: 'registration',
        entityName: 'Eagles FC Season Registration',
        details: 'Approved 24 player profiles and verified medical waivers.',
        severity: 'info',
      },
      {
        id: 'act-102',
        workspaceId: 'default-ws',
        timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35m ago
        formattedTime: '10:40 AM',
        relativeTime: '35m ago',
        actorName: 'Sarah Jenkins',
        actorRole: 'Venue Manager',
        action: 'deleted',
        entityType: 'venue',
        entityName: 'East Side Pitch 4',
        details: 'Decommissioned pitch for annual turf maintenance.',
        severity: 'warning',
      },
      {
        id: 'act-103',
        workspaceId: 'default-ws',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45m ago
        formattedTime: '10:30 AM',
        relativeTime: '45m ago',
        actorName: 'John Vance',
        actorRole: 'Match Referee',
        action: 'updated',
        entityType: 'match',
        entityName: 'Eagles FC vs Lions FC (Final)',
        details: 'Recorded official final score 3 - 2 with Hat Trick by Alex.',
        severity: 'info',
      },
      {
        id: 'act-104',
        workspaceId: 'default-ws',
        timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(), // 55m ago
        formattedTime: '10:20 AM',
        relativeTime: '55m ago',
        actorName: 'Ahmed Al-Mansoor',
        actorRole: 'Team Manager',
        action: 'created',
        entityType: 'team',
        entityName: 'Team Alpha Lions',
        details: 'Registered team roster with 18 confirmed active players.',
        severity: 'info',
      },
      {
        id: 'act-105',
        workspaceId: 'default-ws',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2h ago
        formattedTime: '09:15 AM',
        relativeTime: '2h ago',
        actorName: 'Elena Rostova',
        actorRole: 'Tournament Organizer',
        action: 'published',
        entityType: 'certificate',
        entityName: 'Championship Trophy Certificates',
        details:
          'Batch issued 32 QR-verified digital certificates for winners & referees.',
        severity: 'info',
      },
      {
        id: 'act-106',
        workspaceId: 'default-ws',
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3h ago
        formattedTime: '08:30 AM',
        relativeTime: '3h ago',
        actorName: 'Marcus Vance',
        actorRole: 'Admin Director',
        action: 'approved',
        entityType: 'sponsor',
        entityName: 'Red Bull Platinum Sponsorship',
        details: 'Confirmed brand sponsorship tier and display window.',
        severity: 'info',
      },
    ];

    this.logsStore.set('default-ws', defaultWsLogs);
  }

  async listActivityLogs(
    workspaceId: string,
    query?: {
      category?: ActivityCategory;
      action?: ActivityAction;
      search?: string;
    },
    userId?: string,
  ): Promise<ActivityLogEntry[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    let logs =
      this.logsStore.get(workspaceId) || this.logsStore.get('default-ws') || [];

    if (query?.category && query.category !== ('all' as any)) {
      logs = logs.filter((l) => l.entityType === query.category);
    }

    if (query?.action && query.action !== ('all' as any)) {
      logs = logs.filter((l) => l.action === query.action);
    }

    if (query?.search) {
      const s = query.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.actorName.toLowerCase().includes(s) ||
          l.entityName.toLowerCase().includes(s) ||
          (l.details && l.details.toLowerCase().includes(s)),
      );
    }

    return logs;
  }

  async recordActivity(
    workspaceId: string,
    entry: {
      actorName: string;
      actorRole?: string;
      action: ActivityAction;
      entityType: ActivityCategory;
      entityName: string;
      entityId?: string;
      details?: string;
      severity?: 'info' | 'warning' | 'critical';
    },
    userId?: string,
  ): Promise<ActivityLogEntry> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newLog: ActivityLogEntry = {
      id: `act-${Date.now()}`,
      workspaceId,
      timestamp: now.toISOString(),
      formattedTime,
      relativeTime: 'Just now',
      actorName: entry.actorName,
      actorRole: entry.actorRole || 'Workspace Member',
      action: entry.action,
      entityType: entry.entityType,
      entityName: entry.entityName,
      entityId: entry.entityId,
      details: entry.details,
      severity: entry.severity || 'info',
    };

    const currentLogs = this.logsStore.get(workspaceId) || [];
    this.logsStore.set(workspaceId, [newLog, ...currentLogs]);
    return newLog;
  }
}
