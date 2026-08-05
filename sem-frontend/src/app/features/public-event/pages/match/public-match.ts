import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventService } from '../../../events/services/event.service';
import { ShareService } from '../../../share/services/share.service';
import { ShareButtonComponent } from '../../../share/components/share-button';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';
import { getSportBadgeClass, getSportIconClass } from '../../../../shared';
import { LandingHeaderComponent } from '../../../../layouts/landing-header/landing-header';

interface HighlightVideo {
  id: string;
  platform: 'youtube' | 'vimeo' | 'other';
  url: string;
  title?: string | null;
  thumbnailUrl?: string | null;
}

interface MatchDetails {
  id: string;
  status: string;
  scheduledAt: string | null;
  homeScore: number;
  awayScore: number;
  config?: any;
  liveData?: any;
  summary: string | null;
  highlightVideos: HighlightVideo[];
  homeTeam: {
    id: string;
    name: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
  } | null;
  awayTeam: {
    id: string;
    name: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
  } | null;
  venue: { id: string; name: string } | null;
  stage: { id: string; name: string; type: string };
  competition: {
    id: string;
    name: string;
    sport: { id: string; code: string; name: string } | null;
  };
  event: {
    id: string;
    name: string;
    slug?: string | null;
    logoUrl?: string | null;
  };
  players: Array<{
    playerId: string;
    playerUserId: string | null;
    playerName: string;
    teamId: string;
    teamName: string | null;
    isPlaying: boolean;
    rating: number | null;
  }>;
}

interface TimelineEvent {
  kind: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'sub' | 'wicket' | 'award' | 'note';
  minute?: number | null;
  half?: number | null;
  over?: string | null;
  teamSide?: 'home' | 'away' | null;
  icon: string;
  colorClass: string;
  label: string;
  detail?: string;
}

@Component({
  selector: 'app-public-match',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DatePipe,
    AvatarComponent,
    ShareButtonComponent,
    LandingHeaderComponent,
  ],
  templateUrl: './public-match.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicMatchComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private eventService = inject(EventService);
  private shareService = inject(ShareService);
  private sanitizer = inject(DomSanitizer);

  match = signal<MatchDetails | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  getSportBadgeClass = getSportBadgeClass;
  getSportIconClass = getSportIconClass;

  timeline = computed<TimelineEvent[]>(() => {
    const m = this.match();
    if (!m) return [];
    const sport = m.competition.sport?.code ?? 'football';
    const live = m.liveData ?? {};
    const raw: any[] = Array.isArray(live.events) ? live.events : [];

    const events: TimelineEvent[] = raw.map((ev) => this.mapEvent(ev, sport, m));

    if (sport === 'cricket') {
      const innings: any[] = live.inningsData ?? [];
      for (const inn of innings) {
        const wickets: any[] = inn.wicketsList ?? inn.wickets ?? [];
        if (Array.isArray(wickets)) {
          for (const w of wickets) {
            events.push({
              kind: 'wicket',
              over: w.overs ?? w.over ?? null,
              teamSide: null,
              icon: 'fi fi-rr-bowling',
              colorClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
              label: w.batsman ? `${w.batsman} out` : 'Wicket',
              detail: w.method ? `${w.method}${w.bowler ? ` · b ${w.bowler}` : ''}` : undefined,
            });
          }
        }
      }
    }

    // Chronological order — falls back to insertion order when minute missing
    events.sort((a, b) => {
      const am = a.minute ?? -1;
      const bm = b.minute ?? -1;
      return am - bm;
    });
    return events;
  });

  highlightVideoUrls = computed<
    Array<{ id: string; embed: SafeResourceUrl | null; raw: HighlightVideo }>
  >(() => {
    const list = this.match()?.highlightVideos ?? [];
    return list.map((v) => {
      const embed = this.embedUrlFor(v);
      return {
        id: v.id,
        raw: v,
        embed: embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null,
      };
    });
  });

  ratedPlayers = computed(() => {
    const m = this.match();
    if (!m) return [];
    return [...m.players]
      .filter((p) => p.rating !== null && p.rating !== undefined)
      .sort((a, b) => Number(b.rating) - Number(a.rating))
      .slice(0, 8);
  });

  matchId = computed(() => this.match()?.id ?? '');
  matchTitle = computed(() => {
    const m = this.match();
    if (!m) return 'Match';
    const home = m.homeTeam?.name ?? 'Home';
    const away = m.awayTeam?.name ?? 'Away';
    return `${home} ${m.homeScore ?? 0} – ${m.awayScore ?? 0} ${away}`;
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.error.set('No match ID provided');
        this.isLoading.set(false);
        return;
      }
      this.load(id);
    });
  }

  private load(id: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.eventService.getPublicMatch(id).subscribe({
      next: (data) => {
        this.match.set(data);
        this.isLoading.set(false);
        // Set Meta / OG tags on load
        const m = this.match();
        if (m) {
          const home = m.homeTeam?.name ?? 'Home';
          const away = m.awayTeam?.name ?? 'Away';
          this.shareService.setPageMeta({
            title: `${home} ${m.homeScore ?? 0}–${m.awayScore ?? 0} ${away}`,
            description:
              m.summary ??
              `${m.competition.name} · ${m.event.name}${m.venue ? ` · ${m.venue.name}` : ''}`,
            image: m.event.logoUrl ?? m.homeTeam?.logoUrl ?? null,
            url: this.shareService.spaUrl('matches', m.id),
          });
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Match not found or is not public');
        this.isLoading.set(false);
      },
    });
  }

  private embedUrlFor(v: HighlightVideo): string | null {
    if (v.platform === 'youtube') {
      const id = this.parseYouTubeId(v.url);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (v.platform === 'vimeo') {
      const id = this.parseVimeoId(v.url);
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  }

  private parseYouTubeId(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
      if (u.hostname.endsWith('youtube.com')) {
        if (u.pathname === '/watch') return u.searchParams.get('v');
        if (u.pathname.startsWith('/embed/')) return u.pathname.slice(7);
        if (u.pathname.startsWith('/shorts/')) return u.pathname.slice(8);
      }
    } catch {
      /* invalid URL */
    }
    return null;
  }

  private parseVimeoId(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname.endsWith('vimeo.com')) {
        const m = u.pathname.match(/\/(\d+)/);
        return m ? m[1] : null;
      }
    } catch {
      /* invalid URL */
    }
    return null;
  }

  private mapEvent(ev: any, sport: string, m: MatchDetails): TimelineEvent {
    const minute = ev.minute ?? ev.min ?? null;
    const side: 'home' | 'away' | null =
      ev.teamSide ??
      (ev.teamId && m.homeTeam?.id === ev.teamId
        ? 'home'
        : ev.teamId && m.awayTeam?.id === ev.teamId
          ? 'away'
          : null);
    const playerName = this.resolvePlayerName(ev, m);
    const assistName = this.resolveAssistName(ev, m);

    if (ev.type === 'goal') {
      return {
        kind: 'goal',
        minute,
        half: ev.half ?? null,
        teamSide: side,
        icon: 'fi fi-rr-football',
        colorClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        label: `${playerName} scores`,
        detail: assistName ? `Assist: ${assistName}` : ev.goalType,
      };
    }
    if (ev.type === 'assist') {
      return {
        kind: 'assist',
        minute,
        half: ev.half ?? null,
        teamSide: side,
        icon: 'fi fi-rr-hand-holding-heart',
        colorClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        label: `Assist by ${playerName}`,
      };
    }
    if (ev.type === 'yellow_card') {
      return {
        kind: 'yellow_card',
        minute,
        teamSide: side,
        icon: 'fi fi-rr-square',
        colorClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        label: `Yellow card · ${playerName}`,
        detail: ev.reason,
      };
    }
    if (ev.type === 'red_card') {
      return {
        kind: 'red_card',
        minute,
        teamSide: side,
        icon: 'fi fi-rr-square',
        colorClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        label: `Red card · ${playerName}`,
        detail: ev.reason,
      };
    }
    if (ev.type === 'substitution' || ev.type === 'sub') {
      const inName = this.resolvePlayerNameById(ev.playerInId ?? ev.playerInUserId, m);
      const outName = this.resolvePlayerNameById(ev.playerOutId ?? ev.playerOutUserId, m);
      return {
        kind: 'sub',
        minute,
        teamSide: side,
        icon: 'fi fi-rr-refresh',
        colorClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
        label: 'Substitution',
        detail: inName && outName ? `${outName} → ${inName}` : undefined,
      };
    }
    if (ev.type === 'wicket') {
      return {
        kind: 'wicket',
        over: ev.over ?? null,
        teamSide: side,
        icon: 'fi fi-rr-bowling',
        colorClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        label: playerName ? `${playerName} out` : 'Wicket',
        detail: ev.method,
      };
    }
    return {
      kind: 'note',
      minute,
      teamSide: side,
      icon: 'fi fi-rr-info',
      colorClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
      label: ev.type ? String(ev.type) : 'Event',
    };
  }

  private resolvePlayerName(ev: any, m: MatchDetails): string {
    if (ev.playerName) return ev.playerName;
    return this.resolvePlayerNameById(ev.playerId ?? ev.playerUserId, m);
  }

  private resolveAssistName(ev: any, m: MatchDetails): string {
    return this.resolvePlayerNameById(ev.assistPlayerId ?? ev.assistPlayerUserId, m);
  }

  private resolvePlayerNameById(id: string | undefined | null, m: MatchDetails): string {
    if (!id) return '';
    const found = m.players.find((p) => p.playerId === id || p.playerUserId === id);
    return found?.playerName ?? '';
  }

  teamSideClass(side: 'home' | 'away' | null): string {
    if (side === 'home') return 'border-l-emerald-500';
    if (side === 'away') return 'border-l-cyan-500';
    return 'border-l-slate-600';
  }

  teamSideLabel(side: 'home' | 'away' | null, m: MatchDetails): string {
    if (side === 'home') return m.homeTeam?.name ?? 'Home';
    if (side === 'away') return m.awayTeam?.name ?? 'Away';
    return '';
  }
}
