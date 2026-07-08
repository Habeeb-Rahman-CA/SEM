import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceService, Workspace, WorkspaceMember, Role, Team, Player, WorkspaceEvent, Sport, Competition, CompetitionStage, CompetitionTeam, Match, Venue, PointsConfigEntry } from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';

declare const L: any;

@Component({
  selector: 'app-workspace-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './workspace-detail.html',
  styleUrl: './workspace-detail.css',
})
export class WorkspaceDetailComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private uiService = inject(UiService);

  map: any = null;
  marker: any = null;

  workspace = signal<Workspace | null>(null);
  members = signal<WorkspaceMember[]>([]);
  roles = signal<Role[]>([]);
  isLoading = signal(true);
  error = signal('');
  activeTab = signal<'overview' | 'members' | 'settings' | 'teams' | 'players' | 'events' | 'venues'>('overview');
  isSidebarOpen = signal(false);

  // Image Upload Loading States
  isUploadingAvatar = signal(false);
  isUploadingWorkspaceLogo = signal(false);
  isUploadingTeamLogo = signal(false);
  isUploadingEventLogo = signal(false);

  // ── Teams State ────────────────────────────────────────────────────────────
  teams = signal<Team[]>([]);
  isTeamModalOpen = signal(false);
  newTeamName = signal('');
  newTeamCode = signal('');
  newTeamDescription = signal('');
  newTeamLogoUrl = signal('');
  isCreatingTeam = signal(false);
  teamCreateError = signal('');
  teamCreateSuccess = signal('');

  // Bulk Import Teams State
  isBulkModalOpen = signal(false);
  isImportingBulk = signal(false);
  bulkImportProgress = signal(0);
  bulkImportTeams = signal<any[]>([]);
  bulkImportError = signal('');
  bulkImportSuccess = signal('');

  // Editing state for Teams
  editingTeam = signal<Team | null>(null);
  editTeamName = signal('');
  editTeamCode = signal('');
  editTeamDescription = signal('');
  editTeamLogoUrl = signal('');
  isUpdatingTeam = signal(false);
  teamUpdateError = signal('');
  teamUpdateSuccess = signal('');

  // ── Players State ──────────────────────────────────────────────────────────
  players = signal<Player[]>([]);
  isPlayerModalOpen = signal(false);
  newPlayerUserId = signal('');
  newPlayerJerseyNumber = signal('');
  newPlayerTeamId = signal('');
  isCreatingPlayer = signal(false);
  playerCreateError = signal('');
  playerCreateSuccess = signal('');

  // Bulk Import Players State
  isPlayerBulkModalOpen = signal(false);
  isImportingPlayerBulk = signal(false);
  playerBulkImportProgress = signal(0);
  bulkImportPlayers = signal<any[]>([]);
  playerBulkImportError = signal('');
  playerBulkImportSuccess = signal('');

  // Editing state for Players
  editingPlayer = signal<Player | null>(null);
  editPlayerJerseyNumber = signal('');
  editPlayerTeamId = signal('');
  isUpdatingPlayer = signal(false);
  playerUpdateError = signal('');
  playerUpdateSuccess = signal('');

  // ── Events State ────────────────────────────────────────────────────────────
  events = signal<WorkspaceEvent[]>([]);
  newEventName = signal('');
  newEventDescription = signal('');
  newEventStartDate = signal('');
  newEventEndDate = signal('');
  newEventStatus = signal('upcoming');
  newEventLogoUrl = signal('');
  selectedEventTeamIds = signal<string[]>([]);
  isCreatingEvent = signal(false);
  eventCreateError = signal('');
  eventCreateSuccess = signal('');
  isEventModalOpen = signal(false);

  // Editing state for Events
  editingEvent = signal<WorkspaceEvent | null>(null);
  editEventName = signal('');
  editEventDescription = signal('');
  editEventStartDate = signal('');
  editEventEndDate = signal('');
  editEventStatus = signal('upcoming');
  editEventLogoUrl = signal('');
  isUpdatingEvent = signal(false);
  eventUpdateError = signal('');
  eventUpdateSuccess = signal('');

  // ── Competitions State ───────────────────────────────────────────────────────
  sports = signal<Sport[]>([]);
  selectedEvent = signal<WorkspaceEvent | null>(null);
  competitions = signal<Competition[]>([]);
  isLoadingCompetitions = signal(false);
  isCompetitionModalOpen = signal(false);
  
  newCompetitionName = signal('');
  newCompetitionSportId = signal('');
  newCompetitionStatus = signal('upcoming');
  newCompetitionPointsConfig = signal<PointsConfigEntry[]>([]);
  isCreatingCompetition = signal(false);
  competitionCreateError = signal('');
  competitionCreateSuccess = signal('');

  editingCompetition = signal<Competition | null>(null);
  editCompetitionName = signal('');
  editCompetitionSportId = signal('');
  editCompetitionStatus = signal('upcoming');
  editCompetitionPointsConfig = signal<PointsConfigEntry[]>([]);
  isUpdatingCompetition = signal(false);
  competitionUpdateError = signal('');
  competitionUpdateSuccess = signal('');

  // ── Stages State ───────────────────────────────────────────────────────────
  selectedCompetition = signal<Competition | null>(null);
  stages = signal<CompetitionStage[]>([]);
  isLoadingStages = signal(false);

  newStageName = signal('');
  newStageType = signal<'league' | 'group' | 'knockout' | 'group_knockout'>('league');
  newStageWinPoint = signal<number>(3);
  newStageDrawPoint = signal<number>(1);
  newStageTwoLegged = signal<boolean>(false);
  newStageGroupsCount = signal<number>(2);
  newStageAdvancingCount = signal<number>(2);
  newStageGamesPerTeam = signal<number>(3);
  newStageLegs = signal<number>(1);
  newStageGroupKnockoutSubtype = signal<'single_group' | 'multiple_groups'>('multiple_groups');
  newStageAdvancingType = signal<'winner' | 'winner_and_runner'>('winner_and_runner');
  newStageSingleGroupAdvancing = signal<number>(2);
  newStageVenueId = signal<string>('');

  isCreatingStage = signal(false);
  stageCreateError = signal('');
  stageCreateSuccess = signal('');

  editingStage = signal<CompetitionStage | null>(null);
  editStageName = signal('');
  editStageType = signal<'league' | 'group' | 'knockout' | 'group_knockout'>('league');
  editStageWinPoint = signal<number>(3);
  editStageDrawPoint = signal<number>(1);
  editStageTwoLegged = signal<boolean>(false);
  editStageGroupsCount = signal<number>(2);
  editStageAdvancingCount = signal<number>(2);
  editStageGamesPerTeam = signal<number>(3);
  editStageLegs = signal<number>(1);
  editStageGroupKnockoutSubtype = signal<'single_group' | 'multiple_groups'>('multiple_groups');
  editStageAdvancingType = signal<'winner' | 'winner_and_runner'>('winner_and_runner');
  editStageSingleGroupAdvancing = signal<number>(2);

  isUpdatingStage = signal(false);
  stageUpdateError = signal('');
  stageUpdateSuccess = signal('');

  // ── Matches State ──────────────────────────────────────────────────────────
  selectedStage = signal<CompetitionStage | null>(null);
  matches = signal<Match[]>([]);
  selectedMatch = signal<Match | null>(null);
  selectedPointsTableGroup = signal<string>('Group A');

  // Cricket Scoring Inputs
  cricketBowler = signal<string>('');
  cricketStriker = signal<string>('');
  cricketNonStriker = signal<string>('');
  cricketStatsTab = signal<'batting' | 'bowling'>('batting');

  isStageCompleted = computed(() => {
    const stage = this.selectedStage();
    if (!stage) return false;
    const matchesList = this.matches();
    if (matchesList.length === 0) return false;

    if (stage.type === 'league') {
      return matchesList.every(m => m.status === 'completed');
    }
    if (stage.type === 'group' || stage.type === 'group_knockout') {
      const currentGroup = this.selectedPointsTableGroup();
      const isMultipleGroups = stage.type === 'group_knockout' && stage.config?.groupKnockoutSubtype === 'multiple_groups';
      
      const targetMatches = isMultipleGroups
        ? matchesList.filter(m => m.config?.round === currentGroup)
        : matchesList.filter(m => !m.config?.round || m.config.round.toLowerCase().includes('group') || m.config.round.toLowerCase().includes('stage'));

      if (targetMatches.length === 0) return false;
      return targetMatches.every(m => m.status === 'completed');
    }
    if (stage.type === 'knockout') {
      return matchesList.every(m => m.status === 'completed');
    }
    return false;
  });

  availableGroups = computed(() => {
    const stage = this.selectedStage();
    if (!stage) return [];
    if (stage.type === 'group_knockout' && stage.config?.groupKnockoutSubtype === 'multiple_groups') {
      const groupsCount = stage.config?.groupsCount ?? 2;
      return Array.from({ length: groupsCount }, (_, i) => `Group ${String.fromCharCode(65 + i)}`);
    }
    return [];
  });

  leagueTable = computed(() => {
    const stage = this.selectedStage();
    if (!stage) return [];
    if (stage.type !== 'league' && stage.type !== 'group' && stage.type !== 'group_knockout') {
      return [];
    }

    const matchesList = this.matches();
    const enrolledTeams = this.competitionTeams();
    const currentGroup = this.selectedPointsTableGroup();
    const isMultipleGroups = stage.type === 'group_knockout' && stage.config?.groupKnockoutSubtype === 'multiple_groups';

    // Find teams in current group if multiple groups
    const groupTeamIds = new Set<string>();
    if (isMultipleGroups) {
      for (const m of matchesList) {
        if (m.config?.round === currentGroup) {
          if (m.homeTeamId) groupTeamIds.add(m.homeTeamId);
          if (m.awayTeamId) groupTeamIds.add(m.awayTeamId);
        }
      }
    }
    
    // Initialize map of team stats
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

    // Initialize with enrolled teams
    for (const ct of enrolledTeams) {
      if (isMultipleGroups && !groupTeamIds.has(ct.teamId)) {
        continue;
      }
      statsMap.set(ct.teamId, {
        teamId: ct.teamId,
        teamName: ct.team.name,
        teamLogoUrl: ct.team.logoUrl,
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

    // Process completed matches (and matches with score)
    for (const match of matchesList) {
      // Only process group play matches (ignore bracket matches if any)
      const isGroupMatch = !match.config?.round || match.config.round.toLowerCase().includes('group') || match.config.round.toLowerCase().includes('stage');
      if (stage.type === 'group_knockout' && !isGroupMatch) {
        continue;
      }

      // If multiple groups, only process matches belonging to the selected group
      if (isMultipleGroups && match.config?.round !== currentGroup) {
        continue;
      }

      if (match.status !== 'completed') continue;
      if (!match.homeTeamId || !match.awayTeamId) continue;

      const home = statsMap.get(match.homeTeamId);
      const away = statsMap.get(match.awayTeamId);

      // If either team is not in statsMap (e.g. deleted or external), initialize
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

      const hStats = statsMap.get(match.homeTeamId);
      const aStats = statsMap.get(match.awayTeamId);
      if (!hStats || !aStats) continue;

      hStats.played++;
      aStats.played++;

      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;

      hStats.gf += homeScore;
      hStats.ga += awayScore;
      aStats.gf += awayScore;
      aStats.ga += homeScore;

      if (homeScore > awayScore) {
        hStats.won++;
        hStats.pts += winPts;
        aStats.lost++;
      } else if (homeScore < awayScore) {
        aStats.won++;
        aStats.pts += winPts;
        hStats.lost++;
      } else {
        hStats.drawn++;
        hStats.pts += drawPts;
        aStats.drawn++;
        aStats.pts += drawPts;
      }

      hStats.gd = hStats.gf - hStats.ga;
      aStats.gd = aStats.gf - aStats.ga;
    }

    // Convert map to array and sort
    return Array.from(statsMap.values()).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  });

  getKnockoutRounds(): string[] {
    const list = this.matches();
    const stage = this.selectedStage();
    if (!stage) return [];
    
    // Extract unique round names from matches that are not group stage matches
    const roundsSet = new Set<string>();
    for (const m of list) {
      const round = m.config?.round;
      if (round) {
        // If stage is group_knockout, exclude group stage matches
        const isGroup = round.toLowerCase().includes('group') || round.toLowerCase().includes('stage');
        if (stage.type === 'group_knockout' && isGroup) {
          continue;
        }
        roundsSet.add(round);
      }
    }
    
    // Sort rounds so that they display from earliest to latest: Round of X -> Quarter-Final -> Semi-Final -> Final
    const roundOrder = ['round of 32', 'round of 16', 'round of 8', 'quarter-final', 'semi-final', 'final'];
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

  getMatchesForRound(roundName: string): Match[] {
    // Only return leg 1 matches or first occurrence to keep brackets clean and compact
    return this.matches().filter(m => m.config?.round === roundName && (m.config?.leg === undefined || m.config?.leg === 1));
  }

  isCreatingMatch = signal(false);

  newMatchHomeTeamId = signal('');
  newMatchAwayTeamId = signal('');
  newMatchTimerDuration = signal<number>(90);
  newMatchOvers = signal<number>(20);
  newMatchSetsToWin = signal<number>(2);

  matchCreateError = signal('');
  matchCreateSuccess = signal('');

  // ── Competition Teams State ──────────────────────────────────────────────────
  competitionTeams = signal<CompetitionTeam[]>([]);
  isLoadingCompetitionTeams = signal(false);
  addTeamId = signal('');
  isAddingTeam = signal(false);
  addTeamError = signal('');
  addTeamSuccess = signal('');

  // ── Venues State ───────────────────────────────────────────────────────────
  venues = signal<Venue[]>([]);
  isVenueModalOpen = signal(false);
  newVenueName = signal('');
  newVenueLocation = signal('');
  newVenueCapacity = signal<number | null>(null);
  isCreatingVenue = signal(false);
  venueCreateError = signal('');
  venueCreateSuccess = signal('');

  // Editing state for Venues
  editingVenue = signal<Venue | null>(null);
  editVenueName = signal('');
  editVenueLocation = signal('');
  editVenueCapacity = signal<number | null>(null);
  isUpdatingVenue = signal(false);
  venueUpdateError = signal('');
  venueUpdateSuccess = signal('');

  newMatchVenueId = signal('');

  // ── Fixture Generator State ─────────────────────────────────────────────────
  isGeneratingFixtures = signal(false);
  generateFixturesError = signal('');
  generateFixturesSuccess = signal('');

  // Combined Stage & Team Setup Modal
  isGenerateFixturesModalOpen = signal(false);
  selectedFixtureTeamIds = signal<string[]>([]);
  isGeneratingFixturesSubmit = signal(false);
  generateFixturesSubmitError = signal('');
  isResettingStages = signal(false);

  // ── Workspace Edit State ───────────────────────────────────────────────────
  editName = signal('');
  editDescription = signal('');
  editLogoUrl = signal('');
  isUserDropdownOpen = signal(false);
  isSavingSettings = signal(false);
  settingsError = signal('');
  settingsSuccess = signal('');

  // ── Member Invite State ────────────────────────────────────────────────────
  inviteUsername = signal('');
  inviteRole = signal<string>('viewer');
  isInviting = signal(false);
  inviteError = signal('');
  inviteSuccess = signal('');

  // ── Role Create State ──────────────────────────────────────────────────────
  newRoleName = signal('');
  newRoleDescription = signal('');
  isCreatingRole = signal(false);
  roleCreateError = signal('');
  roleCreateSuccess = signal('');

  // ── Assignable roles for invite/member dropdown (non-owner) ───────────────
  get assignableRoles(): Role[] {
    return this.roles().filter(r => r.slug !== 'owner');
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.workspaceService.getOne(id).subscribe({
      next: (ws) => {
        this.workspace.set(ws);
        this.editName.set(ws.name);
        this.editDescription.set(ws.description ?? '');
        this.editLogoUrl.set(ws.logoUrl ?? '');
        this.loadMembers(id);
        this.loadRoles(id);
        this.loadTeams(id);
        this.loadPlayers(id);
        this.loadEvents(id);
        this.loadSports();
        this.loadVenues(id);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Workspace not found or access denied.');
        this.isLoading.set(false);
      },
    });
  }

  loadMembers(workspaceId: string) {
    this.workspaceService.getMembers(workspaceId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  loadRoles(workspaceId: string) {
    this.workspaceService.getRoles(workspaceId).subscribe({
      next: (roles) => this.roles.set(roles),
      error: (err) => console.error('Failed to load roles', err),
    });
  }

  async deleteWorkspace() {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Workspace',
      message: `Are you sure you want to delete "${ws.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;
    this.workspaceService.remove(ws.id).subscribe({
      next: () => {
        this.uiService.success(`Workspace "${ws.name}" deleted successfully.`);
        this.router.navigate(['/workspaces']);
      },
      error: (err) => this.uiService.error(err.error?.message ?? 'Failed to delete workspace.'),
    });
  }

  onSaveSettings() {
    const name = this.editName().trim();
    const description = this.editDescription().trim();
    const ws = this.workspace();
    if (!ws || !name) return;

    this.isSavingSettings.set(true);
    this.settingsError.set('');
    this.settingsSuccess.set('');

    const logoUrl = this.editLogoUrl().trim();

    this.workspaceService.update(ws.id, { name, description, logoUrl: logoUrl || null }).subscribe({
      next: (updatedWs) => {
        this.isSavingSettings.set(false);
        this.workspace.set(updatedWs);
        this.settingsSuccess.set('Workspace settings updated successfully!');
      },
      error: (err) => {
        this.isSavingSettings.set(false);
        this.settingsError.set(err.error?.message ?? 'Failed to update workspace settings.');
      }
    });
  }

  isOwner(): boolean {
    return this.workspace()?.ownerId === this.authService.currentUser()?.id;
  }

  getCurrentUserRoleSlug(): string {
    const userId = this.authService.currentUser()?.id;
    return this.members().find(m => m.userId === userId)?.role?.slug ?? 'viewer';
  }

  canManageMembers(): boolean {
    const slug = this.getCurrentUserRoleSlug();
    return slug === 'owner' || slug === 'administrator';
  }

  onSignOut(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isCopied = signal(false);

  getInviteLink(): string {
    return `${window.location.origin}/workspaces/join?id=${this.workspace()?.id}`;
  }

  getQrCodeUrl(): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=222831&bgcolor=EEEEEE&data=${encodeURIComponent(this.getInviteLink())}`;
  }

  copyInviteLink() {
    navigator.clipboard.writeText(this.getInviteLink());
    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), 2000);
  }

  // ── Role Helpers ────────────────────────────────────────────────────────────

  roleBadgeClass(slug: string): string {
    const map: Record<string, string> = {
      owner:               'bg-violet-500/20 text-violet-300 border-violet-500/30',
      administrator:       'bg-blue-500/20 text-blue-300 border-blue-500/30',
      event_manager:       'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      competition_manager: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      referee:             'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      statistician:        'bg-orange-500/20 text-orange-300 border-orange-500/30',
      media_team:          'bg-pink-500/20 text-pink-300 border-pink-500/30',
      viewer:              'bg-slate-500/20 text-slate-300 border-slate-500/30',
    };
    return map[slug] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }

  memberCountForRole(roleId: string): number {
    return this.members().filter(m => m.role?.id === roleId).length;
  }

  // ── Invite Member ──────────────────────────────────────────────────────────

  onInvite() {
    const username = this.inviteUsername().trim();
    const roleSlug = this.inviteRole();
    const ws = this.workspace();
    if (!ws || !username) return;

    this.isInviting.set(true);
    this.inviteError.set('');
    this.inviteSuccess.set('');

    this.workspaceService.inviteMember(ws.id, username, roleSlug).subscribe({
      next: (newMember) => {
        this.isInviting.set(false);
        this.inviteSuccess.set(`${username} has been invited successfully!`);
        this.inviteUsername.set('');
        this.members.update(prev => [...prev, newMember]);
      },
      error: (err) => {
        this.isInviting.set(false);
        this.inviteError.set(err.error?.message ?? 'Failed to invite user.');
      }
    });
  }

  // ── Update Member Role ─────────────────────────────────────────────────────

  onUpdateRole(member: WorkspaceMember, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newRoleSlug = select.value;
    const ws = this.workspace();
    if (!ws) return;

    this.workspaceService.updateMemberRole(ws.id, member.userId, newRoleSlug).subscribe({
      next: (updated) => {
        this.members.update(prev => prev.map(m => m.id === member.id ? { ...m, role: updated.role } : m));
        this.uiService.success(`Role for ${member.user.username} updated to ${updated.role.name}.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to update member role.');
        select.value = member.role?.slug ?? '';
      }
    });
  }

  // ── Remove Member ──────────────────────────────────────────────────────────

  async onRemoveMember(member: WorkspaceMember) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Remove Member',
      message: `Remove "${member.user.username}" from this workspace?`,
      confirmText: 'Remove',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.removeMember(ws.id, member.userId).subscribe({
      next: () => {
        this.members.update(prev => prev.filter(m => m.userId !== member.userId));
        this.uiService.success(`Removed "${member.user.username}" from workspace.`);
      },
      error: (err) => this.uiService.error(err.error?.message ?? 'Failed to remove member.'),
    });
  }

  // ── Create Custom Role ─────────────────────────────────────────────────────

  onCreateRole() {
    const name = this.newRoleName().trim();
    const description = this.newRoleDescription().trim();
    const ws = this.workspace();
    if (!ws || !name) return;

    this.isCreatingRole.set(true);
    this.roleCreateError.set('');
    this.roleCreateSuccess.set('');

    this.workspaceService.createRole(ws.id, name, description || undefined).subscribe({
      next: (role) => {
        this.isCreatingRole.set(false);
        this.roleCreateSuccess.set(`Role "${role.name}" created!`);
        this.newRoleName.set('');
        this.newRoleDescription.set('');
        this.roles.update(prev => [...prev, role]);
      },
      error: (err) => {
        this.isCreatingRole.set(false);
        this.roleCreateError.set(err.error?.message ?? 'Failed to create role.');
      }
    });
  }

  // ── Delete Custom Role ─────────────────────────────────────────────────────

  async onDeleteRole(role: Role) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Custom Role',
      message: `Delete the role "${role.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.removeRole(ws.id, role.id).subscribe({
      next: () => {
        this.roles.update(prev => prev.filter(r => r.id !== role.id));
        this.uiService.success(`Role "${role.name}" deleted successfully.`);
      },
      error: (err) => this.uiService.error(err.error?.message ?? 'Failed to delete role.'),
    });
  }

  // ── Venues CRUD ────────────────────────────────────────────────────────────

  loadVenues(workspaceId: string) {
    this.workspaceService.getVenues(workspaceId).subscribe({
      next: (venues) => this.venues.set(venues),
      error: (err) => console.error('Failed to load venues', err),
    });
  }

  onAddVenue() {
    this.editingVenue.set(null);
    this.newVenueName.set('');
    this.newVenueLocation.set('');
    this.newVenueCapacity.set(null);
    this.venueCreateError.set('');
    this.venueCreateSuccess.set('');
    this.isVenueModalOpen.set(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.initMap(position.coords.latitude, position.coords.longitude);
        },
        () => {
          this.initMap();
        }
      );
    } else {
      this.initMap();
    }
  }

  onCreateVenue() {
    const name = this.newVenueName().trim();
    const location = this.newVenueLocation().trim();
    const capacity = this.newVenueCapacity();
    const ws = this.workspace();
    if (!ws || !name) return;

    this.isCreatingVenue.set(true);
    this.venueCreateError.set('');
    this.venueCreateSuccess.set('');

    const payload: any = { name };
    if (location) payload.location = location;
    if (capacity !== null && capacity !== undefined) payload.capacity = capacity;

    this.workspaceService.createVenue(ws.id, payload).subscribe({
      next: (venue) => {
        this.isCreatingVenue.set(false);
        this.venueCreateSuccess.set(`Venue "${venue.name}" registered successfully!`);
        this.newVenueName.set('');
        this.newVenueLocation.set('');
        this.newVenueCapacity.set(null);
        this.venues.update(prev => [...prev, venue]);
        setTimeout(() => this.closeVenueModal(), 1000);
      },
      error: (err) => {
        this.isCreatingVenue.set(false);
        this.venueCreateError.set(err.error?.message ?? 'Failed to create venue.');
      }
    });
  }

  onEditVenue(venue: Venue) {
    this.editingVenue.set(venue);
    this.editVenueName.set(venue.name);
    this.editVenueLocation.set(venue.location ?? '');
    this.editVenueCapacity.set(venue.capacity);
    this.venueUpdateError.set('');
    this.venueUpdateSuccess.set('');
    this.isVenueModalOpen.set(true);

    const coordsMatch = venue.location?.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[2]);
      this.initMap(lat, lng);
    } else if (venue.location) {
      this.geocodeAndCenterMap(venue.location);
    } else {
      this.initMap();
    }
  }

  onCancelEditVenue() {
    this.closeVenueModal();
  }

  closeVenueModal() {
    this.isVenueModalOpen.set(false);
    this.editingVenue.set(null);
    this.venueCreateError.set('');
    this.venueCreateSuccess.set('');
    this.venueUpdateError.set('');
    this.venueUpdateSuccess.set('');
    if (this.map) {
      try {
        this.map.remove();
      } catch (e) {
        console.error(e);
      }
      this.map = null;
      this.marker = null;
    }
  }

  initMap(latitude?: number, longitude?: number) {
    if (this.map) {
      try {
        this.map.remove();
      } catch (e) {
        console.error(e);
      }
      this.map = null;
      this.marker = null;
    }

    const lat = latitude ?? 51.505;
    const lng = longitude ?? -0.09;
    const zoom = latitude && longitude ? 15 : 13;

    const mapEl = document.getElementById('venue-map');
    if (!mapEl) {
      setTimeout(() => this.initMap(latitude, longitude), 100);
      return;
    }

    try {
      this.map = L.map('venue-map').setView([lat, lng], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      // Fix default Leaflet marker icon paths
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      this.marker = L.marker([lat, lng], { draggable: true, icon: DefaultIcon }).addTo(this.map);

      const updateCoords = (newLat: number, newLng: number) => {
        this.reverseGeocode(newLat, newLng);
      };

      this.marker.on('dragend', (event: any) => {
        const markerPos = event.target.getLatLng();
        updateCoords(markerPos.lat, markerPos.lng);
      });

      this.map.on('click', (event: any) => {
        const clickedPos = event.latlng;
        this.marker.setLatLng(clickedPos);
        updateCoords(clickedPos.lat, clickedPos.lng);
      });
    } catch (e) {
      console.error('Error initializing map:', e);
    }
  }

  reverseGeocode(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    fetch(url, {
      headers: {
        'Accept-Language': 'en'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          const address = data.display_name;
          if (this.editingVenue()) {
            this.editVenueLocation.set(address);
          } else {
            this.newVenueLocation.set(address);
          }
        } else {
          const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          if (this.editingVenue()) {
            this.editVenueLocation.set(coords);
          } else {
            this.newVenueLocation.set(coords);
          }
        }
      })
      .catch(err => {
        console.error('Reverse geocoding failed:', err);
        const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        if (this.editingVenue()) {
          this.editVenueLocation.set(coords);
        } else {
          this.newVenueLocation.set(coords);
        }
      });
  }

  geocodeAndCenterMap(query: string) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    fetch(url, {
      headers: {
        'Accept-Language': 'en'
      }
    })
      .then(res => res.json())
      .then(results => {
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          this.initMap(lat, lng);
        } else {
          this.initMap();
        }
      })
      .catch(err => {
        console.error('Geocoding failed:', err);
        this.initMap();
      });
  }

  searchMapLocation(query: string) {
    if (!query.trim()) return;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    fetch(url, {
      headers: {
        'Accept-Language': 'en'
      }
    })
      .then(res => res.json())
      .then(results => {
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          
          if (this.map && this.marker) {
            this.map.setView([lat, lng], 15);
            this.marker.setLatLng([lat, lng]);
            if (this.editingVenue()) {
              this.editVenueLocation.set(results[0].display_name);
            } else {
              this.newVenueLocation.set(results[0].display_name);
            }
          } else {
            this.initMap(lat, lng);
          }
        } else {
          this.uiService.error('Location not found. Please try a different search.');
        }
      })
      .catch(err => {
        console.error('Geocoding search failed:', err);
        this.uiService.error('Failed to search location.');
      });
  }

  onUpdateVenue() {
    const name = this.editVenueName().trim();
    const location = this.editVenueLocation().trim();
    const capacity = this.editVenueCapacity();
    const ws = this.workspace();
    const venue = this.editingVenue();
    if (!ws || !venue || !name) return;

    this.isUpdatingVenue.set(true);
    this.venueUpdateError.set('');
    this.venueUpdateSuccess.set('');

    const payload: any = { name };
    payload.location = location || null;
    payload.capacity = capacity !== null && capacity !== undefined ? capacity : null;

    this.workspaceService.updateVenue(ws.id, venue.id, payload).subscribe({
      next: (updated) => {
        this.isUpdatingVenue.set(false);
        this.venueUpdateSuccess.set(`Venue updated successfully!`);
        this.venues.update(prev => prev.map(v => v.id === venue.id ? updated : v));
        this.matches.update(prevMatches => prevMatches.map(m => m.venueId === venue.id ? { ...m, venue: updated } : m));
        setTimeout(() => this.closeVenueModal(), 1000);
      },
      error: (err) => {
        this.isUpdatingVenue.set(false);
        this.venueUpdateError.set(err.error?.message ?? 'Failed to update venue.');
      }
    });
  }

  async onDeleteVenue(venue: Venue) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Venue',
      message: `Delete venue "${venue.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.removeVenue(ws.id, venue.id).subscribe({
      next: () => {
        this.venues.update(prev => prev.filter(v => v.id !== venue.id));
        this.matches.update(prevMatches => prevMatches.map(m => m.venueId === venue.id ? { ...m, venueId: null, venue: null } : m));
        this.uiService.success(`Venue "${venue.name}" deleted successfully.`);
      },
      error: (err) => this.uiService.error(err.error?.message ?? 'Failed to delete venue.'),
    });
  }

  // ── Teams CRUD ─────────────────────────────────────────────────────────────

  loadTeams(workspaceId: string) {
    this.workspaceService.getTeams(workspaceId).subscribe({
      next: (teams) => this.teams.set(teams),
      error: (err) => console.error('Failed to load teams', err),
    });
  }

  onAddTeam() {
    this.editingTeam.set(null);
    this.newTeamName.set('');
    this.newTeamCode.set('');
    this.newTeamDescription.set('');
    this.newTeamLogoUrl.set('');
    this.teamCreateError.set('');
    this.teamCreateSuccess.set('');
    this.isTeamModalOpen.set(true);
  }

  onCreateTeam() {
    const name = this.newTeamName().trim();
    const code = this.newTeamCode().trim().toUpperCase();
    const description = this.newTeamDescription().trim();
    const logoUrl = this.newTeamLogoUrl().trim();
    const ws = this.workspace();
    if (!ws || !name || !code) return;

    this.isCreatingTeam.set(true);
    this.teamCreateError.set('');
    this.teamCreateSuccess.set('');

    this.workspaceService.createTeam(ws.id, name, code, description || undefined, logoUrl || undefined).subscribe({
      next: (team) => {
        this.isCreatingTeam.set(false);
        this.teamCreateSuccess.set(`Team "${team.name}" registered successfully!`);
        this.newTeamName.set('');
        this.newTeamCode.set('');
        this.newTeamDescription.set('');
        this.newTeamLogoUrl.set('');
        this.teams.update(prev => [...prev, team]);
        setTimeout(() => this.closeTeamModal(), 1000);
      },
      error: (err) => {
        this.isCreatingTeam.set(false);
        this.teamCreateError.set(err.error?.message ?? 'Failed to create team.');
      }
    });
  }

  onEditTeam(team: Team) {
    this.editingTeam.set(team);
    this.editTeamName.set(team.name);
    this.editTeamCode.set(team.code ?? '');
    this.editTeamDescription.set(team.description ?? '');
    this.editTeamLogoUrl.set(team.logoUrl ?? '');
    this.teamUpdateError.set('');
    this.teamUpdateSuccess.set('');
    this.isTeamModalOpen.set(true);
  }

  onCancelEditTeam() {
    this.closeTeamModal();
  }

  closeTeamModal() {
    this.isTeamModalOpen.set(false);
    this.editingTeam.set(null);
    this.teamCreateError.set('');
    this.teamCreateSuccess.set('');
    this.teamUpdateError.set('');
    this.teamUpdateSuccess.set('');
  }

  onUpdateTeam() {
    const name = this.editTeamName().trim();
    const code = this.editTeamCode().trim().toUpperCase();
    const description = this.editTeamDescription().trim();
    const logoUrl = this.editTeamLogoUrl().trim();
    const ws = this.workspace();
    const team = this.editingTeam();
    if (!ws || !team || !name || !code) return;

    this.isUpdatingTeam.set(true);
    this.teamUpdateError.set('');
    this.teamUpdateSuccess.set('');

    this.workspaceService.updateTeam(ws.id, team.id, name, code, description || undefined, logoUrl || undefined).subscribe({
      next: (updated) => {
        this.isUpdatingTeam.set(false);
        this.teamUpdateSuccess.set(`Team updated successfully!`);
        this.teams.update(prev => prev.map(t => t.id === team.id ? updated : t));
        setTimeout(() => this.closeTeamModal(), 1000);
      },
      error: (err) => {
        this.isUpdatingTeam.set(false);
        this.teamUpdateError.set(err.error?.message ?? 'Failed to update team.');
      }
    });
  }

  openBulkModal() {
    this.bulkImportTeams.set([]);
    this.bulkImportError.set('');
    this.bulkImportSuccess.set('');
    this.bulkImportProgress.set(0);
    this.isImportingBulk.set(false);
    this.isBulkModalOpen.set(true);
  }

  closeBulkModal() {
    this.isBulkModalOpen.set(false);
    this.bulkImportTeams.set([]);
    this.bulkImportError.set('');
    this.bulkImportSuccess.set('');
    this.bulkImportProgress.set(0);
    this.isImportingBulk.set(false);
  }

  async downloadTemplate() {
    const XLSX = await import('xlsx-js-style') as any;
    
    // Create the structure with cell objects that have styles
    const ws: any = {
      '!ref': 'A1:D3',
      
      // Row 1: Field values (bold)
      'A1': { v: 'Name', t: 's', s: { font: { bold: true } } },
      'B1': { v: 'Code', t: 's', s: { font: { bold: true } } },
      'C1': { v: 'Description', t: 's', s: { font: { bold: true } } },
      'D1': { v: 'LogoUrl', t: 's', s: { font: { bold: true } } },
      
      // Row 2: Required or Optional (dark grey color: #4B525D)
      'A2': { v: '#Required', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
      'B2': { v: '#Required', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
      'C2': { v: '#Optional', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
      'D2': { v: '#Optional', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
      
      // Row 3: eg. (italic)
      'A3': { v: 'eg. Warriors FC', t: 's', s: { font: { italic: true } } },
      'B3': { v: 'eg. WAR', t: 's', s: { font: { italic: true } } },
      'C3': { v: 'eg. A passionate local football club.', t: 's', s: { font: { italic: true } } },
      'D3': { v: 'eg. https://example.com/logo.png', t: 's', s: { font: { italic: true } } }
    };

    // Auto-fit or define column widths to prevent truncation
    ws['!cols'] = [
      { wch: 22 }, // Column A width (Name)
      { wch: 15 }, // Column B width (Code)
      { wch: 42 }, // Column C width (Description)
      { wch: 42 }  // Column D width (LogoUrl)
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teams Template');
    XLSX.writeFile(wb, 'teams_import_template.xlsx');
  }

  onExcelUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        // Map and validate rows, filtering out instructions and examples
        const parsedTeams = json.map((row: any) => {
          const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name') || 'Name';
          const codeKey = Object.keys(row).find(k => k.toLowerCase() === 'code') || 'Code';
          const descKey = Object.keys(row).find(k => k.toLowerCase() === 'description') || 'Description';
          const logoKey = Object.keys(row).find(k => k.toLowerCase() === 'logourl' || k.toLowerCase() === 'logo') || 'LogoUrl';
          
          const name = (row[nameKey] || '').toString().trim();
          const code = (row[codeKey] || '').toString().trim();
          const description = (row[descKey] || '').toString().trim();
          const logoUrl = (row[logoKey] || '').toString().trim();

          let status = 'pending';
          let error = '';

          if (!name) {
            status = 'failed';
            error = 'Team Name is missing';
          } else {
            const nameExists = this.teams().some(t => t.name.toLowerCase() === name.toLowerCase());
            const codeExists = code && this.teams().some(t => t.code && t.code.toUpperCase() === code.toUpperCase());

            if (nameExists) {
              status = 'exist';
              error = 'Team Name already registered';
            } else if (codeExists) {
              status = 'exist';
              error = 'Team Code already registered';
            }
          }

          return {
            name,
            code,
            description,
            logoUrl,
            status,
            error
          };
        }).filter(t => {
          if (!t.name) return false;
          
          // Exclude template metadata/example rows
          const lowerName = t.name.toLowerCase();
          if (lowerName === '#required' || lowerName === 'required') return false;
          if (lowerName.startsWith('eg.')) return false;
          if (lowerName.startsWith('eg ')) return false;
          
          return true;
        });
        
        this.bulkImportTeams.set(parsedTeams);
        this.bulkImportError.set('');
        if (parsedTeams.length === 0) {
          this.bulkImportError.set('No valid teams found in the spreadsheet. Make sure you have a "Name" column.');
        }
      } catch (err) {
        console.error('Failed to parse file', err);
        this.bulkImportError.set('Failed to parse spreadsheet. Please ensure it is a valid format.');
      }
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
  }

  async onConfirmBulkImport() {
    const ws = this.workspace();
    const teamsToImport = [...this.bulkImportTeams()];
    if (!ws || teamsToImport.length === 0) return;

    this.isImportingBulk.set(true);
    this.bulkImportProgress.set(0);
    this.bulkImportError.set('');
    this.bulkImportSuccess.set('');

    let successCount = 0;
    let failCount = 0;
    let existCount = 0;

    for (let i = 0; i < teamsToImport.length; i++) {
      const item = teamsToImport[i];

      if (item.status === 'failed') {
        failCount++;
        this.bulkImportProgress.set(Math.round(((i + 1) / teamsToImport.length) * 100));
        continue;
      }
      if (item.status === 'exist') {
        existCount++;
        this.bulkImportProgress.set(Math.round(((i + 1) / teamsToImport.length) * 100));
        continue;
      }

      try {
        await new Promise<void>((resolve) => {
          const finalCode = item.code || item.name.substring(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);
          this.workspaceService.createTeam(ws.id, item.name, finalCode, item.description || undefined, item.logoUrl || undefined).subscribe({
            next: (team) => {
              this.teams.update(prev => [...prev, team]);
              item.status = 'success';
              item.error = '';
              successCount++;
              this.bulkImportTeams.set([...teamsToImport]);
              resolve();
            },
            error: (err) => {
              const errMsg = err.error?.message ?? 'Unknown error';
              if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('unique') || err.status === 409) {
                item.status = 'exist';
                item.error = 'Team Code/Name already registered';
                existCount++;
              } else {
                item.status = 'failed';
                item.error = errMsg;
                failCount++;
              }
              this.bulkImportTeams.set([...teamsToImport]);
              resolve();
            }
          });
        });
      } catch (err) {
        item.status = 'failed';
        item.error = 'Import failed';
        failCount++;
        this.bulkImportTeams.set([...teamsToImport]);
      }
      this.bulkImportProgress.set(Math.round(((i + 1) / teamsToImport.length) * 100));
    }

    this.isImportingBulk.set(false);
    if (failCount === 0 && existCount === 0) {
      this.bulkImportSuccess.set(`Successfully imported all ${successCount} teams!`);
    } else {
      this.bulkImportSuccess.set(`Import finished: ${successCount} successful, ${existCount} already existed, ${failCount} failed.`);
    }
  }

  async onDeleteTeam(team: Team) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Team',
      message: `Delete team "${team.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.removeTeam(ws.id, team.id).subscribe({
      next: () => {
        this.teams.update(prev => prev.filter(t => t.id !== team.id));
        this.uiService.success(`Team "${team.name}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete team.');
      }
    });
  }

  // ── Players CRUD ───────────────────────────────────────────────────────────

  loadPlayers(workspaceId: string) {
    this.workspaceService.getPlayers(workspaceId).subscribe({
      next: (players) => this.players.set(players),
      error: (err) => console.error('Failed to load players', err),
    });
  }

  onAddPlayer() {
    this.editingPlayer.set(null);
    this.newPlayerUserId.set('');
    this.newPlayerJerseyNumber.set('');
    this.newPlayerTeamId.set('');
    this.playerCreateError.set('');
    this.playerCreateSuccess.set('');
    this.isPlayerModalOpen.set(true);
  }

  closePlayerModal() {
    this.isPlayerModalOpen.set(false);
    this.editingPlayer.set(null);
  }

  openPlayerBulkModal() {
    this.bulkImportPlayers.set([]);
    this.playerBulkImportProgress.set(0);
    this.playerBulkImportError.set('');
    this.playerBulkImportSuccess.set('');
    this.isPlayerBulkModalOpen.set(true);
  }

  closePlayerBulkModal() {
    this.isPlayerBulkModalOpen.set(false);
  }

  onCreatePlayer() {
    const userId = this.newPlayerUserId();
    const jerseyNumber = this.newPlayerJerseyNumber().trim();
    const teamId = this.newPlayerTeamId();
    const ws = this.workspace();
    if (!ws || !userId || !teamId) return;

    this.isCreatingPlayer.set(true);
    this.playerCreateError.set('');
    this.playerCreateSuccess.set('');

    const payload = {
      userId,
      teamId,
      ...(jerseyNumber && { jerseyNumber }),
    };

    this.workspaceService.createPlayer(ws.id, payload).subscribe({
      next: (player) => {
        this.isCreatingPlayer.set(false);
        this.playerCreateSuccess.set(`Player "${player.user.username}" registered successfully!`);
        this.players.update(prev => [...prev, player]);
        setTimeout(() => this.closePlayerModal(), 1500);
      },
      error: (err) => {
        this.isCreatingPlayer.set(false);
        this.playerCreateError.set(err.error?.message ?? 'Failed to register player.');
      }
    });
  }

  onEditPlayer(player: Player) {
    this.editingPlayer.set(player);
    this.editPlayerJerseyNumber.set(player.jerseyNumber ?? '');
    this.editPlayerTeamId.set(player.teamId);
    this.playerUpdateError.set('');
    this.playerUpdateSuccess.set('');
    this.isPlayerModalOpen.set(true);
  }

  onCancelEditPlayer() {
    this.closePlayerModal();
  }

  onUpdatePlayer() {
    const jerseyNumber = this.editPlayerJerseyNumber().trim();
    const teamId = this.editPlayerTeamId();
    const ws = this.workspace();
    const player = this.editingPlayer();
    if (!ws || !player || !teamId) return;

    this.isUpdatingPlayer.set(true);
    this.playerUpdateError.set('');
    this.playerUpdateSuccess.set('');

    const payload = {
      teamId,
      jerseyNumber: jerseyNumber || undefined,
    };

    this.workspaceService.updatePlayer(ws.id, player.id, payload).subscribe({
      next: (updated) => {
        this.isUpdatingPlayer.set(false);
        this.playerUpdateSuccess.set(`Player updated successfully!`);
        this.players.update(prev => prev.map(p => p.id === player.id ? updated : p));
        setTimeout(() => this.closePlayerModal(), 1500);
      },
      error: (err) => {
        this.isUpdatingPlayer.set(false);
        this.playerUpdateError.set(err.error?.message ?? 'Failed to update player.');
      }
    });
  }

  async downloadPlayerTemplate() {
    try {
      const XLSX = await import('xlsx-js-style') as any;
      const ws: any = {
        '!ref': 'A1:C3',
        'A1': { v: 'Username', t: 's', s: { font: { bold: true } } },
        'B1': { v: 'TeamCode', t: 's', s: { font: { bold: true } } },
        'C1': { v: 'JerseyNumber', t: 's', s: { font: { bold: true } } },
        'A2': { v: '#Required (must exist on system)', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
        'B2': { v: '#Required', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
        'C2': { v: '#Optional', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
        'A3': { v: 'eg. john_doe', t: 's', s: { font: { italic: true } } },
        'B3': { v: 'eg. WAR', t: 's', s: { font: { italic: true } } },
        'C3': { v: 'eg. 10', t: 's', s: { font: { italic: true } } }
      };
      ws['!cols'] = [
        { wch: 32 },
        { wch: 15 },
        { wch: 15 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Players Template');
      XLSX.writeFile(wb, 'players_import_template.xlsx');
    } catch (err) {
      console.error('Failed to generate template', err);
    }
  }

  onPlayerExcelUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const parsedPlayers = json.map((row: any) => {
          const usernameKey = Object.keys(row).find(k => k.toLowerCase() === 'username') || 'Username';
          const teamCodeKey = Object.keys(row).find(k => k.toLowerCase() === 'teamcode') || 'TeamCode';
          const jerseyKey = Object.keys(row).find(k => k.toLowerCase() === 'jerseynumber' || k.toLowerCase() === 'jersey') || 'JerseyNumber';

          const username = (row[usernameKey] || '').toString().trim();
          const teamCode = (row[teamCodeKey] || '').toString().trim();
          const jerseyNumber = (row[jerseyKey] || '').toString().trim();

          const member = this.members().find(m => m.user.username.toLowerCase() === username.toLowerCase());
          const team = this.teams().find(t => t.code && t.code.toUpperCase() === teamCode.toUpperCase());

          let status = 'pending';
          let error = '';

          if (!username) {
            status = 'failed';
            error = 'Username is missing';
          } else if (!member) {
            status = 'failed';
            error = 'User not found in workspace';
          } else if (!teamCode) {
            status = 'failed';
            error = 'Team Code is missing';
          } else if (!team) {
            status = 'failed';
            error = 'Team Code not found';
          } else {
            const alreadyExists = this.players().some(p => 
              p.user.username.toLowerCase() === username.toLowerCase() && 
              p.teamId === team.id
            );
            if (alreadyExists) {
              status = 'exist';
              error = 'Already registered in this team';
            }
          }

          return {
            username,
            teamCode,
            jerseyNumber,
            status,
            error
          };
        }).filter(p => {
          if (!p.username) return false;
          const lowerUser = p.username.toLowerCase();
          if (lowerUser.startsWith('#required') || lowerUser === 'required') return false;
          if (lowerUser.startsWith('eg.')) return false;
          if (lowerUser.startsWith('eg ')) return false;
          return true;
        });

        this.bulkImportPlayers.set(parsedPlayers);
        this.playerBulkImportError.set('');
        if (parsedPlayers.length === 0) {
          this.playerBulkImportError.set('No valid players found in the spreadsheet. Make sure you have a "Username" column.');
        }
      } catch (err) {
        console.error('Failed to parse file', err);
        this.playerBulkImportError.set('Failed to parse spreadsheet. Please ensure it is a valid format.');
      }
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
  }

  async onConfirmPlayerBulkImport() {
    const ws = this.workspace();
    const playersToImport = [...this.bulkImportPlayers()];
    if (!ws || playersToImport.length === 0) return;

    this.isImportingPlayerBulk.set(true);
    this.playerBulkImportProgress.set(0);
    this.playerBulkImportError.set('');
    this.playerBulkImportSuccess.set('');

    let successCount = 0;
    let failCount = 0;
    let existCount = 0;

    for (let i = 0; i < playersToImport.length; i++) {
      const item = playersToImport[i];

      if (item.status === 'failed') {
        failCount++;
        this.playerBulkImportProgress.set(Math.round(((i + 1) / playersToImport.length) * 100));
        continue;
      }
      if (item.status === 'exist') {
        existCount++;
        this.playerBulkImportProgress.set(Math.round(((i + 1) / playersToImport.length) * 100));
        continue;
      }

      const member = this.members().find(m => m.user.username.toLowerCase() === item.username.toLowerCase());
      const team = this.teams().find(t => t.code && t.code.toUpperCase() === item.teamCode.toUpperCase());

      if (!member) {
        item.status = 'failed';
        item.error = 'User not found in workspace';
        failCount++;
        this.bulkImportPlayers.set([...playersToImport]);
        this.playerBulkImportProgress.set(Math.round(((i + 1) / playersToImport.length) * 100));
        continue;
      }
      if (!team) {
        item.status = 'failed';
        item.error = 'Team Code not found';
        failCount++;
        this.bulkImportPlayers.set([...playersToImport]);
        this.playerBulkImportProgress.set(Math.round(((i + 1) / playersToImport.length) * 100));
        continue;
      }

      try {
        await new Promise<void>((resolve) => {
          const payload = {
            userId: member.userId,
            teamId: team.id,
            ...(item.jerseyNumber && { jerseyNumber: item.jerseyNumber }),
          };

          this.workspaceService.createPlayer(ws.id, payload).subscribe({
            next: (player) => {
              if (!this.players().some(p => p.id === player.id)) {
                this.players.update(prev => [...prev, player]);
              }
              item.status = 'success';
              item.error = '';
              successCount++;
              this.bulkImportPlayers.set([...playersToImport]);
              resolve();
            },
            error: (err) => {
              const errMsg = err.error?.message ?? 'Unknown error';
              if (errMsg.toLowerCase().includes('already registered') || err.status === 409) {
                item.status = 'exist';
                item.error = 'Already registered in this team';
                existCount++;
              } else {
                item.status = 'failed';
                item.error = errMsg;
                failCount++;
              }
              this.bulkImportPlayers.set([...playersToImport]);
              resolve();
            }
          });
        });
      } catch (err) {
        item.status = 'failed';
        item.error = 'Registration failed';
        failCount++;
        this.bulkImportPlayers.set([...playersToImport]);
      }
      this.playerBulkImportProgress.set(Math.round(((i + 1) / playersToImport.length) * 100));
    }

    this.isImportingPlayerBulk.set(false);
    if (failCount === 0 && existCount === 0) {
      this.playerBulkImportSuccess.set(`Successfully imported all ${successCount} players!`);
    } else {
      this.playerBulkImportSuccess.set(`Import finished: ${successCount} successful, ${existCount} already existed, ${failCount} failed.`);
    }
  }

  async onDeletePlayer(player: Player) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Player',
      message: `Delete player "${player.user.username}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.removePlayer(ws.id, player.id).subscribe({
      next: () => {
        this.players.update(prev => prev.filter(p => p.id !== player.id));
        this.uiService.success(`Player "${player.user.username}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete player.');
      }
    });
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  avatarColor(name: string): string {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  initials(name: string): string {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts.slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  // ── Events CRUD ────────────────────────────────────────────────────────────

  loadEvents(workspaceId: string) {
    this.workspaceService.getEvents(workspaceId).subscribe({
      next: (events) => this.events.set(events),
      error: (err) => console.error('Failed to load events', err),
    });
  }

  showDatePicker(event: any) {
    if (event.target && typeof event.target.showPicker === 'function') {
      try {
        event.target.showPicker();
      } catch (e) {
        console.warn('showPicker is not supported or blocked:', e);
      }
    }
  }

  private formatToLocalDatetime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().substring(0, 16);
  }

  toggleEventTeam(teamId: string) {
    this.selectedEventTeamIds.update(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  }

  onAddEvent() {
    this.editingEvent.set(null);
    this.newEventName.set('');
    this.newEventDescription.set('');
    this.newEventStartDate.set('');
    this.newEventEndDate.set('');
    this.newEventStatus.set('upcoming');
    this.newEventLogoUrl.set('');
    this.selectedEventTeamIds.set([]);
    this.eventCreateError.set('');
    this.eventCreateSuccess.set('');
    this.isEventModalOpen.set(true);
  }

  closeEventModal() {
    this.isEventModalOpen.set(false);
    this.editingEvent.set(null);
    this.newEventName.set('');
    this.newEventDescription.set('');
    this.newEventStartDate.set('');
    this.newEventEndDate.set('');
    this.newEventStatus.set('upcoming');
    this.newEventLogoUrl.set('');
    this.selectedEventTeamIds.set([]);
    this.eventCreateError.set('');
    this.eventCreateSuccess.set('');
    this.editEventName.set('');
    this.editEventDescription.set('');
    this.editEventStartDate.set('');
    this.editEventEndDate.set('');
    this.editEventStatus.set('upcoming');
    this.editEventLogoUrl.set('');
    this.eventUpdateError.set('');
    this.eventUpdateSuccess.set('');
  }

  onCreateEvent() {
    const name = this.newEventName().trim();
    const description = this.newEventDescription().trim();
    const startDate = this.newEventStartDate();
    const endDate = this.newEventEndDate();
    const status = this.newEventStatus();
    const ws = this.workspace();
    if (!ws || !name) return;

    this.isCreatingEvent.set(true);
    this.eventCreateError.set('');
    this.eventCreateSuccess.set('');

    const payload = {
      name,
      description: description || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      status,
      logoUrl: this.newEventLogoUrl() || undefined,
      teamIds: this.selectedEventTeamIds(),
    };

    this.workspaceService.createEvent(ws.id, payload).subscribe({
      next: (event) => {
        this.isCreatingEvent.set(false);
        this.eventCreateSuccess.set(`Event "${event.name}" created successfully!`);
        this.events.update(prev => [...prev, event]);
        setTimeout(() => this.closeEventModal(), 1500);
      },
      error: (err) => {
        this.isCreatingEvent.set(false);
        this.eventCreateError.set(err.error?.message ?? 'Failed to create event.');
      }
    });
  }

  onEditEvent(event: WorkspaceEvent) {
    this.editingEvent.set(event);
    this.editEventName.set(event.name);
    this.editEventDescription.set(event.description ?? '');
    this.editEventStartDate.set(this.formatToLocalDatetime(event.startDate));
    this.editEventEndDate.set(this.formatToLocalDatetime(event.endDate));
    this.editEventStatus.set(event.status);
    this.editEventLogoUrl.set(event.logoUrl ?? '');
    this.selectedEventTeamIds.set(event.teams?.map(t => t.id) || []);
    this.eventUpdateError.set('');
    this.eventUpdateSuccess.set('');
    this.isEventModalOpen.set(true);
  }

  onCancelEditEvent() {
    this.closeEventModal();
  }

  onUpdateEvent() {
    const name = this.editEventName().trim();
    const description = this.editEventDescription().trim();
    const startDate = this.editEventStartDate();
    const endDate = this.editEventEndDate();
    const status = this.editEventStatus();
    const ws = this.workspace();
    const event = this.editingEvent();
    if (!ws || !event || !name) return;

    this.isUpdatingEvent.set(true);
    this.eventUpdateError.set('');
    this.eventUpdateSuccess.set('');

    const payload = {
      name,
      description: description || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      status,
      logoUrl: this.editEventLogoUrl() || undefined,
      teamIds: this.selectedEventTeamIds(),
    };

    this.workspaceService.updateEvent(ws.id, event.id, payload).subscribe({
      next: (updated) => {
        this.isUpdatingEvent.set(false);
        this.eventUpdateSuccess.set(`Event updated successfully!`);
        this.events.update(prev => prev.map(e => e.id === event.id ? updated : e));
        
        // Also update selectedEvent if it's currently viewed
        const curEvent = this.selectedEvent();
        if (curEvent && curEvent.id === event.id) {
          this.selectedEvent.set(updated);
        }

        setTimeout(() => this.closeEventModal(), 1500);
      },
      error: (err) => {
        this.isUpdatingEvent.set(false);
        this.eventUpdateError.set(err.error?.message ?? 'Failed to update event.');
      }
    });
  }

  async onDeleteEvent(event: WorkspaceEvent) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Event',
      message: `Delete event "${event.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.removeEvent(ws.id, event.id).subscribe({
      next: () => {
        this.events.update(prev => prev.filter(e => e.id !== event.id));
        this.uiService.success(`Event "${event.name}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete event.');
      }
    });
  }

  // ── Competitions CRUD ───────────────────────────────────────────────────────

  loadSports() {
    this.workspaceService.getSports().subscribe({
      next: (sports) => this.sports.set(sports),
      error: (err) => console.error('Failed to load sports', err),
    });
  }

  onSelectEvent(event: WorkspaceEvent) {
    this.selectedEvent.set(event);
    this.editingCompetition.set(null);
    this.competitionCreateError.set('');
    this.competitionCreateSuccess.set('');
    this.loadCompetitions(event.id);
  }

  onDeselectEvent() {
    this.selectedEvent.set(null);
    this.competitions.set([]);
  }

  loadCompetitions(eventId: string) {
    const ws = this.workspace();
    if (!ws) return;
    this.isLoadingCompetitions.set(true);
    this.workspaceService.getCompetitions(ws.id, eventId).subscribe({
      next: (comps) => {
        this.competitions.set(comps);
        this.isLoadingCompetitions.set(false);
      },
      error: (err) => {
        console.error('Failed to load competitions', err);
        this.isLoadingCompetitions.set(false);
      }
    });
  }

  onAddCompetition() {
    this.editingCompetition.set(null);
    this.newCompetitionName.set('');
    this.newCompetitionSportId.set('');
    this.newCompetitionStatus.set('upcoming');
    this.newCompetitionPointsConfig.set([]);
    this.competitionCreateError.set('');
    this.competitionCreateSuccess.set('');
    this.isCompetitionModalOpen.set(true);
  }

  closeCompetitionModal() {
    this.isCompetitionModalOpen.set(false);
    this.editingCompetition.set(null);
    this.newCompetitionName.set('');
    this.newCompetitionSportId.set('');
    this.newCompetitionStatus.set('upcoming');
    this.newCompetitionPointsConfig.set([]);
    this.competitionCreateError.set('');
    this.competitionCreateSuccess.set('');
    this.editCompetitionName.set('');
    this.editCompetitionSportId.set('');
    this.editCompetitionStatus.set('upcoming');
    this.editCompetitionPointsConfig.set([]);
    this.competitionUpdateError.set('');
    this.competitionUpdateSuccess.set('');
  }

  addPointsRow(isEdit: boolean) {
    const cfg = isEdit ? this.editCompetitionPointsConfig : this.newCompetitionPointsConfig;
    const current = cfg();
    const nextPosition = current.length > 0 ? Math.max(...current.map(r => r.position)) + 1 : 1;
    const defaultLabels: Record<number, string> = { 1: 'Winner', 2: 'Runner-up', 3: '3rd Place', 4: '4th Place' };
    cfg.set([...current, { position: nextPosition, label: defaultLabels[nextPosition] ?? `${nextPosition}th Place`, points: 0 }]);
  }

  removePointsRow(index: number, isEdit: boolean) {
    const cfg = isEdit ? this.editCompetitionPointsConfig : this.newCompetitionPointsConfig;
    cfg.update(rows => rows.filter((_, i) => i !== index));
  }

  updatePointsRow(index: number, field: keyof PointsConfigEntry, value: any, isEdit: boolean) {
    const cfg = isEdit ? this.editCompetitionPointsConfig : this.newCompetitionPointsConfig;
    cfg.update(rows => rows.map((r, i) => i === index ? { ...r, [field]: field === 'points' || field === 'position' ? Number(value) : value } : r));
  }

  onCreateCompetition() {
    const name = this.newCompetitionName().trim();
    const sportId = this.newCompetitionSportId();
    const status = this.newCompetitionStatus();
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!ws || !event || !name || !sportId) return;

    this.isCreatingCompetition.set(true);
    this.competitionCreateError.set('');
    this.competitionCreateSuccess.set('');

    const pointsConfig = this.newCompetitionPointsConfig();
    const payload = {
      name,
      sportId,
      status,
      pointsConfig: pointsConfig.length > 0 ? pointsConfig : null,
    };

    this.workspaceService.createCompetition(ws.id, event.id, payload).subscribe({
      next: (comp) => {
        this.isCreatingCompetition.set(false);
        this.competitionCreateSuccess.set(`Competition "${comp.name}" created successfully!`);
        this.competitions.update(prev => [...prev, comp]);
        setTimeout(() => this.closeCompetitionModal(), 1500);
      },
      error: (err) => {
        this.isCreatingCompetition.set(false);
        this.competitionCreateError.set(err.error?.message ?? 'Failed to create competition.');
      }
    });
  }

  onEditCompetition(comp: Competition) {
    this.editingCompetition.set(comp);
    this.editCompetitionName.set(comp.name);
    this.editCompetitionSportId.set(comp.sportId);
    this.editCompetitionStatus.set(comp.status);
    this.editCompetitionPointsConfig.set(comp.pointsConfig ? [...comp.pointsConfig] : []);
    this.competitionUpdateError.set('');
    this.competitionUpdateSuccess.set('');
    this.isCompetitionModalOpen.set(true);
  }

  onCancelEditCompetition() {
    this.closeCompetitionModal();
  }

  onUpdateCompetition() {
    const name = this.editCompetitionName().trim();
    const sportId = this.editCompetitionSportId();
    const status = this.editCompetitionStatus();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.editingCompetition();
    if (!ws || !event || !comp || !name || !sportId) return;

    this.isUpdatingCompetition.set(true);
    this.competitionUpdateError.set('');
    this.competitionUpdateSuccess.set('');

    const pointsConfig = this.editCompetitionPointsConfig();
    const payload = {
      name,
      sportId,
      status,
      pointsConfig: pointsConfig.length > 0 ? pointsConfig : null,
    };

    this.workspaceService.updateCompetition(ws.id, event.id, comp.id, payload).subscribe({
      next: (updated) => {
        this.isUpdatingCompetition.set(false);
        this.competitionUpdateSuccess.set(`Competition updated successfully!`);
        this.competitions.update(prev => prev.map(c => c.id === comp.id ? updated : c));
        setTimeout(() => this.closeCompetitionModal(), 1500);
      },
      error: (err) => {
        this.isUpdatingCompetition.set(false);
        this.competitionUpdateError.set(err.error?.message ?? 'Failed to update competition.');
      }
    });
  }

  async onDeleteCompetition(comp: Competition) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!ws || !event) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Competition',
      message: `Delete competition "${comp.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.removeCompetition(ws.id, event.id, comp.id).subscribe({
      next: () => {
        this.competitions.update(prev => prev.filter(c => c.id !== comp.id));
        this.uiService.success(`Competition "${comp.name}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete competition.');
      }
    });
  }

  getCompetitionWinnerAndRunnerUp(comp: Competition): { winner?: string; runnerUp?: string } | null {
    if (!comp.stages || comp.stages.length === 0) return null;

    // Sort stages by sequence asc to find the last stage
    const sortedStages = [...comp.stages].sort((a, b) => a.sequence - b.sequence);
    const lastStage = sortedStages[sortedStages.length - 1];

    if (!lastStage.matches || lastStage.matches.length === 0) return null;

    // Check if all matches in the last stage are completed
    const allMatchesCompleted = lastStage.matches.every((m: any) => m.status === 'completed');
    if (!allMatchesCompleted) return null;

    if (lastStage.type === 'knockout') {
      // Find the final match: round is 'Final'
      const finalMatch = lastStage.matches.find((m: any) => m.config?.round === 'Final');
      if (finalMatch && finalMatch.status === 'completed') {
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
      }
    } else if (lastStage.type === 'league' || lastStage.type === 'group' || lastStage.type === 'group_knockout') {
      const winPts = lastStage.config?.winPoint ?? 3;
      const drawPts = lastStage.config?.drawPoint ?? 1;

      const statsMap = new Map<string, { teamName: string; pts: number; gd: number; gf: number; ga: number }>();

      for (const m of lastStage.matches) {
        if (!m.homeTeamId || !m.awayTeamId) continue;
        if (m.status !== 'completed') continue;

        if (!statsMap.has(m.homeTeamId) && m.homeTeam) {
          statsMap.set(m.homeTeamId, { teamName: m.homeTeam.name, pts: 0, gd: 0, gf: 0, ga: 0 });
        }
        if (!statsMap.has(m.awayTeamId) && m.awayTeam) {
          statsMap.set(m.awayTeamId, { teamName: m.awayTeam.name, pts: 0, gd: 0, gf: 0, ga: 0 });
        }

        const h = statsMap.get(m.homeTeamId);
        const a = statsMap.get(m.awayTeamId);
        if (!h || !a) continue;

        const homeScore = m.homeScore ?? 0;
        const awayScore = m.awayScore ?? 0;

        h.gf += homeScore;
        h.ga += awayScore;
        a.gf += awayScore;
        a.ga += homeScore;

        if (homeScore > awayScore) {
          h.pts += winPts;
        } else if (awayScore > homeScore) {
          a.pts += winPts;
        } else {
          h.pts += drawPts;
          a.pts += drawPts;
        }
        h.gd = h.gf - h.ga;
        a.gd = a.gf - a.ga;
      }

      const table = Array.from(statsMap.values()).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      });

      if (table.length > 0) {
        return {
          winner: table[0].teamName,
          runnerUp: table[1]?.teamName,
        };
      }
    }

    return null;
  }

  getStageWinnerAndRunnerUp(): { winner?: string; runnerUp?: string } | null {
    const stage = this.selectedStage();
    if (!stage) return null;
    const matchesList = this.matches();
    if (matchesList.length === 0) return null;

    const allCompleted = matchesList.every(m => m.status === 'completed');
    if (!allCompleted) return null;

    if (stage.type === 'knockout' || stage.type === 'group_knockout') {
      const finalMatch = matchesList.find(m => m.config?.round === 'Final');
      if (finalMatch && finalMatch.status === 'completed') {
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
      }
    } else if (stage.type === 'league' || stage.type === 'group') {
      const table = this.leagueTable();
      if (table && table.length > 0) {
        return {
          winner: table[0].teamName,
          runnerUp: table[1]?.teamName,
        };
      }
    }
    return null;
  }

  // ── Stage Actions ─────────────────────────────────────────────────────────

  onSelectCompetition(comp: Competition) {
    this.selectedCompetition.set(comp);
    this.editingStage.set(null);
    this.stageCreateError.set('');
    this.stageCreateSuccess.set('');
    this.addTeamError.set('');
    this.addTeamSuccess.set('');
    this.addTeamId.set('');
    this.selectedStage.set(null);
    this.selectedMatch.set(null);
    this.matches.set([]);
    this.competitionTeams.set([]);
    this.loadStages(comp.id);
    this.loadCompetitionTeams(comp.id);
  }

  onDeselectCompetition() {
    this.selectedCompetition.set(null);
    this.stages.set([]);
    this.selectedStage.set(null);
    this.selectedMatch.set(null);
    this.matches.set([]);
    this.competitionTeams.set([]);
  }

  loadStages(competitionId: string) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!ws || !event) return;
    this.isLoadingStages.set(true);
    this.workspaceService.getStages(ws.id, event.id, competitionId).subscribe({
      next: (stages) => {
        this.stages.set(stages);
        this.isLoadingStages.set(false);
        if (stages.length > 0) {
          this.onSelectStage(stages[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load stages', err);
        this.isLoadingStages.set(false);
      }
    });
  }

  loadCompetitionTeams(competitionId: string) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!ws || !event) return;
    this.isLoadingCompetitionTeams.set(true);
    this.workspaceService.getCompetitionTeams(ws.id, event.id, competitionId).subscribe({
      next: (ct) => {
        this.competitionTeams.set(ct);
        this.isLoadingCompetitionTeams.set(false);
      },
      error: (err) => {
        console.error('Failed to load competition teams', err);
        this.isLoadingCompetitionTeams.set(false);
      }
    });
  }

  onAddTeamToCompetition() {
    const teamId = this.addTeamId();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp || !teamId) return;
    this.isAddingTeam.set(true);
    this.addTeamError.set('');
    this.addTeamSuccess.set('');
    this.workspaceService.addTeamToCompetition(ws.id, event.id, comp.id, teamId).subscribe({
      next: (entry) => {
        this.isAddingTeam.set(false);
        this.competitionTeams.update(prev => [...prev, entry]);
        this.addTeamId.set('');
        this.addTeamSuccess.set('Team enrolled in competition!');
        setTimeout(() => this.addTeamSuccess.set(''), 3000);
      },
      error: (err) => {
        this.isAddingTeam.set(false);
        this.addTeamError.set(err.error?.message ?? 'Failed to add team.');
      }
    });
  }

  async onRemoveTeamFromCompetition(entry: CompetitionTeam) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;
    const confirmed = await this.uiService.confirm({
      title: 'Remove Team',
      message: `Remove "${entry.team.name}" from this competition?`,
      confirmText: 'Remove',
      type: 'danger',
    });
    if (!confirmed) return;
    this.workspaceService.removeTeamFromCompetition(ws.id, event.id, comp.id, entry.teamId).subscribe({
      next: () => {
        this.competitionTeams.update(prev => prev.filter(t => t.id !== entry.id));
        this.uiService.success(`Removed "${entry.team.name}" from competition.`);
      },
      error: (err) => this.uiService.error(err.error?.message ?? 'Failed to remove team.')
    });
  }

  async onGenerateFixtures() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;

    const stagesCount = this.stages().length;
    const teamsCount = this.competitionTeams().length;

    if (stagesCount === 0) {
      this.generateFixturesError.set('Configure at least one stage before generating fixtures.');
      return;
    }
    if (teamsCount < 2) {
      this.generateFixturesError.set('Enroll at least 2 teams before generating fixtures.');
      return;
    }

    const hasExistingMatches = this.stages().length > 0;
    if (hasExistingMatches) {
      const confirmed = await this.uiService.confirm({
        title: 'Regenerate Fixtures',
        message: 'This will DELETE any existing matches and regenerate all fixtures randomly. Continue?',
        confirmText: 'Regenerate',
        type: 'warning',
      });
      if (!confirmed) return;
    }

    this.isGeneratingFixtures.set(true);
    this.generateFixturesError.set('');
    this.generateFixturesSuccess.set('');

    this.workspaceService.generateFixtures(ws.id, event.id, comp.id).subscribe({
      next: (result) => {
        this.isGeneratingFixtures.set(false);
        this.generateFixturesSuccess.set(
          `Generated ${result.matchesCreated} fixtures across ${result.stagesGenerated} stage(s)!`
        );
        this.uiService.success(`Fixtures generated successfully!`);
        // Reload stages so match counts update
        this.loadStages(comp.id);
        setTimeout(() => this.generateFixturesSuccess.set(''), 5000);
      },
      error: (err) => {
        this.isGeneratingFixtures.set(false);
        this.generateFixturesError.set(err.error?.message ?? 'Failed to generate fixtures.');
        this.uiService.error(err.error?.message ?? 'Failed to generate fixtures.');
      }
    });
  }

  onCreateStage() {
    const name = this.newStageName().trim();
    const type = this.newStageType();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp || !name) return;

    this.isCreatingStage.set(true);
    this.stageCreateError.set('');
    this.stageCreateSuccess.set('');

    const config: any = {};
    if (type === 'group') {
      config.winPoint = this.newStageWinPoint();
      config.drawPoint = this.newStageDrawPoint();
      config.gamesPerTeam = this.newStageGamesPerTeam();
    } else if (type === 'knockout') {
      config.twoLegged = this.newStageTwoLegged();
    } else if (type === 'group_knockout') {
      config.groupsCount = this.newStageGroupsCount();
      config.advancingCount = this.newStageAdvancingCount();
      config.winPoint = this.newStageWinPoint();
      config.drawPoint = this.newStageDrawPoint();
      config.twoLegged = this.newStageTwoLegged();
      config.gamesPerTeam = this.newStageGamesPerTeam();
    }

    const payload = {
      name,
      type,
      config,
    };

    this.workspaceService.createStage(ws.id, event.id, comp.id, payload).subscribe({
      next: (stage) => {
        this.isCreatingStage.set(false);
        this.stageCreateSuccess.set(`Stage "${stage.name}" created successfully!`);
        this.newStageName.set('');
        this.newStageType.set('group');
        this.newStageWinPoint.set(3);
        this.newStageDrawPoint.set(1);
        this.newStageTwoLegged.set(false);
        this.newStageGroupsCount.set(2);
        this.newStageAdvancingCount.set(2);
        this.newStageGamesPerTeam.set(3);
        this.stages.update(prev => [...prev, stage]);
      },
      error: (err) => {
        this.isCreatingStage.set(false);
        this.stageCreateError.set(err.error?.message ?? 'Failed to create stage.');
      }
    });
  }

  onEditStage(stage: CompetitionStage) {
    this.editingStage.set(stage);
    this.editStageName.set(stage.name);
    this.editStageType.set(stage.type);
    
    // Prefill config values based on type
    const config = stage.config || {};
    this.editStageWinPoint.set(config.winPoint ?? 3);
    this.editStageDrawPoint.set(config.drawPoint ?? 1);
    this.editStageTwoLegged.set(config.twoLegged ?? false);
    this.editStageGroupsCount.set(config.groupsCount ?? 2);
    this.editStageAdvancingCount.set(config.advancingCount ?? 2);
    this.editStageGamesPerTeam.set(config.gamesPerTeam ?? 3);

    this.stageUpdateError.set('');
    this.stageUpdateSuccess.set('');
  }

  onCancelEditStage() {
    this.editingStage.set(null);
  }

  onUpdateStage() {
    const name = this.editStageName().trim();
    const type = this.editStageType();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.editingStage();
    if (!ws || !event || !comp || !stage || !name) return;

    this.isUpdatingStage.set(true);
    this.stageUpdateError.set('');
    this.stageUpdateSuccess.set('');

    const config: any = {};
    if (type === 'group') {
      config.winPoint = this.editStageWinPoint();
      config.drawPoint = this.editStageDrawPoint();
      config.gamesPerTeam = this.editStageGamesPerTeam();
    } else if (type === 'knockout') {
      config.twoLegged = this.editStageTwoLegged();
    } else if (type === 'group_knockout') {
      config.groupsCount = this.editStageGroupsCount();
      config.advancingCount = this.editStageAdvancingCount();
      config.winPoint = this.editStageWinPoint();
      config.drawPoint = this.editStageDrawPoint();
      config.twoLegged = this.editStageTwoLegged();
      config.gamesPerTeam = this.editStageGamesPerTeam();
    }

    const payload = {
      name,
      type,
      config,
    };

    this.workspaceService.updateStage(ws.id, event.id, comp.id, stage.id, payload).subscribe({
      next: (updated) => {
        this.isUpdatingStage.set(false);
        this.stageUpdateSuccess.set(`Stage updated successfully!`);
        this.stages.update(prev => prev.map(s => s.id === stage.id ? updated : s));
        setTimeout(() => this.editingStage.set(null), 1000);
      },
      error: (err) => {
        this.isUpdatingStage.set(false);
        this.stageUpdateError.set(err.error?.message ?? 'Failed to update stage.');
      }
    });
  }

  async onDeleteStage(stage: CompetitionStage) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Stage',
      message: `Delete stage "${stage.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.removeStage(ws.id, event.id, comp.id, stage.id).subscribe({
      next: () => {
        this.stages.update(prev => prev.filter(s => s.id !== stage.id));
        this.uiService.success(`Stage "${stage.name}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete stage.');
      }
    });
  }

  // ─── Matches Operations ────────────────────────────────────────────────────
  footballTimerInterval: any = null;

  onSelectStage(stage: CompetitionStage | null) {
    this.selectedStage.set(stage);
    this.selectedPointsTableGroup.set('Group A');
    this.selectedMatch.set(null);
    if (!stage) {
      this.matches.set([]);
      return;
    }

    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;

    this.workspaceService.getMatches(ws.id, event.id, comp.id, stage.id).subscribe({
      next: (data) => {
        this.matches.set(data);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to load matches.');
      }
    });
  }

  onCreateMatch() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!ws || !event || !comp || !stage) return;

    const homeId = this.newMatchHomeTeamId();
    const awayId = this.newMatchAwayTeamId();
    if (!homeId || !awayId) {
      this.matchCreateError.set('Please select both teams.');
      return;
    }
    if (homeId === awayId) {
      this.matchCreateError.set('Home and Away teams must be different.');
      return;
    }

    const sportCode = comp.sport?.code ?? 'football';
    const config: any = {};
    if (sportCode === 'football') {
      config.timerDuration = this.newMatchTimerDuration();
    } else if (sportCode === 'cricket') {
      config.overs = this.newMatchOvers();
    } else if (sportCode === 'badminton') {
      config.setsToWin = this.newMatchSetsToWin();
    }

    this.matchCreateError.set('');
    this.matchCreateSuccess.set('');

    this.workspaceService.createMatch(ws.id, event.id, comp.id, stage.id, {
      homeTeamId: homeId,
      awayTeamId: awayId,
      venueId: this.newMatchVenueId() || null,
      config,
    }).subscribe({
      next: (created) => {
        this.matches.update(prev => [...prev, created]);
        this.matchCreateSuccess.set('Match scheduled successfully!');
        this.uiService.success('Match scheduled successfully!');
        this.newMatchHomeTeamId.set('');
        this.newMatchAwayTeamId.set('');
        this.newMatchVenueId.set('');
        setTimeout(() => {
          this.isCreatingMatch.set(false);
          this.matchCreateSuccess.set('');
        }, 1000);
      },
      error: (err) => {
        this.matchCreateError.set(err.error?.message ?? 'Failed to schedule match.');
      }
    });
  }

  async onDeleteMatch(match: Match) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!ws || !event || !comp || !stage) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Match',
      message: 'Delete this match? This cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.removeMatch(ws.id, event.id, comp.id, stage.id, match.id).subscribe({
      next: () => {
        this.matches.update(prev => prev.filter(m => m.id !== match.id));
        if (this.selectedMatch()?.id === match.id) {
          this.selectedMatch.set(null);
        }
        this.uiService.success('Match deleted successfully.');
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete match.');
      }
    });
  }

  onSelectMatch(match: Match | null) {
    this.selectedMatch.set(match);
    if (match && match.status === 'live' && this.selectedCompetition()?.sport?.code === 'football') {
      this.startFootballTimer();
    } else {
      this.stopFootballTimer();
    }
  }

  getPlayersForTeam(teamId: string | null): Player[] {
    if (!teamId) return [];
    return this.players().filter(p => p.teamId === teamId);
  }

  // ─── Football Live Actions ─────────────────────────────────────────────────
  startFootballTimer() {
    if (this.footballTimerInterval) return;
    this.footballTimerInterval = setInterval(() => {
      const match = this.selectedMatch();
      if (match && match.status === 'live' && match.liveData?.timerRunning) {
        const live = { ...match.liveData };
        live.elapsedSeconds = (live.elapsedSeconds ?? 0) + 1;
        this.selectedMatch.update(m => m ? { ...m, liveData: live } : null);
      }
    }, 1000);
  }

  stopFootballTimer() {
    if (this.footballTimerInterval) {
      clearInterval(this.footballTimerInterval);
      this.footballTimerInterval = null;
    }
  }

  onToggleFootballTimer() {
    const match = this.selectedMatch();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!match || !ws || !event || !comp || !stage) return;

    const live = { ...match.liveData };
    live.timerRunning = !live.timerRunning;

    this.workspaceService.updateMatch(ws.id, event.id, comp.id, stage.id, match.id, {
      liveData: live,
      status: 'live',
    }).subscribe({
      next: (updated) => {
        this.selectedMatch.set(updated);
        this.matches.update(prev => prev.map(m => m.id === updated.id ? updated : m));
        if (live.timerRunning) this.startFootballTimer();
        else this.stopFootballTimer();
      }
    });
  }

  onRecordFootballGoal(options: {
    teamId: string;
    goalType: string;
    scorerId: string;
    scorerCustomName?: string;
    assistId?: string;
    assistCustomName?: string;
  }) {
    const { teamId, goalType, scorerId, scorerCustomName, assistId, assistCustomName } = options;
    const match = this.selectedMatch();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!match || !ws || !event || !comp || !stage) return;

    const live = { ...match.liveData };
    const currentMin = Math.floor((live.elapsedSeconds ?? 0) / 60) + 1;

    if (!live.events) live.events = [];
    live.events.push({
      type: 'goal',
      goalType: goalType || 'regular',
      teamId,
      playerUserId: (scorerId && scorerId !== 'unregistered') ? scorerId : undefined,
      playerName: (scorerId === 'unregistered') ? scorerCustomName : undefined,
      assistPlayerUserId: (assistId && assistId !== 'unregistered') ? assistId : undefined,
      assistPlayerName: (assistId === 'unregistered') ? assistCustomName : undefined,
      minute: currentMin,
    });

    const isHome = teamId === match.homeTeamId;
    let newHomeScore = match.homeScore;
    let newAwayScore = match.awayScore;

    if (goalType === 'own_goal') {
      if (isHome) {
        newAwayScore += 1;
      } else {
        newHomeScore += 1;
      }
    } else {
      if (isHome) {
        newHomeScore += 1;
      } else {
        newAwayScore += 1;
      }
    }

    this.workspaceService.updateMatch(ws.id, event.id, comp.id, stage.id, match.id, {
      homeScore: newHomeScore,
      awayScore: newAwayScore,
      liveData: live,
    }).subscribe({
      next: (updated) => {
        this.selectedMatch.set(updated);
        this.matches.update(prev => prev.map(m => m.id === updated.id ? updated : m));
      }
    });
  }

  onRecordFootballCard(teamId: string, playerId: string, cardType: 'yellow' | 'red') {
    const match = this.selectedMatch();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!match || !ws || !event || !comp || !stage) return;

    const live = { ...match.liveData };
    const currentMin = Math.floor((live.elapsedSeconds ?? 0) / 60) + 1;

    if (!live.events) live.events = [];
    live.events.push({
      type: 'card',
      teamId,
      playerUserId: playerId,
      cardType,
      minute: currentMin,
    });

    this.workspaceService.updateMatch(ws.id, event.id, comp.id, stage.id, match.id, {
      liveData: live,
    }).subscribe({
      next: (updated) => {
        this.selectedMatch.set(updated);
        this.matches.update(prev => prev.map(m => m.id === updated.id ? updated : m));
      }
    });
  }

  // ─── Cricket Live Actions ──────────────────────────────────────────────────
  onRecordCricketToss(tossWinnerId: string, tossChoice: 'bat' | 'bowl') {
    const match = this.selectedMatch();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!match || !ws || !event || !comp || !stage) return;

    const live = match.liveData ? { ...match.liveData } : {};
    live.tossWinnerId = tossWinnerId;
    live.tossChoice = tossChoice;

    // Initialize inningsData based on choice
    const battingTeamId = tossChoice === 'bat' ? tossWinnerId : (tossWinnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId);
    const bowlingTeamId = battingTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

    live.inningsData = [
      {
        battingTeamId,
        bowlingTeamId,
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        batsmanStats: {},
        bowlerStats: {},
        extraRuns: 0,
        completed: false,
      }
    ];
    live.currentInnings = 1;

    this.workspaceService.updateMatch(ws.id, event.id, comp.id, stage.id, match.id, {
      liveData: live,
      status: 'live',
    }).subscribe({
      next: (updated) => {
        this.selectedMatch.set(updated);
        this.matches.update(prev => prev.map(m => m.id === updated.id ? updated : m));
      }
    });
  }

  getCricketBallNumber(ballsHistory: any[] | undefined): string {
    if (!ballsHistory || ballsHistory.length === 0) {
      return "1.1";
    }
    let validBallsCount = 0;
    for (const ball of ballsHistory) {
      if (ball.ballType !== 'wide' && ball.ballType !== 'no-ball') {
        validBallsCount++;
      }
    }
    const over = Math.floor(validBallsCount / 6);
    const ballInOver = (validBallsCount % 6) + 1;
    return `${over + 1}.${ballInOver}`;
  }

  isFreeHitActive(innings: any): boolean {
    if (!innings || !innings.ballsHistory || innings.ballsHistory.length === 0) {
      return false;
    }
    const lastBall = innings.ballsHistory[innings.ballsHistory.length - 1];
    return lastBall.ballType === 'no-ball';
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  onRecordCricketBall(runs: number, extraRuns: number, wicket: boolean, ballType: string) {
    const match = this.selectedMatch();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!match || !ws || !event || !comp || !stage) return;

    if (!this.cricketBowler() || !this.cricketStriker() || !this.cricketNonStriker()) {
      this.uiService.error('Please select Bowler, Striker, and Non-Striker before recording a ball.');
      return;
    }

    const live = { ...match.liveData };
    const inningsIndex = (live.currentInnings ?? 1) - 1;
    if (!live.inningsData || !live.inningsData[inningsIndex]) return;

    const innings = { ...live.inningsData[inningsIndex] };

    // Update Runs
    innings.runs += runs + extraRuns;
    innings.extraRuns = (innings.extraRuns ?? 0) + extraRuns;

    // Update wickets
    if (wicket) {
      innings.wickets += 1;
      this.cricketStriker.set('');
    }

    // Update valid balls/overs count
    if (ballType !== 'wide' && ballType !== 'no-ball') {
      innings.balls += 1;
      if (innings.balls >= 6) {
        innings.overs += 1;
        innings.balls = 0;
      }
    }

    // Record ball to history
    if (!innings.ballsHistory) {
      innings.ballsHistory = [];
    }
    const ballNumber = this.getCricketBallNumber(innings.ballsHistory);
    innings.ballsHistory.push({
      ballNumber,
      bowler: this.cricketBowler() || 'Unknown Bowler',
      striker: this.cricketStriker() || 'Unknown Batter',
      nonStriker: this.cricketNonStriker() || 'Unknown Batter',
      runs,
      extras: extraRuns,
      wicket,
      ballType,
      timestamp: new Date().toISOString()
    });

    // Update batsman stats
    const striker = this.cricketStriker() || 'Unknown Batter';
    if (!innings.batsmanStats) innings.batsmanStats = {};
    if (!innings.batsmanStats[striker]) {
      innings.batsmanStats[striker] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
    }
    if (ballType !== 'wide') {
      innings.batsmanStats[striker].balls += 1;
      innings.batsmanStats[striker].runs += runs;
      if (runs === 4) innings.batsmanStats[striker].fours += 1;
      if (runs === 6) innings.batsmanStats[striker].sixes += 1;
    }

    // Update bowler stats
    const bowler = this.cricketBowler() || 'Unknown Bowler';
    if (!innings.bowlerStats) innings.bowlerStats = {};
    if (!innings.bowlerStats[bowler]) {
      innings.bowlerStats[bowler] = { overs: 0, balls: 0, runsConceded: 0, wickets: 0, extraRuns: 0 };
    }
    innings.bowlerStats[bowler].runsConceded += runs + extraRuns;
    innings.bowlerStats[bowler].extraRuns += extraRuns;
    if (wicket) {
      innings.bowlerStats[bowler].wickets += 1;
    }
    if (ballType !== 'wide' && ballType !== 'no-ball') {
      innings.bowlerStats[bowler].balls += 1;
      if (innings.bowlerStats[bowler].balls >= 6) {
        innings.bowlerStats[bowler].overs += 1;
        innings.bowlerStats[bowler].balls = 0;
      }
    }

    live.inningsData[inningsIndex] = innings;

    // Update main scores
    const homeInnings = live.inningsData.find((i: any) => i.battingTeamId === match.homeTeamId);
    const homeScore = homeInnings ? homeInnings.runs : 0;
    const awayInnings = live.inningsData.find((i: any) => i.battingTeamId === match.awayTeamId);
    const awayScore = awayInnings ? awayInnings.runs : 0;

    // Check if innings completed (e.g. 10 wickets down, or overs reached)
    const targetOvers = match.config.overs ?? 20;
    if (innings.wickets >= 10 || innings.overs >= targetOvers) {
      innings.completed = true;
      if (live.currentInnings === 1) {
        // Switch innings
        live.currentInnings = 2;
        live.inningsData.push({
          battingTeamId: innings.bowlingTeamId,
          bowlingTeamId: innings.battingTeamId,
          runs: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
          batsmanStats: {},
          bowlerStats: {},
          extraRuns: 0,
          completed: false,
          ballsHistory: []
        });
      } else {
        // Match completed
        match.status = 'completed';
      }
    }

    this.workspaceService.updateMatch(ws.id, event.id, comp.id, stage.id, match.id, {
      homeScore,
      awayScore,
      status: match.status,
      liveData: live,
    }).subscribe({
      next: (updated) => {
        this.selectedMatch.set(updated);
        this.matches.update(prev => prev.map(m => m.id === updated.id ? updated : m));
      }
    });
  }

  onUndoCricketBall() {
    const match = this.selectedMatch();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!match || !ws || !event || !comp || !stage) return;

    const live = { ...match.liveData };
    const inningsIndex = (live.currentInnings ?? 1) - 1;
    if (!live.inningsData || !live.inningsData[inningsIndex]) return;

    const innings = { ...live.inningsData[inningsIndex] };
    if (!innings.ballsHistory || innings.ballsHistory.length === 0) return;

    // Pop the last ball
    innings.ballsHistory.pop();

    // Re-calculate statistics for the innings from the remaining history
    innings.runs = 0;
    innings.wickets = 0;
    innings.balls = 0;
    innings.overs = 0;
    innings.extraRuns = 0;
    innings.batsmanStats = {};
    innings.bowlerStats = {};

    const history = [...innings.ballsHistory];
    innings.ballsHistory = [];

    // Replay all previous balls
    for (const ball of history) {
      innings.runs += ball.runs + ball.extras;
      innings.extraRuns += ball.extras;
      if (ball.wicket) {
        innings.wickets += 1;
      }
      if (ball.ballType !== 'wide' && ball.ballType !== 'no-ball') {
        innings.balls += 1;
        if (innings.balls >= 6) {
          innings.overs += 1;
          innings.balls = 0;
        }
      }

      // Re-populate batsman stats
      const bName = ball.striker;
      if (!innings.batsmanStats[bName]) {
        innings.batsmanStats[bName] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
      }
      if (ball.ballType !== 'wide') {
        innings.batsmanStats[bName].balls += 1;
        innings.batsmanStats[bName].runs += ball.runs;
        if (ball.runs === 4) innings.batsmanStats[bName].fours += 1;
        if (ball.runs === 6) innings.batsmanStats[bName].sixes += 1;
      }

      // Re-populate bowler stats
      const bwName = ball.bowler;
      if (!innings.bowlerStats[bwName]) {
        innings.bowlerStats[bwName] = { overs: 0, balls: 0, runsConceded: 0, wickets: 0, extraRuns: 0 };
      }
      innings.bowlerStats[bwName].runsConceded += ball.runs + ball.extras;
      innings.bowlerStats[bwName].extraRuns += ball.extras;
      if (ball.wicket) {
        innings.bowlerStats[bwName].wickets += 1;
      }
      if (ball.ballType !== 'wide' && ball.ballType !== 'no-ball') {
        innings.bowlerStats[bwName].balls += 1;
        if (innings.bowlerStats[bwName].balls >= 6) {
          innings.bowlerStats[bwName].overs += 1;
          innings.bowlerStats[bwName].balls = 0;
        }
      }
      
      innings.ballsHistory.push(ball);
    }

    live.inningsData[inningsIndex] = innings;

    // Update main scores
    const homeInnings = live.inningsData.find((i: any) => i.battingTeamId === match.homeTeamId);
    const homeScore = homeInnings ? homeInnings.runs : 0;
    const awayInnings = live.inningsData.find((i: any) => i.battingTeamId === match.awayTeamId);
    const awayScore = awayInnings ? awayInnings.runs : 0;

    // Reset status if match was completed but we undo
    if (match.status === 'completed') {
      match.status = 'live';
    }

    this.workspaceService.updateMatch(ws.id, event.id, comp.id, stage.id, match.id, {
      homeScore,
      awayScore,
      status: match.status,
      liveData: live,
    }).subscribe({
      next: (updated) => {
        this.selectedMatch.set(updated);
        this.matches.update(prev => prev.map(m => m.id === updated.id ? updated : m));
      }
    });
  }

  onSwitchCricketStrikers() {
    const s = this.cricketStriker();
    const ns = this.cricketNonStriker();
    this.cricketStriker.set(ns);
    this.cricketNonStriker.set(s);
  }

  // ─── Badminton Live Actions ────────────────────────────────────────────────
  onRecordBadmintonPoint(side: 'home' | 'away', change: number) {
    const match = this.selectedMatch();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!match || !ws || !event || !comp || !stage) return;

    const live = match.liveData ? { ...match.liveData } : {};
    if (!live.setsScore) {
      live.setsScore = [{ home: 0, away: 0 }];
      live.currentSet = 1;
      live.homeSetsWon = 0;
      live.awaySetsWon = 0;
    }

    const setIndex = (live.currentSet ?? 1) - 1;
    if (!live.setsScore[setIndex]) {
      live.setsScore[setIndex] = { home: 0, away: 0 };
    }

    const setScore = { ...live.setsScore[setIndex] };
    if (side === 'home') {
      setScore.home = Math.max(0, setScore.home + change);
    } else {
      setScore.away = Math.max(0, setScore.away + change);
    }

    live.setsScore[setIndex] = setScore;

    // Check if set is won (typically first to 21 points, must lead by 2, or max 30)
    const homeScore = setScore.home;
    const awayScore = setScore.away;
    const setsToWin = match.config.setsToWin ?? 2;

    if ((homeScore >= 21 && homeScore - awayScore >= 2) || homeScore === 30) {
      // Home wins set
      live.homeSetsWon += 1;
      if (live.homeSetsWon >= setsToWin) {
        match.status = 'completed';
      } else {
        live.currentSet += 1;
        live.setsScore.push({ home: 0, away: 0 });
      }
    } else if ((awayScore >= 21 && awayScore - homeScore >= 2) || awayScore === 30) {
      // Away wins set
      live.awaySetsWon += 1;
      if (live.awaySetsWon >= setsToWin) {
        match.status = 'completed';
      } else {
        live.currentSet += 1;
        live.setsScore.push({ home: 0, away: 0 });
      }
    }

    this.workspaceService.updateMatch(ws.id, event.id, comp.id, stage.id, match.id, {
      homeScore: live.homeSetsWon,
      awayScore: live.awaySetsWon,
      status: match.status,
      liveData: live,
    }).subscribe({
      next: (updated) => {
        this.selectedMatch.set(updated);
        this.matches.update(prev => prev.map(m => m.id === updated.id ? updated : m));
      }
    });
  }

  onEndMatch() {
    const match = this.selectedMatch();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!match || !ws || !event || !comp || !stage) return;

    this.workspaceService.updateMatch(ws.id, event.id, comp.id, stage.id, match.id, {
      status: 'completed',
    }).subscribe({
      next: (updated) => {
        this.selectedMatch.set(updated);
        this.matches.update(prev => prev.map(m => m.id === updated.id ? updated : m));
        this.stopFootballTimer();
      }
    });
  }

  onAvatarUpload(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingAvatar.set(true);
    this.workspaceService.uploadImage(file, 'user').subscribe({
      next: (res) => {
        this.authService.updateProfile(undefined, res.url).subscribe({
          next: () => {
            this.isUploadingAvatar.set(false);
            this.uiService.success('Profile picture updated successfully!');
          },
          error: (err) => {
            this.isUploadingAvatar.set(false);
            console.error(err);
            this.uiService.error('Failed to update user profile image.');
          }
        });
      },
      error: (err) => {
        this.isUploadingAvatar.set(false);
        console.error(err);
        this.uiService.error('Image upload failed.');
      }
    });
  }

  onWorkspaceLogoUpload(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingWorkspaceLogo.set(true);
    this.workspaceService.uploadImage(file, 'workspace').subscribe({
      next: (res) => {
        this.isUploadingWorkspaceLogo.set(false);
        this.editLogoUrl.set(res.url);
        this.uiService.success('Workspace logo uploaded successfully.');
      },
      error: (err) => {
        this.isUploadingWorkspaceLogo.set(false);
        console.error(err);
        this.uiService.error('Workspace logo upload failed.');
      }
    });
  }

  onTeamLogoUpload(event: any, isEdit: boolean) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingTeamLogo.set(true);
    this.workspaceService.uploadImage(file, 'team').subscribe({
      next: (res) => {
        this.isUploadingTeamLogo.set(false);
        if (isEdit) {
          this.editTeamLogoUrl.set(res.url);
        } else {
          this.newTeamLogoUrl.set(res.url);
        }
        this.uiService.success('Team logo uploaded successfully.');
      },
      error: (err) => {
        this.isUploadingTeamLogo.set(false);
        console.error(err);
        this.uiService.error('Team logo upload failed.');
      }
    });
  }

  onEventLogoUpload(event: any, isEdit: boolean) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingEventLogo.set(true);
    this.workspaceService.uploadImage(file, 'event').subscribe({
      next: (res) => {
        this.isUploadingEventLogo.set(false);
        if (isEdit) {
          this.editEventLogoUrl.set(res.url);
        } else {
          this.newEventLogoUrl.set(res.url);
        }
        this.uiService.success('Event logo uploaded successfully.');
      },
      error: (err) => {
        this.isUploadingEventLogo.set(false);
        console.error(err);
        this.uiService.error('Event logo upload failed.');
      }
    });
  }

  openGenerateFixturesModal() {
    const comp = this.selectedCompetition();
    const event = this.selectedEvent();
    if (!comp || !event) return;

    const eventTeamIds = event.teams?.map(t => t.id) || [];
    this.selectedFixtureTeamIds.set(eventTeamIds);

    const existingStages = this.stages();
    if (existingStages.length > 0) {
      const stage = existingStages[0];
      this.newStageName.set(stage.name);
      this.newStageType.set(stage.type === 'group' ? 'league' : stage.type as any);
      this.newStageWinPoint.set(stage.config?.winPoint ?? 3);
      this.newStageDrawPoint.set(stage.config?.drawPoint ?? 1);
      this.newStageTwoLegged.set(stage.config?.twoLegged ?? false);
      this.newStageGroupsCount.set(stage.config?.groupsCount ?? 2);
      this.newStageAdvancingCount.set(stage.config?.advancingCount ?? 2);
      this.newStageGamesPerTeam.set(stage.config?.gamesPerTeam ?? 3);
      this.newStageLegs.set(stage.config?.legs ?? (stage.config?.twoLegged ? 2 : 1));
      this.newStageGroupKnockoutSubtype.set(stage.config?.groupKnockoutSubtype ?? 'multiple_groups');
      this.newStageAdvancingType.set(stage.config?.advancingType ?? 'winner_and_runner');
      this.newStageSingleGroupAdvancing.set(stage.config?.singleGroupAdvancing ?? 2);
      this.newStageVenueId.set(stage.config?.venueId ?? '');
    } else {
      this.newStageName.set('Main Stage');
      this.newStageType.set('league');
      this.newStageWinPoint.set(3);
      this.newStageDrawPoint.set(1);
      this.newStageTwoLegged.set(false);
      this.newStageGroupsCount.set(2);
      this.newStageAdvancingCount.set(2);
      this.newStageGamesPerTeam.set(3);
      this.newStageLegs.set(1);
      this.newStageGroupKnockoutSubtype.set('multiple_groups');
      this.newStageAdvancingType.set('winner_and_runner');
      this.newStageSingleGroupAdvancing.set(2);
      this.newStageVenueId.set('');
    }

    this.generateFixturesSubmitError.set('');
    this.isGenerateFixturesModalOpen.set(true);
  }

  closeGenerateFixturesModal() {
    this.isGenerateFixturesModalOpen.set(false);
  }

  toggleFixtureTeam(teamId: string) {
    this.selectedFixtureTeamIds.update(ids => {
      if (ids.includes(teamId)) {
        return ids.filter(id => id !== teamId);
      } else {
        return [...ids, teamId];
      }
    });
  }

  async onGenerateFixturesSubmit() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;

    const selectedIds = this.selectedFixtureTeamIds();
    if (selectedIds.length < 2) {
      this.generateFixturesSubmitError.set('Please select at least 2 teams to participate.');
      return;
    }

    const stageName = this.newStageName().trim();
    if (!stageName) {
      this.generateFixturesSubmitError.set('Please enter a stage name.');
      return;
    }

    const existingStages = this.stages();
    if (existingStages.length > 0) {
      const confirmed = await this.uiService.confirm({
        title: 'Regenerate Fixtures',
        message: 'This will DELETE any existing matches and regenerate all fixtures randomly. Continue?',
        confirmText: 'Regenerate',
        type: 'warning',
      });
      if (!confirmed) return;
    }

    this.isGeneratingFixturesSubmit.set(true);
    this.generateFixturesSubmitError.set('');

    try {
      // Refresh competition teams local state
      const refreshedTeams = await firstValueFrom(this.workspaceService.getCompetitionTeams(ws.id, event.id, comp.id));
      this.competitionTeams.set(refreshedTeams);

      // 2. Setup stage (create or update)
      const stagePayload: any = {
        name: stageName,
        type: this.newStageType(),
        sequence: 1,
        config: {}
      };

      if (this.newStageType() === 'league') {
        stagePayload.config = {
          winPoint: this.newStageWinPoint(),
          drawPoint: this.newStageDrawPoint(),
          legs: this.newStageLegs(),
          twoLegged: this.newStageLegs() === 2
        };
      } else if (this.newStageType() === 'group') {
        stagePayload.config = {
          winPoint: this.newStageWinPoint(),
          drawPoint: this.newStageDrawPoint(),
          gamesPerTeam: this.newStageGamesPerTeam(),
          legs: this.newStageLegs(),
          twoLegged: this.newStageLegs() === 2
        };
      } else if (this.newStageType() === 'knockout') {
        stagePayload.config = {
          legs: this.newStageLegs(),
          twoLegged: this.newStageLegs() === 2
        };
      } else if (this.newStageType() === 'group_knockout') {
        stagePayload.config = {
          winPoint: this.newStageWinPoint(),
          drawPoint: this.newStageDrawPoint(),
          legs: this.newStageLegs(),
          twoLegged: this.newStageLegs() === 2,
          groupKnockoutSubtype: this.newStageGroupKnockoutSubtype(),
          groupsCount: this.newStageGroupKnockoutSubtype() === 'multiple_groups' ? this.newStageGroupsCount() : 1,
          advancingType: this.newStageAdvancingType(),
          singleGroupAdvancing: this.newStageSingleGroupAdvancing(),
          advancingCount: this.newStageGroupKnockoutSubtype() === 'multiple_groups'
            ? (this.newStageAdvancingType() === 'winner_and_runner' ? 2 : 1)
            : this.newStageSingleGroupAdvancing()
        };
      }

      if (this.newStageVenueId()) {
        stagePayload.config.venueId = this.newStageVenueId();
      }

      if (existingStages.length > 0) {
        await firstValueFrom(
          this.workspaceService.updateStage(ws.id, event.id, comp.id, existingStages[0].id, stagePayload)
        );
      } else {
        await firstValueFrom(
          this.workspaceService.createStage(ws.id, event.id, comp.id, stagePayload)
        );
      }

      // 3. Generate fixtures
      const result = await firstValueFrom(
        this.workspaceService.generateFixtures(ws.id, event.id, comp.id)
      );

      this.uiService.success(`Fixtures generated successfully! Created ${result.matchesCreated} matches.`);

      // 4. Reload stages (this will auto-select the stage and load its matches)
      this.loadStages(comp.id);
      
      this.isGeneratingFixturesSubmit.set(false);
      this.closeGenerateFixturesModal();
    } catch (err: any) {
      console.error('Failed to setup fixtures', err);
      this.generateFixturesSubmitError.set(err.error?.message ?? 'Failed to setup fixtures and generate matches.');
      this.isGeneratingFixturesSubmit.set(false);
    }
  }

  async onResetStagesAndFixtures() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;

    const confirmed = await this.uiService.confirm({
      title: 'Reset Stages & Fixtures',
      message: 'Are you sure you want to delete all stages and all generated fixtures for this competition? This action cannot be undone.',
      confirmText: 'Reset',
      type: 'danger',
    });
    if (!confirmed) return;

    this.isResettingStages.set(true);
    try {
      await firstValueFrom(
        this.workspaceService.resetStagesAndFixtures(ws.id, event.id, comp.id)
      );

      this.uiService.success('Stages and fixtures have been cleared successfully.');
      
      // Reset local state signals
      this.stages.set([]);
      this.selectedStage.set(null);
      this.matches.set([]);
      this.selectedMatch.set(null);

      // Force reload stages so UI returns to setup view
      this.loadStages(comp.id);
    } catch (err: any) {
      console.error('Failed to reset stages and fixtures', err);
      this.uiService.error(
        err.error?.message ?? 'Failed to clear stages and fixtures. Please try again.'
      );
    } finally {
      this.isResettingStages.set(false);
    }
  }
}
