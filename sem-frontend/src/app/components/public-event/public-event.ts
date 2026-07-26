import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { WorkspaceEvent } from '../../services/workspace.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar';
import { getSportBadgeClass, getSportIconClass } from '../../shared';

@Component({
  selector: 'app-public-event',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, AvatarComponent, FormsModule],
  templateUrl: './public-event.html',
})
export class PublicEventComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private eventService = inject(EventService);

  eventId = signal<string | null>(null);
  event = signal<WorkspaceEvent | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Tabs navigation
  activeTab = signal<'overview' | 'competitions' | 'stats' | 'gallery' | 'announcements'>('overview');

  // Competitions State
  selectedCompetition = signal<any | null>(null);
  stages = signal<any[]>([]);
  selectedStage = signal<any | null>(null);
  matches = signal<any[]>([]);
  selectedTeamFilter = signal<string>('all');
  filteredMatches = computed(() => {
    const list = this.matches();
    const teamFilter = this.selectedTeamFilter();
    if (teamFilter === 'all') return list;
    return list.filter(m => m.homeTeamId === teamFilter || m.awayTeamId === teamFilter);
  });
  selectedPointsTableGroup = signal<string>('Group A');
  isLoadingStages = signal<boolean>(false);
  isLoadingMatches = signal<boolean>(false);

  // Statistics State
  competitionStats = signal<any | null>(null);
  isLoadingStats = signal<boolean>(false);

  // Lightbox for Gallery
  selectedImage = signal<string | null>(null);

  // Exposed helper functions
  getSportBadgeClass = getSportBadgeClass;
  getSportIconClass = getSportIconClass;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.eventId.set(id);
        this.loadPublicEvent(id);
      } else {
        this.error.set('No event ID provided');
        this.isLoading.set(false);
      }
    });
  }

  loadPublicEvent(id: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.eventService.getPublicEvent(id).subscribe({
      next: (evt) => {
        this.event.set(evt);
        this.isLoading.set(false);

        // If there are competitions, select the first one by default
        if (evt.competitions && evt.competitions.length > 0) {
          this.selectCompetition(evt.competitions[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load public event', err);
        this.error.set(err.error?.message || 'Event not found or is not publicly accessible');
        this.isLoading.set(false);
      }
    });
  }

  selectCompetition(comp: any) {
    this.selectedCompetition.set(comp);
    this.selectedTeamFilter.set('all');
    this.stages.set([]);
    this.selectedStage.set(null);
    this.matches.set([]);
    this.competitionStats.set(null);

    const eventId = this.eventId();
    if (!eventId) return;

    this.isLoadingStages.set(true);
    this.eventService.getPublicStages(eventId, comp.id).subscribe({
      next: (stagesList) => {
        this.stages.set(stagesList);
        this.isLoadingStages.set(false);
        if (stagesList.length > 0) {
          this.selectStage(stagesList[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load public stages', err);
        this.isLoadingStages.set(false);
      }
    });

    // Also fetch stats for this competition
    this.loadCompetitionStats(comp.id);
  }

  selectStage(stage: any) {
    this.selectedStage.set(stage);
    this.selectedTeamFilter.set('all');
    this.matches.set([]);
    
    const eventId = this.eventId();
    const comp = this.selectedCompetition();
    if (!eventId || !comp) return;

    this.isLoadingMatches.set(true);
    this.eventService.getPublicMatches(eventId, comp.id, stage.id).subscribe({
      next: (matchesList) => {
        this.matches.set(matchesList);
        this.isLoadingMatches.set(false);

        // Auto-select points table group from matches if available
        const groups = this.availableGroups();
        if (groups.length > 0 && !groups.includes(this.selectedPointsTableGroup())) {
          this.selectedPointsTableGroup.set(groups[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load public matches', err);
        this.isLoadingMatches.set(false);
      }
    });
  }

  loadCompetitionStats(compId: string) {
    const eventId = this.eventId();
    if (!eventId) return;

    this.isLoadingStats.set(true);
    this.eventService.getPublicCompetitionStats(eventId, compId).subscribe({
      next: (stats) => {
        this.competitionStats.set(stats);
        this.isLoadingStats.set(false);
      },
      error: (err) => {
        console.error('Failed to load public stats', err);
        this.isLoadingStats.set(false);
      }
    });
  }

  // Computed properties for league/points table and groups
  availableGroups = computed(() => {
    const stage = this.selectedStage();
    if (!stage) return [];
    if (stage.type !== 'group_knockout') return [];
    const matchesList = this.matches();
    const groupsSet = new Set<string>();
    for (const m of matchesList) {
      if (m.config?.round) {
        const isGroup = m.config.round.toLowerCase().includes('group') || m.config.round.toLowerCase().includes('stage');
        if (isGroup) {
          groupsSet.add(m.config.round);
        }
      }
    }
    return Array.from(groupsSet).sort();
  });

  isStageCompleted = computed(() => {
    const list = this.matches();
    if (list.length === 0) return false;
    return list.every(m => m.status === 'completed');
  });

  leagueTable = computed(() => {
    const stage = this.selectedStage();
    if (!stage) return [];
    if (stage.type !== 'league' && stage.type !== 'group' && stage.type !== 'group_knockout') {
      return [];
    }

    const matchesList = this.matches();
    const enrolledTeams = this.event()?.teams ?? [];
    const currentGroup = this.selectedPointsTableGroup();
    const isMultipleGroups = stage.type === 'group_knockout' && stage.config?.groupKnockoutSubtype === 'multiple_groups';

    const groupTeamIds = new Set<string>();
    if (isMultipleGroups) {
      for (const m of matchesList) {
        if (m.config?.round === currentGroup) {
          if (m.homeTeamId) groupTeamIds.add(m.homeTeamId);
          if (m.awayTeamId) groupTeamIds.add(m.awayTeamId);
        }
      }
    }
    
    const statsMap = new Map<string, {
      teamId: string;
      teamName: string;
      teamLogoUrl?: string | null;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      gf: number;
      ga: number;
      gd: number;
      pts: number;
    }>();

    for (const t of enrolledTeams) {
      if (isMultipleGroups && !groupTeamIds.has(t.id)) {
        continue;
      }
      statsMap.set(t.id, {
        teamId: t.id,
        teamName: t.name,
        teamLogoUrl: t.logoUrl,
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0
      });
    }

    const winPts = stage.config?.winPoint ?? 3;
    const drawPts = stage.config?.drawPoint ?? 1;

    for (const match of matchesList) {
      const isGroupMatch = !match.config?.round || match.config.round.toLowerCase().includes('group') || match.config.round.toLowerCase().includes('stage');
      if (stage.type === 'group_knockout' && !isGroupMatch) {
        continue;
      }

      if (isMultipleGroups && match.config?.round !== currentGroup) {
        continue;
      }

      if (match.status !== 'completed') continue;
      if (!match.homeTeamId || !match.awayTeamId) continue;

      const home = statsMap.get(match.homeTeamId);
      const away = statsMap.get(match.awayTeamId);

      if (!home && match.homeTeam) {
        statsMap.set(match.homeTeamId, {
          teamId: match.homeTeamId, teamName: match.homeTeam.name, teamLogoUrl: match.homeTeam.logoUrl, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0
        });
      }
      if (!away && match.awayTeam) {
        statsMap.set(match.awayTeamId, {
          teamId: match.awayTeamId, teamName: match.awayTeam.name, teamLogoUrl: match.awayTeam.logoUrl, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0
        });
      }

      const h = statsMap.get(match.homeTeamId)!;
      const a = statsMap.get(match.awayTeamId)!;

      h.played++;
      a.played++;

      h.gf += match.homeScore ?? 0;
      h.ga += match.awayScore ?? 0;
      a.gf += match.awayScore ?? 0;
      a.ga += match.homeScore ?? 0;

      h.gd = h.gf - h.ga;
      a.gd = a.gf - a.ga;

      if ((match.homeScore ?? 0) > (match.awayScore ?? 0)) {
        h.won++;
        h.pts += winPts;
        a.lost++;
      } else if ((match.homeScore ?? 0) < (match.awayScore ?? 0)) {
        a.won++;
        a.pts += winPts;
        h.lost++;
      } else {
        h.drawn++;
        h.pts += drawPts;
        a.drawn++;
        a.pts += drawPts;
      }
    }

    return Array.from(statsMap.values()).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  });

  // Knockout rounds rendering helpers
  getKnockoutRounds(): string[] {
    const list = this.filteredMatches();
    const stage = this.selectedStage();
    if (!stage) return [];
    
    const roundsSet = new Set<string>();
    for (const m of list) {
      const round = m.config?.round;
      if (round) {
        const isGroup = round.toLowerCase().includes('group') || round.toLowerCase().includes('stage');
        if (stage.type === 'group_knockout' && isGroup) {
          continue;
        }
        roundsSet.add(round);
      }
    }
    
    const roundOrder = ['round of 32', 'round of 16', 'round of 8', 'quarter-final', 'semi-final', 'final', 'third place match', '3rd place match'];
    return Array.from(roundsSet).sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const idxA = roundOrder.findIndex(o => aLower.includes(o));
      const idxB = roundOrder.findIndex(o => bLower.includes(o));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }

  getMatchesForRound(roundName: string): any[] {
    return this.filteredMatches().filter(m => m.config?.round === roundName && (m.config?.leg === undefined || m.config?.leg === 1));
  }

  getStageWinnerAndRunnerUp(): { winner: string; runnerUp: string | null } | null {
    const stage = this.selectedStage();
    if (!stage) return null;
    if (stage.type !== 'knockout' && stage.type !== 'group_knockout') return null;
    
    const finalMatch = this.filteredMatches().find(m => m.config?.round?.toLowerCase().includes('final') && !m.config?.round?.toLowerCase().includes('semi') && !m.config?.round?.toLowerCase().includes('quarter'));
    if (!finalMatch || finalMatch.status !== 'completed') return null;
    
    const homeScore = finalMatch.homeScore ?? 0;
    const awayScore = finalMatch.awayScore ?? 0;
    if (homeScore > awayScore) {
      return {
        winner: finalMatch.homeTeam?.name || 'Home Team',
        runnerUp: finalMatch.awayTeam?.name || 'Away Team'
      };
    } else if (awayScore > homeScore) {
      return {
        winner: finalMatch.awayTeam?.name || 'Away Team',
        runnerUp: finalMatch.homeTeam?.name || 'Home Team'
      };
    }
    return null;
  }

  // General share helper
  shareEventLink() {
    if (navigator.share) {
      navigator.share({
        title: this.event()?.name || 'Sports Event',
        text: this.event()?.description || 'Check out this event!',
        url: window.location.href
      }).catch(err => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Event page link copied to clipboard!');
    }
  }
}
