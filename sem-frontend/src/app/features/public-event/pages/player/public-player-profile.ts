import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlayerService } from '../../../players/services/player.service';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';
import { getSportBadgeClass, getSportIconClass } from '../../../../shared';
import { ShareService } from '../../../share/services/share.service';
import { ShareButtonComponent } from '../../../share/components/share-button';
import { LandingHeaderComponent } from '../../../../layouts/landing-header/landing-header';

interface CompetitionStats {
  competitionId: string;
  competitionName: string;
  sportCode: string;
  gamesPlayed: number;
  goals?: number;
  assists?: number;
  runs?: number;
  wickets?: number;
  ralliesWon?: number;
  ralliesLost?: number;
  kills?: number;
  blocks?: number;
  points?: number;
  rebounds?: number;
  setsWon?: number;
  aces?: number;
  chessWins?: number;
  totalMoves?: number;
  raidPoints?: number;
  tacklePoints?: number;
  catches?: number;
  drops?: number;
  bestPosition?: number | null;
  mvps: number;
  avgRating: number;
}

interface PublicPlayerProfile {
  player: {
    id: string;
    jerseyNumber: string | null;
    bio: string | null;
    position: string | null;
    achievements: Array<{
      id: string;
      title: string;
      description?: string | null;
      year?: number | null;
    }> | null;
    team: {
      id: string;
      name: string;
      logoUrl?: string | null;
      primaryColor?: string | null;
      secondaryColor?: string | null;
    };
    user: {
      id: string;
      username: string;
      avatarUrl?: string | null;
    };
  };
  allTime: {
    participations: number;
    gamesPlayed: number;
    goals?: number;
    assists?: number;
    runs?: number;
    wickets?: number;
    ralliesWon?: number;
    ralliesLost?: number;
    kills?: number;
    blocks?: number;
    points?: number;
    rebounds?: number;
    setsWon?: number;
    aces?: number;
    chessWins?: number;
    totalMoves?: number;
    raidPoints?: number;
    tacklePoints?: number;
    catches?: number;
    drops?: number;
    bestPosition?: number | null;
    mvps: number;
    avgRating: number;
  };
  competitions: CompetitionStats[];
  transfers?: Array<{
    id: string;
    fromTeam: { id: string; name: string } | null;
    toTeam: { id: string; name: string };
    transferredAt: string;
  }>;
}

@Component({
  selector: 'app-public-player-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AvatarComponent,
    ShareButtonComponent,
    LandingHeaderComponent,
  ],
  templateUrl: './public-player-profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicPlayerProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private playerService = inject(PlayerService);
  private shareService = inject(ShareService);

  profile = signal<PublicPlayerProfile | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  insights = signal<any | null>(null);
  isLoadingInsights = signal<boolean>(false);

  getSportBadgeClass = getSportBadgeClass;
  getSportIconClass = getSportIconClass;

  // Sport this player is primarily associated with — used to shape headline stat cards
  primarySport = computed(() => {
    const comps = this.profile()?.competitions ?? [];
    if (comps.length === 0) return null;
    // most gamesPlayed wins
    const sorted = [...comps].sort((a, b) => b.gamesPlayed - a.gamesPlayed);
    return sorted[0].sportCode;
  });

  headlineStats = computed(() => {
    const all = this.profile()?.allTime;
    if (!all) return [];
    const sport = this.primarySport();
    const stats: Array<{ label: string; value: string | number; icon: string }> = [
      { label: 'Games', value: all.gamesPlayed, icon: 'fi-rr-list' },
    ];
    if (sport === 'football') {
      stats.push(
        { label: 'Goals', value: all.goals ?? 0, icon: 'fi-rr-football' },
        { label: 'Assists', value: all.assists ?? 0, icon: 'fi-rr-hand-holding-heart' },
      );
    } else if (sport === 'cricket') {
      stats.push(
        { label: 'Runs', value: all.runs ?? 0, icon: 'fi-rr-bowling' },
        { label: 'Wickets', value: all.wickets ?? 0, icon: 'fi-rr-target' },
      );
    } else if (sport === 'badminton') {
      const won = all.ralliesWon ?? 0;
      const lost = all.ralliesLost ?? 0;
      const total = won + lost;
      const rate = total > 0 ? Math.round((won / total) * 100) : 0;
      stats.push(
        { label: 'Rallies won', value: won, icon: 'fi-rr-trophy' },
        { label: 'Win %', value: `${rate}%`, icon: 'fi-rr-chart-line-up' },
      );
    } else if (sport === 'basketball') {
      stats.push(
        { label: 'Points', value: all.points ?? 0, icon: 'fi-rr-basketball' },
        { label: 'Rebounds', value: all.rebounds ?? 0, icon: 'fi-rr-refresh' },
      );
    } else if (sport === 'volleyball') {
      stats.push(
        { label: 'Kills', value: all.kills ?? 0, icon: 'fi-rr-volleyball' },
        { label: 'Blocks', value: all.blocks ?? 0, icon: 'fi-rr-shield' },
      );
    } else if (sport === 'table_tennis') {
      stats.push(
        { label: 'Sets', value: all.setsWon ?? 0, icon: 'fi-rr-table-tennis' },
        { label: 'Aces', value: all.aces ?? 0, icon: 'fi-rr-bolt' },
      );
    } else if (sport === 'chess') {
      stats.push(
        { label: 'Wins', value: all.chessWins ?? 0, icon: 'fi-rr-chess' },
        { label: 'Moves', value: all.totalMoves ?? 0, icon: 'fi-rr-arrows-cross' },
      );
    } else if (sport === 'kabaddi') {
      stats.push(
        { label: 'Raid pts', value: all.raidPoints ?? 0, icon: 'fi-rr-running' },
        { label: 'Tackle pts', value: all.tacklePoints ?? 0, icon: 'fi-rr-shield' },
      );
    } else if (sport === 'throwball') {
      stats.push(
        { label: 'Catches', value: all.catches ?? 0, icon: 'fi-rr-ball-volleyball' },
        { label: 'Drops', value: all.drops ?? 0, icon: 'fi-rr-cross-small' },
      );
    } else if (sport === 'athletics') {
      stats.push({
        label: 'Best finish',
        value: all.bestPosition ? `#${all.bestPosition}` : '—',
        icon: 'fi-rr-medal',
      });
    }
    stats.push(
      { label: 'MVP awards', value: all.mvps ?? 0, icon: 'fi-rr-star' },
      { label: 'Avg rating', value: (all.avgRating ?? 0).toFixed(2), icon: 'fi-rr-badge-check' },
    );
    return stats;
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.error.set('No player ID provided');
        this.isLoading.set(false);
        return;
      }
      this.load(id);
    });
  }

  private load(id: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.insights.set(null);
    this.playerService.getPublicPlayer(id).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.isLoading.set(false);
        this.loadInsights(id);
        const p = data?.player;
        if (p) {
          this.shareService.setPageMeta({
            title: `${p.user.username} · ${p.team.name}`,
            description:
              p.bio ??
              `${data.allTime.gamesPlayed} games · ${data.allTime.mvps} MVPs · avg ${
                data.allTime.avgRating?.toFixed(2) ?? 0
              }`,
            image: p.user.avatarUrl ?? p.team.logoUrl,
            url: this.shareService.spaUrl('players', p.id),
          });
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Player profile not found');
        this.isLoading.set(false);
      },
    });
  }

  private loadInsights(id: string) {
    this.isLoadingInsights.set(true);
    this.playerService.getPublicPlayerInsights(id).subscribe({
      next: (data) => {
        this.insights.set(data);
        this.isLoadingInsights.set(false);
      },
      error: (err) => {
        console.error('Failed to load player insights', err);
        this.isLoadingInsights.set(false);
      },
    });
  }

  competitionStatValue(c: CompetitionStats, key: string): number | string {
    const v = (c as any)[key];
    if (v === null || v === undefined) return '—';
    return v;
  }

  sportPrimaryStat(c: CompetitionStats): { label: string; value: string | number } {
    switch (c.sportCode) {
      case 'football':
        return { label: 'Goals', value: c.goals ?? 0 };
      case 'cricket':
        return { label: 'Runs', value: c.runs ?? 0 };
      case 'badminton':
        return { label: 'Rallies won', value: c.ralliesWon ?? 0 };
      case 'basketball':
        return { label: 'Points', value: c.points ?? 0 };
      case 'volleyball':
        return { label: 'Kills', value: c.kills ?? 0 };
      case 'table_tennis':
        return { label: 'Sets', value: c.setsWon ?? 0 };
      case 'chess':
        return { label: 'Wins', value: c.chessWins ?? 0 };
      case 'kabaddi':
        return { label: 'Raid pts', value: c.raidPoints ?? 0 };
      case 'throwball':
        return { label: 'Catches', value: c.catches ?? 0 };
      case 'athletics':
        return { label: 'Best', value: c.bestPosition ? `#${c.bestPosition}` : '—' };
      default:
        return { label: 'Games', value: c.gamesPlayed };
    }
  }
}
