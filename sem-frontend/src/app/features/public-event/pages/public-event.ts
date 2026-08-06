import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { EventService } from '../../events/services/event.service';
import { CompetitionService } from '../../competitions/services/competition.service';
import { WorkspaceEvent } from '../../workspaces/services/workspace.service';
import { SocketService } from '../../../core/services/socket.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { getSportBadgeClass, getSportIconClass } from '../../../shared';
import { GalleryPhoto, GalleryService } from '../../gallery/services/gallery.service';
import { ShareService } from '../../share/services/share.service';
import { PublicEventSponsor, SponsorService } from '../../sponsors/services/sponsor.service';
import { AdBannerComponent } from '../../ads/components/ad-banner/ad-banner';
import { LandingHeaderComponent } from '../../../layouts/landing-header/landing-header';

@Component({
  selector: 'app-public-event',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DatePipe,
    AvatarComponent,
    FormsModule,
    AdBannerComponent,
    LandingHeaderComponent,
  ],
  templateUrl: './public-event.html',
})
export class PublicEventComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private eventService = inject(EventService);
  private competitionService = inject(CompetitionService);
  private socketService = inject(SocketService);
  private galleryService = inject(GalleryService);
  private shareService = inject(ShareService);
  private sponsorService = inject(SponsorService);

  private pollSub: Subscription | null = null;
  private socketSub: Subscription | null = null;

  eventId = signal<string | null>(null);
  event = signal<WorkspaceEvent | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Selected Match for Live Scoreboard Modal
  selectedLiveMatch = signal<any | null>(null);
  liveClockSeconds = signal<number>(0);
  private clockInterval: any = null;

  // Tabs navigation
  activeTab = signal<
    | 'overview'
    | 'competitions'
    | 'standings'
    | 'results'
    | 'stats'
    | 'predictions'
    | 'gallery'
    | 'announcements'
  >('overview');

  /** Call this instead of activeTab.set() when navigating to standings so we auto-init */
  goToStandings() {
    this.activeTab.set('standings');
    if (!this.standingsComp()) {
      const comps = this.event()?.competitions;
      if (comps && comps.length > 0) this.selectStandingsCompetition(comps[0]);
    }
  }

  /** Call this instead of activeTab.set() when navigating to results so we auto-init */
  goToResults() {
    this.activeTab.set('results');
    if (!this.resultsComp()) {
      const comps = this.event()?.competitions;
      if (comps && comps.length > 0) this.selectResultsCompetition(comps[0]);
    }
  }

  /** Call this instead of activeTab.set() when navigating to predictions so we auto-init */
  goToPredictions() {
    this.activeTab.set('predictions');
    if (!this.predictionsComp()) {
      const comps = this.event()?.competitions;
      if (comps && comps.length > 0) this.selectPredictionsCompetition(comps[0]);
    }
  }

  // Results State
  resultsComp = signal<any | null>(null);
  resultsData = signal<any | null>(null);
  isLoadingResults = signal<boolean>(false);
  resultsError = signal<string | null>(null);
  resultsSearchQuery = signal<string>('');
  resultsSortOrder = signal<'desc' | 'asc'>('desc');

  // Predictions State
  predictionsComp = signal<any | null>(null);
  predictionsData = signal<any | null>(null);
  isLoadingPredictions = signal<boolean>(false);
  predictionsError = signal<string | null>(null);

  // Sharing State
  isShareModalOpen = signal<boolean>(false);
  shareTab = signal<'general' | 'fixtures' | 'standings' | 'results' | 'predictions'>('general');
  copySuccess = signal<boolean>(false);

  // Tournament Story State
  isStoryModalOpen = signal<boolean>(false);
  storyData = signal<any | null>(null);
  isLoadingStory = signal<boolean>(false);
  selectedStoryDay = signal<number | undefined>(undefined);
  storyCopySuccess = signal<boolean>(false);

  openStoryModal(day?: number) {
    const eventId = this.eventId();
    const compId = this.selectedCompetition()?.id || this.event()?.competitions?.[0]?.id;
    if (!eventId || !compId) return;

    this.isStoryModalOpen.set(true);
    this.isLoadingStory.set(true);
    if (day !== undefined) this.selectedStoryDay.set(day);

    this.eventService.getPublicTournamentStory(eventId, compId, this.selectedStoryDay()).subscribe({
      next: (data) => {
        this.storyData.set(data);
        this.isLoadingStory.set(false);
      },
      error: (err) => {
        console.error('Failed to load tournament story', err);
        this.isLoadingStory.set(false);
      },
    });
  }

  changeStoryDay(day: number) {
    this.selectedStoryDay.set(day);
    this.openStoryModal(day);
  }

  closeStoryModal() {
    this.isStoryModalOpen.set(false);
  }

  copyStoryText(text: string) {
    navigator.clipboard.writeText(text);
    this.storyCopySuccess.set(true);
    setTimeout(() => this.storyCopySuccess.set(false), 2000);
  }

  shareUrl = computed(() => {
    const base = window.location.origin + window.location.pathname;
    const tab = this.shareTab();
    const eventId = this.eventId();
    if (!eventId) return base;

    if (tab === 'fixtures') {
      const compId = this.selectedCompetition()?.id;
      return compId ? `${base}?tab=competitions&comp=${compId}` : `${base}?tab=competitions`;
    }
    if (tab === 'standings') {
      const compId = this.standingsComp()?.id;
      const stageId = this.standingsStage()?.id;
      if (compId && stageId) {
        return `${base}?tab=standings&comp=${compId}&stage=${stageId}`;
      }
      return `${base}?tab=standings`;
    }
    if (tab === 'results') {
      const compId = this.resultsComp()?.id;
      return compId ? `${base}?tab=results&comp=${compId}` : `${base}?tab=results`;
    }
    if (tab === 'predictions') {
      const compId = this.predictionsComp()?.id;
      return compId ? `${base}?tab=predictions&comp=${compId}` : `${base}?tab=predictions`;
    }
    return base; // general
  });

  shareTitle = computed(() => {
    const eventName = this.event()?.name ?? 'Sports Event';
    const tab = this.shareTab();
    if (tab === 'fixtures') return `Fixtures & Brackets for ${eventName}`;
    if (tab === 'standings') return `Live Standings for ${eventName}`;
    if (tab === 'results') return `Match Results for ${eventName}`;
    if (tab === 'predictions') return `AI Predictions for ${eventName}`;
    return eventName;
  });

  shareQrUrl = computed(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(this.shareUrl())}`;
  });

  filteredGroupedResults = computed(() => {
    const data = this.resultsData();
    if (!data || !data.groupedResults) return [];

    const query = this.resultsSearchQuery().toLowerCase().trim();
    const sort = this.resultsSortOrder();

    // Flatten all matches with their date context
    let allMatches: any[] = [];
    data.groupedResults.forEach((group: any) => {
      group.matches.forEach((m: any) => {
        allMatches.push({ ...m, dateContext: group.date });
      });
    });

    // Apply query filter (team name, stage name, venue name)
    if (query) {
      allMatches = allMatches.filter((m: any) => {
        const homeName = m.homeTeam?.name?.toLowerCase() ?? '';
        const awayName = m.awayTeam?.name?.toLowerCase() ?? '';
        const stageName = m.stage?.name?.toLowerCase() ?? '';
        const venueName = m.venue?.name?.toLowerCase() ?? '';
        return (
          homeName.includes(query) ||
          awayName.includes(query) ||
          stageName.includes(query) ||
          venueName.includes(query)
        );
      });
    }

    // Sort matches
    allMatches.sort((a, b) => {
      const dateA = a.scheduledAt
        ? new Date(a.scheduledAt).getTime()
        : new Date(a.completedAt).getTime();
      const dateB = b.scheduledAt
        ? new Date(b.scheduledAt).getTime()
        : new Date(b.completedAt).getTime();
      return sort === 'desc' ? dateB - dateA : dateA - dateB;
    });

    // Re-group by date
    const dateMap = new Map<string, any[]>();
    allMatches.forEach((m) => {
      const d = m.dateContext;
      if (!dateMap.has(d)) {
        dateMap.set(d, []);
      }
      dateMap.get(d)!.push(m);
    });

    // Sort group dates according to sort order
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => {
      return sort === 'desc' ? b.localeCompare(a) : a.localeCompare(b);
    });

    return sortedDates.map((date) => ({
      date,
      matches: dateMap.get(date)!,
    }));
  });

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
    return list.filter((m) => m.homeTeamId === teamFilter || m.awayTeamId === teamFilter);
  });
  selectedPointsTableGroup = signal<string>('Group A');
  isLoadingStages = signal<boolean>(false);
  isLoadingMatches = signal<boolean>(false);

  // Statistics State
  competitionStats = signal<any | null>(null);
  isLoadingStats = signal<boolean>(false);

  // ─── Standings State ──────────────────────────────────────────────────────
  standingsComp = signal<any | null>(null); // selected competition for standings tab
  standingsStages = signal<any[]>([]);
  standingsStage = signal<any | null>(null);
  standingsData = signal<any | null>(null); // server-computed standings response
  standingsGroup = signal<string>(''); // for group_knockout group filter
  isLoadingStandings = signal<boolean>(false);
  standingsError = signal<string | null>(null);

  // Groups available inside the current standings stage
  standingsGroups = computed(() => {
    const data = this.standingsData();
    if (!data?.table) return [];
    const groups = new Set<string>();
    const matches = (data as any)._allGroupMatches ?? [];
    matches.forEach((m: any) => {
      if (m.config?.round) groups.add(m.config.round);
    });
    // fall back: infer from bracket data
    return Array.from(groups);
  });

  // Filtered league table by current group selection
  filteredTable = computed(() => {
    const data = this.standingsData();
    if (!data?.table) return [];
    // table is already server-computed; just return as-is (groups are separate rows)
    return data.table;
  });

  // Lightbox for Gallery
  selectedImage = signal<string | null>(null);

  // Relational sponsors (new sponsors + event_sponsors tables)
  relationalSponsors = signal<PublicEventSponsor[]>([]);

  /**
   * Unified list of sponsors for public display. Combines the new
   * relational sponsors (workspace catalog attachments) with the legacy
   * `evt.sponsors[]` JSONB list, deduped by lowercase name so orgs who
   * migrated some but not all sponsors don't see duplicates.
   */
  allSponsors = computed(() => {
    const relational = this.relationalSponsors();
    const legacy = this.event()?.sponsors ?? [];
    const seen = new Set<string>();
    const merged: Array<{
      key: string;
      name: string;
      logoUrl?: string | null;
      url?: string | null;
      tier?: string | null;
      description?: string | null;
    }> = [];
    for (const s of relational) {
      const key = s.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({
        key: s.id,
        name: s.name,
        logoUrl: s.logoUrl,
        url: s.websiteUrl,
        tier: s.tier,
        description: s.description,
      });
    }
    for (const s of legacy) {
      const key = (s.name ?? '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push({
        key: s.id,
        name: s.name,
        logoUrl: s.logoUrl ?? null,
        url: s.url ?? null,
        tier: s.tier ?? null,
        description: null,
      });
    }
    return merged;
  });

  // Organized gallery photos (new gallery_photos table)
  galleryPhotos = signal<GalleryPhoto[]>([]);
  isLoadingGallery = signal<boolean>(false);
  galleryLoaded = signal<boolean>(false);
  galleryFilter = signal<'all' | 'event' | 'comp'>('all');
  galleryCompFilterId = signal<string | null>(null);

  filteredGalleryPhotos = computed(() => {
    const filter = this.galleryFilter();
    const list = this.galleryPhotos();
    if (filter === 'all') return list;
    if (filter === 'event') {
      return list.filter((p) => !p.competitionId && !p.matchId);
    }
    const cid = this.galleryCompFilterId();
    return list.filter((p) => p.competitionId === cid);
  });

  galleryCompetitionsWithPhotos = computed(() => {
    const evtComps = this.event()?.competitions ?? [];
    const seen = new Set<string>();
    for (const p of this.galleryPhotos()) {
      if (p.competitionId) seen.add(p.competitionId);
    }
    return evtComps.filter((c: any) => seen.has(c.id));
  });

  galleryCountByComp(compId: string): number {
    return this.galleryPhotos().filter((p) => p.competitionId === compId).length;
  }

  galleryEventLevelCount = computed(
    () => this.galleryPhotos().filter((p) => !p.competitionId && !p.matchId).length,
  );

  thumbFor(url: string): string {
    return this.galleryService.optimize(url, { width: 500 });
  }

  goToGallery() {
    this.activeTab.set('gallery');
    if (!this.galleryLoaded()) this.loadGalleryPhotos();
  }

  setGalleryFilter(kind: 'all' | 'event' | 'comp', compId: string | null = null) {
    this.galleryFilter.set(kind);
    this.galleryCompFilterId.set(compId);
  }

  loadGalleryPhotos() {
    const id = this.eventId();
    if (!id) return;
    this.isLoadingGallery.set(true);
    this.galleryService.listPublicPhotos(id).subscribe({
      next: (list) => {
        this.galleryPhotos.set(list);
        this.isLoadingGallery.set(false);
        this.galleryLoaded.set(true);
      },
      error: () => {
        this.isLoadingGallery.set(false);
        this.galleryLoaded.set(true);
      },
    });
  }

  // Exposed helper functions
  getSportBadgeClass = getSportBadgeClass;
  getSportIconClass = getSportIconClass;

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.eventId.set(id);
        this.loadPublicEvent(id);
      } else {
        this.error.set('No event ID provided');
        this.isLoading.set(false);
      }
    });

    // Subscribe to real-time match updates via Socket.IO
    this.socketSub = this.socketService.matchUpdated$.subscribe((updatedMatch) => {
      if (!updatedMatch) return;

      // Update matches list
      this.matches.update((list) =>
        list.map((m) => (m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m)),
      );

      // Update selected live match details
      this.selectedLiveMatch.update((m) => {
        if (m && m.id === updatedMatch.id) {
          // Restart live clock with the fresh liveData
          this.startLiveClock(updatedMatch);
          return { ...m, ...updatedMatch };
        }
        return m;
      });

      // Update results tab data
      this.resultsData.update((data) => {
        if (!data || !data.groupedResults) return data;
        const updatedGrouped = data.groupedResults.map((group: any) => ({
          ...group,
          matches: group.matches.map((m: any) =>
            m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m,
          ),
        }));
        return { ...data, groupedResults: updatedGrouped };
      });

      // Update standings tab data (bracket)
      this.standingsData.update((data) => {
        if (!data) return data;
        let updatedBracket = data.bracket;
        if (data.bracket) {
          updatedBracket = data.bracket.map((roundBlock: any) => ({
            ...roundBlock,
            matches: roundBlock.matches.map((m: any) =>
              m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m,
            ),
          }));
        }
        return { ...data, bracket: updatedBracket };
      });

      // If the standings tab is active, silently reload standings to update points, tie-breakers, and brackets in real time
      if (this.activeTab() === 'standings') {
        this.loadStandings(true);
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

        // Fire-and-forget: sponsors are a nice-to-have. Silent failure —
        // if the endpoint is unavailable we still render the legacy
        // evt.sponsors[] list below.
        this.sponsorService.listPublicForEvent(evt.id).subscribe({
          next: (sponsors) => this.relationalSponsors.set(sponsors),
          error: () => this.relationalSponsors.set([]),
        });

        this.shareService.setPageMeta({
          title: evt.name,
          description:
            evt.description ??
            `${evt.venue ?? 'Sports event'}${
              evt.startDate ? ' · ' + new Date(evt.startDate).toDateString() : ''
            }`,
          image: evt.logoUrl,
          url: this.shareService.spaUrl('events', evt.id),
        });

        if (evt.workspaceId) {
          this.socketService.subscribeWorkspace(evt.workspaceId);
        }

        // Check query parameters to select target competition or tab
        const tab = this.route.snapshot.queryParamMap.get('tab') as any;
        const compId = this.route.snapshot.queryParamMap.get('comp');
        const stageId = this.route.snapshot.queryParamMap.get('stage') || undefined;

        let targetComp = evt.competitions?.[0];
        if (compId && evt.competitions) {
          const found = evt.competitions.find((c: any) => c.id === compId);
          if (found) targetComp = found;
        }

        if (tab) {
          this.activeTab.set(tab);
          if (tab === 'standings') {
            if (targetComp) this.selectStandingsCompetition(targetComp, stageId);
          } else if (tab === 'results') {
            if (targetComp) this.selectResultsCompetition(targetComp);
          } else if (tab === 'predictions') {
            if (targetComp) this.selectPredictionsCompetition(targetComp);
          } else if (tab === 'gallery') {
            this.loadGalleryPhotos();
            if (targetComp) this.selectCompetition(targetComp, stageId);
          } else {
            if (targetComp) this.selectCompetition(targetComp, stageId);
          }
        } else {
          if (targetComp) this.selectCompetition(targetComp, stageId);
        }
      },
      error: (err) => {
        console.error('Failed to load public event', err);
        this.error.set(err.error?.message || 'Event not found or is not publicly accessible');
        this.isLoading.set(false);
      },
    });
  }

  selectCompetition(comp: any, targetStageId?: string) {
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
          let selected = stagesList[0];
          if (targetStageId) {
            const found = stagesList.find((s: any) => s.id === targetStageId);
            if (found) selected = found;
          }
          this.selectStage(selected);
        }
      },
      error: (err) => {
        console.error('Failed to load public stages', err);
        this.isLoadingStages.set(false);
      },
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
      },
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
      },
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
        const isGroup =
          m.config.round.toLowerCase().includes('group') ||
          m.config.round.toLowerCase().includes('stage');
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
    return list.every((m) => m.status === 'completed');
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
    const isMultipleGroups =
      stage.type === 'group_knockout' && stage.config?.groupKnockoutSubtype === 'multiple_groups';

    const groupTeamIds = new Set<string>();
    if (isMultipleGroups) {
      for (const m of matchesList) {
        if (m.config?.round === currentGroup) {
          if (m.homeTeamId) groupTeamIds.add(m.homeTeamId);
          if (m.awayTeamId) groupTeamIds.add(m.awayTeamId);
        }
      }
    }

    const statsMap = new Map<
      string,
      {
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
      }
    >();

    for (const t of enrolledTeams) {
      if (isMultipleGroups && !groupTeamIds.has(t.id)) {
        continue;
      }
      statsMap.set(t.id, {
        teamId: t.id,
        teamName: t.name,
        teamLogoUrl: t.logoUrl,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
      });
    }

    const winPts = stage.config?.winPoint ?? 3;
    const drawPts = stage.config?.drawPoint ?? 1;

    for (const match of matchesList) {
      const isGroupMatch =
        !match.config?.round ||
        match.config.round.toLowerCase().includes('group') ||
        match.config.round.toLowerCase().includes('stage');
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
          teamId: match.homeTeamId,
          teamName: match.homeTeam.name,
          teamLogoUrl: match.homeTeam.logoUrl,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          pts: 0,
        });
      }
      if (!away && match.awayTeam) {
        statsMap.set(match.awayTeamId, {
          teamId: match.awayTeamId,
          teamName: match.awayTeam.name,
          teamLogoUrl: match.awayTeam.logoUrl,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          pts: 0,
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
        const isGroup =
          round.toLowerCase().includes('group') || round.toLowerCase().includes('stage');
        if (stage.type === 'group_knockout' && isGroup) {
          continue;
        }
        roundsSet.add(round);
      }
    }

    const roundOrder = [
      'round of 32',
      'round of 16',
      'round of 8',
      'quarter-final',
      'semi-final',
      'final',
      'third place match',
      '3rd place match',
    ];
    return Array.from(roundsSet).sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const idxA = roundOrder.findIndex((o) => aLower.includes(o));
      const idxB = roundOrder.findIndex((o) => bLower.includes(o));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }

  getMatchesForRound(roundName: string): any[] {
    return this.filteredMatches().filter(
      (m) => m.config?.round === roundName && (m.config?.leg === undefined || m.config?.leg === 1),
    );
  }

  getStageWinnerAndRunnerUp(): { winner: string; runnerUp: string | null } | null {
    const stage = this.selectedStage();
    if (!stage) return null;
    if (stage.type !== 'knockout' && stage.type !== 'group_knockout') return null;

    const finalMatch = this.filteredMatches().find(
      (m) =>
        m.config?.round?.toLowerCase().includes('final') &&
        !m.config?.round?.toLowerCase().includes('semi') &&
        !m.config?.round?.toLowerCase().includes('quarter'),
    );
    if (!finalMatch || finalMatch.status !== 'completed') return null;

    const homeScore = finalMatch.homeScore ?? 0;
    const awayScore = finalMatch.awayScore ?? 0;
    if (homeScore > awayScore) {
      return {
        winner: finalMatch.homeTeam?.name || 'Home Team',
        runnerUp: finalMatch.awayTeam?.name || 'Away Team',
      };
    } else if (awayScore > homeScore) {
      return {
        winner: finalMatch.awayTeam?.name || 'Away Team',
        runnerUp: finalMatch.homeTeam?.name || 'Home Team',
      };
    }
    return null;
  }

  // Sharing helper methods
  shareEventLink() {
    this.openShareModal('general');
  }

  openShareModal(
    tabType: 'general' | 'fixtures' | 'standings' | 'results' | 'predictions' = 'general',
  ) {
    this.shareTab.set(tabType);
    this.isShareModalOpen.set(true);
  }

  closeShareModal() {
    this.isShareModalOpen.set(false);
    this.copySuccess.set(false);
  }

  copyShareLink() {
    navigator.clipboard.writeText(this.shareUrl());
    this.copySuccess.set(true);
    setTimeout(() => this.copySuccess.set(false), 2000);
  }

  shareSocial(platform: 'whatsapp' | 'twitter' | 'facebook' | 'telegram' | 'email') {
    const title = this.shareTitle();
    const url = this.shareUrl();

    let shareLink = '';
    if (platform === 'whatsapp') {
      shareLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ': ' + url)}`;
    } else if (platform === 'twitter') {
      shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    } else if (platform === 'facebook') {
      shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    } else if (platform === 'telegram') {
      shareLink = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    } else if (platform === 'email') {
      shareLink = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('Check this out: ' + url)}`;
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'noopener,noreferrer');
    }
  }

  // ─── Standings Tab Logic ───────────────────────────────────────────────────

  selectStandingsCompetition(comp: any, targetStageId?: string) {
    this.standingsComp.set(comp);
    this.standingsStages.set([]);
    this.standingsStage.set(null);
    this.standingsData.set(null);
    this.standingsError.set(null);
    this.stopPolling();

    const eventId = this.eventId();
    if (!eventId) return;

    this.eventService.getPublicStages(eventId, comp.id).subscribe({
      next: (stages) => {
        this.standingsStages.set(stages);
        if (stages.length > 0) {
          let selected = stages[0];
          if (targetStageId) {
            const found = stages.find((s: any) => s.id === targetStageId);
            if (found) selected = found;
          }
          this.selectStandingsStage(selected);
        }
      },
      error: () => this.standingsError.set('Failed to load stages'),
    });
  }

  selectStandingsStage(stage: any) {
    this.standingsStage.set(stage);
    this.standingsData.set(null);
    this.standingsError.set(null);
    this.stopPolling();
    this.loadStandings();
    this.startPolling();
  }

  loadStandings(silent = false) {
    const eventId = this.eventId();
    const comp = this.standingsComp();
    const stage = this.standingsStage();
    if (!eventId || !comp || !stage) return;

    if (!silent) {
      this.isLoadingStandings.set(true);
    }
    this.eventService.getPublicStandings(eventId, comp.id, stage.id).subscribe({
      next: (data) => {
        this.standingsData.set(data);
        this.isLoadingStandings.set(false);
        // Stop polling if no more live matches
        const hasLive = (data?.progress?.live ?? 0) > 0;
        if (!hasLive) this.stopPolling();
      },
      error: (err) => {
        this.standingsError.set(err.error?.message ?? 'Failed to load standings');
        this.isLoadingStandings.set(false);
      },
    });
  }

  private startPolling() {
    this.stopPolling();
    // Poll every 30s — will self-stop when no live matches remain
    this.pollSub = interval(30_000)
      .pipe(
        switchMap(() => {
          const eventId = this.eventId();
          const comp = this.standingsComp();
          const stage = this.standingsStage();
          if (!eventId || !comp || !stage) return [];
          return this.eventService.getPublicStandings(eventId, comp.id, stage.id);
        }),
      )
      .subscribe({
        next: (data) => {
          this.standingsData.set(data);
          const hasLive = (data?.progress?.live ?? 0) > 0;
          if (!hasLive) this.stopPolling();
        },
      });
  }

  openLiveScoreboard(match: any) {
    this.selectedLiveMatch.set(match);
    this.socketService.subscribeMatch(match.id);
    this.startLiveClock(match);
  }

  closeLiveScoreboard() {
    const match = this.selectedLiveMatch();
    if (match) {
      this.socketService.unsubscribeMatch(match.id);
    }
    this.selectedLiveMatch.set(null);
    this.stopLiveClock();
  }

  startLiveClock(match: any) {
    this.stopLiveClock();
    if (match.status !== 'live' || match.sport?.code !== 'football') return;

    const liveData = match.liveData || {};
    const baseSeconds = liveData.elapsedSeconds || 0;
    const isRunning = liveData.timerRunning;
    const lastStarted = liveData.timerLastStarted;

    if (isRunning && lastStarted) {
      const startMs = new Date(lastStarted).getTime();
      const updateClock = () => {
        const diffSec = Math.floor((Date.now() - startMs) / 1000);
        this.liveClockSeconds.set(baseSeconds + diffSec);
      };
      updateClock();
      this.clockInterval = setInterval(updateClock, 1000);
    } else {
      this.liveClockSeconds.set(baseSeconds);
    }
  }

  stopLiveClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  formatFootballClock(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getPlayerName(
    match: any,
    playerUserId: string | undefined,
    defaultName: string | undefined,
  ): string {
    if (defaultName) return defaultName;
    if (!playerUserId) return 'Unknown Player';
    const player = match.players?.find(
      (p: any) => p.playerUserId === playerUserId || p.playerId === playerUserId,
    );
    return player ? player.playerName : 'Player';
  }

  private stopPolling() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = null;
    }
  }

  ngOnDestroy() {
    this.stopPolling();
    this.stopLiveClock();
    if (this.socketSub) {
      this.socketSub.unsubscribe();
    }
    const evt = this.event();
    if (evt?.workspaceId) {
      this.socketService.unsubscribeWorkspace(evt.workspaceId);
    }
    const match = this.selectedLiveMatch();
    if (match) {
      this.socketService.unsubscribeMatch(match.id);
    }
  }

  // Helper to get position colour class
  positionClass(pos: number, total: number): string {
    if (pos === 1) return 'border-l-4 border-l-emerald-500 bg-emerald-500/5';
    if (pos === 2) return 'border-l-4 border-l-amber-500 bg-amber-500/5';
    if (pos === total) return 'border-l-4 border-l-rose-500 bg-rose-500/5';
    return '';
  }

  positionBadgeClass(pos: number): string {
    if (pos === 1) return 'text-emerald-400 font-black';
    if (pos === 2) return 'text-amber-400 font-black';
    return 'text-slate-400';
  }

  // ─── Results Tab Logic ──────────────────────────────────────────────────────

  selectResultsCompetition(comp: any) {
    this.resultsComp.set(comp);
    this.resultsData.set(null);
    this.resultsError.set(null);
    this.loadResults();
  }

  loadResults() {
    const eventId = this.eventId();
    const comp = this.resultsComp();
    if (!eventId || !comp) return;

    this.isLoadingResults.set(true);
    this.eventService.getPublicResults(eventId, comp.id).subscribe({
      next: (data) => {
        this.resultsData.set(data);
        this.isLoadingResults.set(false);
      },
      error: (err) => {
        this.resultsError.set(err.error?.message ?? 'Failed to load results');
        this.isLoadingResults.set(false);
      },
    });
  }

  // ─── Predictions Tab Logic ──────────────────────────────────────────────────

  selectPredictionsCompetition(comp: any) {
    this.predictionsComp.set(comp);
    this.predictionsData.set(null);
    this.predictionsError.set(null);
    this.loadPredictions();
  }

  loadPredictions() {
    const eventId = this.eventId();
    const comp = this.predictionsComp();
    if (!eventId || !comp) return;

    this.isLoadingPredictions.set(true);
    this.competitionService.getPublicPredictions(eventId, comp.id).subscribe({
      next: (data) => {
        this.predictionsData.set(data);
        this.isLoadingPredictions.set(false);
      },
      error: (err) => {
        this.predictionsError.set(err.error?.message ?? 'Failed to load predictions');
        this.isLoadingPredictions.set(false);
      },
    });
  }
}
