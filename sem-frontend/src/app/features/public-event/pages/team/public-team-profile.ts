import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TeamService } from '../../../teams/services/team.service';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { getSportBadgeClass, getSportIconClass } from '../../../../shared';
import { ShareService } from '../../../share/services/share.service';
import { ShareButtonComponent } from '../../../share/components/share-button';

interface CoachEntry {
  id: string;
  name: string;
  role?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}

interface AchievementEntry {
  id: string;
  title: string;
  year?: number | null;
  competitionName?: string | null;
  description?: string | null;
}

interface SquadPlayer {
  id: string;
  jerseyNumber?: string | null;
  position?: string | null;
  user: { id: string; username: string; avatarUrl?: string | null };
}

interface RecentMatch {
  id: string;
  scheduledAt: string | null;
  homeScore: number;
  awayScore: number;
  status: string;
  homeTeam: { id: string; name: string; logoUrl?: string | null } | null;
  awayTeam: { id: string; name: string; logoUrl?: string | null } | null;
  competition: {
    id: string;
    name: string;
    sportCode: string | null;
    eventId: string | null;
  };
}

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
  mvps: number;
  bestPlayer?: {
    playerId: string;
    playerName: string;
    avatarUrl?: string | null;
    avgRating: number;
    appearances: number;
  } | null;
}

interface PublicTeamProfile {
  team: {
    id: string;
    name: string;
    code: string;
    description?: string | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    coaches: CoachEntry[] | null;
    achievements: AchievementEntry[] | null;
    createdAt: string;
  };
  allTime: {
    participations: number;
    totalGames: number;
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
    mvps: number;
  };
  bestPlayers: Record<
    string,
    {
      playerId: string;
      playerName: string;
      avatarUrl?: string | null;
      avgRating: number;
      appearances: number;
    } | null
  >;
  competitions: CompetitionStats[];
  squad: SquadPlayer[];
  recentMatches: RecentMatch[];
}

@Component({
  selector: 'app-public-team-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DatePipe,
    AvatarComponent,
    LoadingSpinnerComponent,
    ShareButtonComponent,
  ],
  templateUrl: './public-team-profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicTeamProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private teamService = inject(TeamService);
  private shareService = inject(ShareService);

  profile = signal<PublicTeamProfile | null>(null);
  analytics = signal<any | null>(null);
  isLoading = signal<boolean>(true);
  isLoadingAnalytics = signal<boolean>(false);
  error = signal<string | null>(null);

  getSportBadgeClass = getSportBadgeClass;
  getSportIconClass = getSportIconClass;

  bestPlayersList = computed(() => {
    const bp = this.profile()?.bestPlayers ?? {};
    return Object.entries(bp)
      .filter(([, val]) => val !== null && val !== undefined)
      .map(([sport, val]) => ({ sport, ...(val as any) }));
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.error.set('No team ID provided');
        this.isLoading.set(false);
        return;
      }
      this.load(id);
    });
  }

  private load(id: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.analytics.set(null);
    this.teamService.getPublicTeam(id).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.isLoading.set(false);
        this.loadAnalytics(id);
        const t = data?.team;
        if (t) {
          this.shareService.setPageMeta({
            title: `${t.name} · ${t.code}`,
            description:
              t.description ??
              `${data.allTime.participations} competitions · ${data.allTime.totalGames} matches · ${
                data.team.achievements?.length ?? 0
              } trophies`,
            image: t.logoUrl,
            url: this.shareService.spaUrl('teams', t.id),
          });
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Team profile not found');
        this.isLoading.set(false);
      },
    });
  }

  private loadAnalytics(id: string) {
    this.isLoadingAnalytics.set(true);
    this.teamService.getPublicTeamAnalytics(id).subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.isLoadingAnalytics.set(false);
      },
      error: (err) => {
        console.error('Failed to load team public analytics', err);
        this.isLoadingAnalytics.set(false);
      },
    });
  }

  isTeamWinner(m: RecentMatch, teamId: string): 'win' | 'loss' | 'draw' {
    if (m.status !== 'completed') return 'draw';
    const isHome = m.homeTeam?.id === teamId;
    const my = isHome ? m.homeScore : m.awayScore;
    const opp = isHome ? m.awayScore : m.homeScore;
    if (my > opp) return 'win';
    if (my < opp) return 'loss';
    return 'draw';
  }

  opponentOf(m: RecentMatch, teamId: string) {
    return m.homeTeam?.id === teamId ? m.awayTeam : m.homeTeam;
  }
}
