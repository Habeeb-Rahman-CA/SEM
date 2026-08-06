import { Injectable, signal } from '@angular/core';

export type ActivityCategory =
  'team' | 'player' | 'file' | 'form' | 'certificate' | 'workspace' | 'milestone';

export interface ActivityItem {
  id: string;
  category: ActivityCategory;
  action: string;
  title: string;
  description: string;
  authorName: string;
  timestamp: string;
  icon: string;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityFeedService {
  activitiesSignal = signal<ActivityItem[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem('sem_activity_feed');
      if (data) {
        this.activitiesSignal.set(JSON.parse(data));
      } else {
        // Seed default initial timeline activities
        this.seedInitialActivities();
      }
    } catch (e) {
      console.error('Failed to load activity feed from storage', e);
      this.seedInitialActivities();
    }
  }

  private seedInitialActivities() {
    const initial: ActivityItem[] = [
      {
        id: 'act_1',
        category: 'workspace',
        action: 'Workspace Created',
        title: 'Taisen Championship Workspace Initialized',
        description: 'New workspace created for season tournament management.',
        authorName: 'System Admin',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        icon: 'fi-rr-layers',
      },
      {
        id: 'act_2',
        category: 'team',
        action: 'Teams Imported',
        title: 'Bulk Imported 12 Teams',
        description: 'Registered squads for football & basketball tournaments.',
        authorName: 'Tournament Director',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        icon: 'fi-rr-users-alt',
      },
      {
        id: 'act_3',
        category: 'milestone',
        action: 'Achievement Unlocked',
        title: 'Full Squad Assembled!',
        description: 'All 11 starter slots registered in roster.',
        authorName: 'Taisen Bot',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        icon: 'fi-rr-trophy',
      },
      {
        id: 'act_4',
        category: 'certificate',
        action: 'Certificates Generated',
        title: 'Issued 5 Digital Certificates',
        description: 'Generated participation certificates with QR codes.',
        authorName: 'Organizer',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        icon: 'fi-rr-diploma',
      },
    ];

    this.activitiesSignal.set(initial);
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      localStorage.setItem('sem_activity_feed', JSON.stringify(this.activitiesSignal()));
    } catch (e) {
      console.error('Failed to save activity feed to storage', e);
    }
  }

  logActivity(
    category: ActivityCategory,
    action: string,
    title: string,
    description: string,
    authorName = 'Current User',
    iconOverride?: string,
  ) {
    const icon = iconOverride || this.getCategoryIcon(category);
    const newItem: ActivityItem = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      category,
      action,
      title,
      description,
      authorName,
      timestamp: new Date().toISOString(),
      icon,
    };

    this.activitiesSignal.update((prev) => [newItem, ...prev.slice(0, 49)]); // Keep last 50 activities
    this.saveToStorage();
  }

  private getCategoryIcon(category: ActivityCategory): string {
    switch (category) {
      case 'team':
        return 'fi-rr-users-alt';
      case 'player':
        return 'fi-rr-user';
      case 'file':
        return 'fi-rr-folder-download';
      case 'form':
        return 'fi-rr-magic-wand';
      case 'certificate':
        return 'fi-rr-diploma';
      case 'workspace':
        return 'fi-rr-layers';
      case 'milestone':
        return 'fi-rr-trophy';
      default:
        return 'fi-rr-time-fast';
    }
  }

  clearActivities() {
    this.activitiesSignal.set([]);
    localStorage.removeItem('sem_activity_feed');
  }
}
