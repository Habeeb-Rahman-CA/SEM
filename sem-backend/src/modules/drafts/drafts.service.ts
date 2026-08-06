import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';

export type DraftFormType =
  | 'event_creation'
  | 'team_registration'
  | 'venue_setup'
  | 'analytics_report'
  | 'player_registration';

export interface DraftItem {
  id: string;
  workspaceId: string;
  title: string;
  formType: DraftFormType;
  progressPercent: number; // e.g. 75
  updatedAt: string; // ISO string
  updatedBy: string;
  formData: Record<string, any>;
}

@Injectable()
export class DraftsService {
  private draftsStore: Map<string, DraftItem[]> = new Map();

  constructor(private readonly workspacesService: WorkspacesService) {
    this.seedInitialDrafts();
  }

  private seedInitialDrafts() {
    const defaultWsDrafts: DraftItem[] = [
      {
        id: 'draft-101',
        workspaceId: 'default-ws',
        title: 'Summer League Championship 2026 Registration',
        formType: 'event_creation',
        progressPercent: 75,
        updatedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(), // 40m ago
        updatedBy: 'Ahmed Al-Mansoor',
        formData: {
          eventName: 'Summer League Championship 2026',
          category: 'Football 11v11',
          maxTeams: 16,
          startDate: '2026-09-01',
          venueId: 'venue-1',
          description: 'Draft schedule setup for annual summer tournament.',
        },
      },
      {
        id: 'draft-102',
        workspaceId: 'default-ws',
        title: 'Team Roster Setup (Falcon Strikers FC)',
        formType: 'team_registration',
        progressPercent: 50,
        updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3h ago
        updatedBy: 'Sarah Jenkins',
        formData: {
          teamName: 'Falcon Strikers FC',
          coachName: 'David Miller',
          rosterCount: 14,
          primaryColor: '#3b82f6',
        },
      },
      {
        id: 'draft-103',
        workspaceId: 'default-ws',
        title: 'Q3 Sponsor ROI Valuation Report',
        formType: 'analytics_report',
        progressPercent: 90,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        updatedBy: 'John Vance',
        formData: {
          reportPeriod: 'Q3 2026',
          sponsorTierFilter: 'Platinum & Gold',
          metricsIncluded: ['Impressions', 'QR Scans', 'Reach'],
        },
      },
    ];

    this.draftsStore.set('default-ws', defaultWsDrafts);
  }

  async listDrafts(workspaceId: string, userId?: string): Promise<DraftItem[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }
    return (
      this.draftsStore.get(workspaceId) ||
      this.draftsStore.get('default-ws') ||
      []
    );
  }

  async getDraft(
    workspaceId: string,
    draftId: string,
    userId?: string,
  ): Promise<DraftItem> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.draftsStore.get(workspaceId) ||
      this.draftsStore.get('default-ws') ||
      [];
    const draft = list.find((d) => d.id === draftId);

    if (!draft) {
      throw new NotFoundException(`Draft with ID "${draftId}" not found`);
    }

    return draft;
  }

  async saveDraft(
    workspaceId: string,
    payload: {
      id?: string;
      title: string;
      formType: DraftFormType;
      progressPercent?: number;
      formData: Record<string, any>;
      updatedBy?: string;
    },
    userId?: string,
  ): Promise<DraftItem> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const now = new Date().toISOString();
    const currentList = this.draftsStore.get(workspaceId) || [];

    if (payload.id) {
      const index = currentList.findIndex((d) => d.id === payload.id);
      if (index !== -1) {
        const updated: DraftItem = {
          ...currentList[index],
          title: payload.title,
          formType: payload.formType,
          progressPercent:
            payload.progressPercent ?? currentList[index].progressPercent,
          formData: payload.formData,
          updatedAt: now,
          updatedBy: payload.updatedBy || currentList[index].updatedBy,
        };
        currentList[index] = updated;
        this.draftsStore.set(workspaceId, currentList);
        return updated;
      }
    }

    // Create new draft entry
    const newDraft: DraftItem = {
      id: `draft-${Date.now()}`,
      workspaceId,
      title: payload.title,
      formType: payload.formType,
      progressPercent: payload.progressPercent ?? 50,
      updatedAt: now,
      updatedBy: payload.updatedBy || 'Workspace Member',
      formData: payload.formData,
    };

    this.draftsStore.set(workspaceId, [newDraft, ...currentList]);
    return newDraft;
  }

  async deleteDraft(
    workspaceId: string,
    draftId: string,
    userId?: string,
  ): Promise<{ success: boolean; id: string }> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.draftsStore.get(workspaceId) ||
      this.draftsStore.get('default-ws') ||
      [];
    const updated = list.filter((d) => d.id !== draftId);
    this.draftsStore.set(workspaceId, updated);

    return { success: true, id: draftId };
  }
}
