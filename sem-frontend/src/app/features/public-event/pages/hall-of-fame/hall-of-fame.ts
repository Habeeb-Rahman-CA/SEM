import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlayerService } from '../../../players/services/player.service';
import { LandingHeaderComponent } from '../../../../layouts/landing-header/landing-header';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';

export interface HallOfFameRecords {
  mostGoals: Array<{
    id: string;
    userId: string;
    username: string;
    avatarUrl?: string | null;
    teamName: string;
    teamId: string;
    goals: number;
    gamesPlayed: number;
  }>;
  mostAssists: Array<{
    id: string;
    userId: string;
    username: string;
    avatarUrl?: string | null;
    teamName: string;
    teamId: string;
    assists: number;
    gamesPlayed: number;
  }>;
  mostMvps: Array<{
    id: string;
    userId: string;
    username: string;
    avatarUrl?: string | null;
    teamName: string;
    teamId: string;
    mvps: number;
    gamesPlayed: number;
  }>;
  mostTitles: Array<{
    teamId: string;
    teamName: string;
    logoUrl?: string | null;
    titles: number;
    finals: number;
  }>;
  mostFinals: Array<{
    teamId: string;
    teamName: string;
    logoUrl?: string | null;
    titles: number;
    finals: number;
  }>;
  fastestGoal: {
    minute: number;
    second?: number;
    playerName: string;
    teamName: string;
    matchTitle: string;
    matchId: string;
  } | null;
  longestStreak: Array<{
    teamId: string;
    name: string;
    logoUrl?: string | null;
    current: number;
    max: number;
  }>;
}

@Component({
  selector: 'app-hall-of-fame',
  standalone: true,
  imports: [CommonModule, RouterLink, LandingHeaderComponent, AvatarComponent],
  templateUrl: './hall-of-fame.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HallOfFameComponent implements OnInit {
  private playerService = inject(PlayerService);

  records = signal<HallOfFameRecords | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  activeTab = signal<'all' | 'players' | 'teams' | 'records'>('all');

  ngOnInit() {
    this.load();
  }

  load() {
    this.isLoading.set(true);
    this.error.set(null);
    this.playerService.getHallOfFame().subscribe({
      next: (data) => {
        this.records.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load Hall of Fame records');
        this.isLoading.set(false);
      },
    });
  }

  formatGoalTime(minute: number, second?: number): string {
    if (second !== undefined && second !== null) {
      return `${minute}' ${second}"`;
    }
    return `${minute}'`;
  }
}
