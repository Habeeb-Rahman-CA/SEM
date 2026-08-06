import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';

export type TrashedItemType =
  'team' | 'player' | 'event' | 'venue' | 'sponsor' | 'ad' | 'certificate';

export interface TrashedItem {
  id: string;
  workspaceId: string;
  itemType: TrashedItemType;
  itemId: string;
  itemName: string;
  deletedAt: string; // ISO String
  deletedBy: string;
  expiresAt: string; // Auto-purge after 30 days
  itemData: Record<string, any>;
}

@Injectable()
export class TrashService {
  private trashStore: Map<string, TrashedItem[]> = new Map();

  constructor(private readonly workspacesService: WorkspacesService) {
    this.seedInitialTrashData();
  }

  private seedInitialTrashData() {
    const defaultWsTrash: TrashedItem[] = [
      {
        id: 'trash-101',
        workspaceId: 'default-ws',
        itemType: 'team',
        itemId: 'team-archived-99',
        itemName: 'Red Dragons FC (Archive)',
        deletedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        deletedBy: 'Ahmed Al-Mansoor',
        expiresAt: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 30,
        ).toISOString(),
        itemData: { name: 'Red Dragons FC', code: 'RDF', colors: '#ef4444' },
      },
      {
        id: 'trash-102',
        workspaceId: 'default-ws',
        itemType: 'venue',
        itemId: 'venue-archived-12',
        itemName: 'Old Training Field B',
        deletedAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(), // 14 hours ago
        deletedBy: 'Sarah Jenkins',
        expiresAt: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 30,
        ).toISOString(),
        itemData: { name: 'Old Training Field B', location: 'North Annex' },
      },
      {
        id: 'trash-103',
        workspaceId: 'default-ws',
        itemType: 'player',
        itemId: 'player-archived-05',
        itemName: 'Karem Benali (Transferred)',
        deletedAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(), // 28 hours ago
        deletedBy: 'John Vance',
        expiresAt: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 30,
        ).toISOString(),
        itemData: { name: 'Karem Benali', position: 'Midfielder', number: 10 },
      },
    ];

    this.trashStore.set('default-ws', defaultWsTrash);
  }

  async listTrash(
    workspaceId: string,
    userId?: string,
  ): Promise<TrashedItem[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }
    return (
      this.trashStore.get(workspaceId) ||
      this.trashStore.get('default-ws') ||
      []
    );
  }

  async moveToTrash(
    workspaceId: string,
    payload: {
      itemType: TrashedItemType;
      itemId: string;
      itemName: string;
      deletedBy?: string;
      itemData?: Record<string, any>;
    },
    userId?: string,
  ): Promise<TrashedItem> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days retention

    const newItem: TrashedItem = {
      id: `trash-${Date.now()}`,
      workspaceId,
      itemType: payload.itemType,
      itemId: payload.itemId,
      itemName: payload.itemName,
      deletedAt: now.toISOString(),
      deletedBy: payload.deletedBy || 'Workspace Member',
      expiresAt: expires.toISOString(),
      itemData: payload.itemData || {},
    };

    const currentList = this.trashStore.get(workspaceId) || [];
    this.trashStore.set(workspaceId, [newItem, ...currentList]);
    return newItem;
  }

  async restoreFromTrash(
    workspaceId: string,
    trashId: string,
    userId?: string,
  ): Promise<TrashedItem> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.trashStore.get(workspaceId) ||
      this.trashStore.get('default-ws') ||
      [];
    const index = list.findIndex((item) => item.id === trashId);

    if (index === -1) {
      throw new NotFoundException(
        `Trashed item with ID "${trashId}" not found`,
      );
    }

    const [restored] = list.splice(index, 1);
    this.trashStore.set(workspaceId, list);
    return restored;
  }

  async purgeFromTrash(
    workspaceId: string,
    trashId: string,
    userId?: string,
  ): Promise<{ success: boolean; id: string }> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.trashStore.get(workspaceId) ||
      this.trashStore.get('default-ws') ||
      [];
    const updated = list.filter((item) => item.id !== trashId);
    this.trashStore.set(workspaceId, updated);

    return { success: true, id: trashId };
  }

  async emptyTrash(
    workspaceId: string,
    userId?: string,
  ): Promise<{ success: boolean; purgedCount: number }> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list = this.trashStore.get(workspaceId) || [];
    const count = list.length;
    this.trashStore.set(workspaceId, []);

    return { success: true, purgedCount: count };
  }
}
