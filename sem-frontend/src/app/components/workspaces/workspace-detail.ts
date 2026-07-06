import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceService, Workspace, WorkspaceMember, Role, Team, Player, WorkspaceEvent, Sport, Competition } from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-workspace-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './workspace-detail.html',
  styleUrl: './workspace-detail.css',
})
export class WorkspaceDetailComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  workspace = signal<Workspace | null>(null);
  members = signal<WorkspaceMember[]>([]);
  roles = signal<Role[]>([]);
  isLoading = signal(true);
  error = signal('');
  activeTab = signal<'overview' | 'members' | 'settings' | 'teams' | 'players' | 'events'>('overview');

  // ── Teams State ────────────────────────────────────────────────────────────
  teams = signal<Team[]>([]);
  newTeamName = signal('');
  newTeamDescription = signal('');
  newTeamLogoUrl = signal('');
  isCreatingTeam = signal(false);
  teamCreateError = signal('');
  teamCreateSuccess = signal('');

  // Editing state for Teams
  editingTeam = signal<Team | null>(null);
  editTeamName = signal('');
  editTeamDescription = signal('');
  editTeamLogoUrl = signal('');
  isUpdatingTeam = signal(false);
  teamUpdateError = signal('');
  teamUpdateSuccess = signal('');

  // ── Players State ──────────────────────────────────────────────────────────
  players = signal<Player[]>([]);
  newPlayerUserId = signal('');
  newPlayerJerseyNumber = signal('');
  newPlayerTeamId = signal('');
  isCreatingPlayer = signal(false);
  playerCreateError = signal('');
  playerCreateSuccess = signal('');

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
  isCreatingEvent = signal(false);
  eventCreateError = signal('');
  eventCreateSuccess = signal('');

  // Editing state for Events
  editingEvent = signal<WorkspaceEvent | null>(null);
  editEventName = signal('');
  editEventDescription = signal('');
  editEventStartDate = signal('');
  editEventEndDate = signal('');
  editEventStatus = signal('upcoming');
  isUpdatingEvent = signal(false);
  eventUpdateError = signal('');
  eventUpdateSuccess = signal('');

  // ── Competitions State ───────────────────────────────────────────────────────
  sports = signal<Sport[]>([]);
  selectedEvent = signal<WorkspaceEvent | null>(null);
  competitions = signal<Competition[]>([]);
  isLoadingCompetitions = signal(false);
  
  newCompetitionName = signal('');
  newCompetitionSportId = signal('');
  newCompetitionStatus = signal('upcoming');
  isCreatingCompetition = signal(false);
  competitionCreateError = signal('');
  competitionCreateSuccess = signal('');

  editingCompetition = signal<Competition | null>(null);
  editCompetitionName = signal('');
  editCompetitionSportId = signal('');
  editCompetitionStatus = signal('upcoming');
  isUpdatingCompetition = signal(false);
  competitionUpdateError = signal('');
  competitionUpdateSuccess = signal('');

  // ── Workspace Edit State ───────────────────────────────────────────────────
  editName = signal('');
  editDescription = signal('');
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
        this.loadMembers(id);
        this.loadRoles(id);
        this.loadTeams(id);
        this.loadPlayers(id);
        this.loadEvents(id);
        this.loadSports();
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

  deleteWorkspace() {
    const ws = this.workspace();
    if (!ws) return;
    if (!confirm(`Are you sure you want to delete "${ws.name}"? This cannot be undone.`)) return;
    this.workspaceService.remove(ws.id).subscribe({
      next: () => this.router.navigate(['/workspaces']),
      error: (err) => alert(err.error?.message ?? 'Failed to delete workspace.'),
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

    this.workspaceService.update(ws.id, { name, description }).subscribe({
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
      viewer:              'bg-slate-700 text-slate-300 border-slate-600',
    };
    return map[slug] ?? 'bg-slate-700 text-slate-300 border-slate-600';
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
      },
      error: (err) => {
        alert(err.error?.message ?? 'Failed to update member role.');
        select.value = member.role?.slug ?? '';
      }
    });
  }

  // ── Remove Member ──────────────────────────────────────────────────────────

  onRemoveMember(member: WorkspaceMember) {
    const ws = this.workspace();
    if (!ws) return;
    if (!confirm(`Remove "${member.user.username}" from this workspace?`)) return;

    this.workspaceService.removeMember(ws.id, member.userId).subscribe({
      next: () => this.members.update(prev => prev.filter(m => m.userId !== member.userId)),
      error: (err) => alert(err.error?.message ?? 'Failed to remove member.'),
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

  onDeleteRole(role: Role) {
    const ws = this.workspace();
    if (!ws) return;
    if (!confirm(`Delete the role "${role.name}"? This cannot be undone.`)) return;

    this.workspaceService.removeRole(ws.id, role.id).subscribe({
      next: () => this.roles.update(prev => prev.filter(r => r.id !== role.id)),
      error: (err) => alert(err.error?.message ?? 'Failed to delete role.'),
    });
  }

  // ── Teams CRUD ─────────────────────────────────────────────────────────────

  loadTeams(workspaceId: string) {
    this.workspaceService.getTeams(workspaceId).subscribe({
      next: (teams) => this.teams.set(teams),
      error: (err) => console.error('Failed to load teams', err),
    });
  }

  onCreateTeam() {
    const name = this.newTeamName().trim();
    const description = this.newTeamDescription().trim();
    const logoUrl = this.newTeamLogoUrl().trim();
    const ws = this.workspace();
    if (!ws || !name) return;

    this.isCreatingTeam.set(true);
    this.teamCreateError.set('');
    this.teamCreateSuccess.set('');

    this.workspaceService.createTeam(ws.id, name, description || undefined, logoUrl || undefined).subscribe({
      next: (team) => {
        this.isCreatingTeam.set(false);
        this.teamCreateSuccess.set(`Team "${team.name}" registered successfully!`);
        this.newTeamName.set('');
        this.newTeamDescription.set('');
        this.newTeamLogoUrl.set('');
        this.teams.update(prev => [...prev, team]);
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
    this.editTeamDescription.set(team.description ?? '');
    this.editTeamLogoUrl.set(team.logoUrl ?? '');
    this.teamUpdateError.set('');
    this.teamUpdateSuccess.set('');
  }

  onCancelEditTeam() {
    this.editingTeam.set(null);
  }

  onUpdateTeam() {
    const name = this.editTeamName().trim();
    const description = this.editTeamDescription().trim();
    const logoUrl = this.editTeamLogoUrl().trim();
    const ws = this.workspace();
    const team = this.editingTeam();
    if (!ws || !team || !name) return;

    this.isUpdatingTeam.set(true);
    this.teamUpdateError.set('');
    this.teamUpdateSuccess.set('');

    this.workspaceService.updateTeam(ws.id, team.id, name, description || undefined, logoUrl || undefined).subscribe({
      next: (updated) => {
        this.isUpdatingTeam.set(false);
        this.teamUpdateSuccess.set(`Team updated successfully!`);
        this.teams.update(prev => prev.map(t => t.id === team.id ? updated : t));
        setTimeout(() => this.editingTeam.set(null), 1000);
      },
      error: (err) => {
        this.isUpdatingTeam.set(false);
        this.teamUpdateError.set(err.error?.message ?? 'Failed to update team.');
      }
    });
  }

  onDeleteTeam(team: Team) {
    const ws = this.workspace();
    if (!ws) return;
    if (!confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;

    this.workspaceService.removeTeam(ws.id, team.id).subscribe({
      next: () => {
        this.teams.update(prev => prev.filter(t => t.id !== team.id));
      },
      error: (err) => {
        alert(err.error?.message ?? 'Failed to delete team.');
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
        this.newPlayerUserId.set('');
        this.newPlayerJerseyNumber.set('');
        this.newPlayerTeamId.set('');
        this.players.update(prev => [...prev, player]);
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
  }

  onCancelEditPlayer() {
    this.editingPlayer.set(null);
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
        setTimeout(() => this.editingPlayer.set(null), 1000);
      },
      error: (err) => {
        this.isUpdatingPlayer.set(false);
        this.playerUpdateError.set(err.error?.message ?? 'Failed to update player.');
      }
    });
  }

  onDeletePlayer(player: Player) {
    const ws = this.workspace();
    if (!ws) return;
    if (!confirm(`Delete player "${player.user.username}"? This cannot be undone.`)) return;

    this.workspaceService.removePlayer(ws.id, player.id).subscribe({
      next: () => {
        this.players.update(prev => prev.filter(p => p.id !== player.id));
      },
      error: (err) => {
        alert(err.error?.message ?? 'Failed to delete player.');
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
      ...(description && { description }),
      ...(startDate && { startDate: new Date(startDate).toISOString() }),
      ...(endDate && { endDate: new Date(endDate).toISOString() }),
      ...(status && { status }),
    };

    this.workspaceService.createEvent(ws.id, payload).subscribe({
      next: (event) => {
        this.isCreatingEvent.set(false);
        this.eventCreateSuccess.set(`Event "${event.name}" created successfully!`);
        this.newEventName.set('');
        this.newEventDescription.set('');
        this.newEventStartDate.set('');
        this.newEventEndDate.set('');
        this.newEventStatus.set('upcoming');
        this.events.update(prev => [...prev, event]);
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
    this.eventUpdateError.set('');
    this.eventUpdateSuccess.set('');
  }

  onCancelEditEvent() {
    this.editingEvent.set(null);
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
    };

    this.workspaceService.updateEvent(ws.id, event.id, payload).subscribe({
      next: (updated) => {
        this.isUpdatingEvent.set(false);
        this.eventUpdateSuccess.set(`Event updated successfully!`);
        this.events.update(prev => prev.map(e => e.id === event.id ? updated : e));
        setTimeout(() => this.editingEvent.set(null), 1000);
      },
      error: (err) => {
        this.isUpdatingEvent.set(false);
        this.eventUpdateError.set(err.error?.message ?? 'Failed to update event.');
      }
    });
  }

  onDeleteEvent(event: WorkspaceEvent) {
    const ws = this.workspace();
    if (!ws) return;
    if (!confirm(`Delete event "${event.name}"? This cannot be undone.`)) return;

    this.workspaceService.removeEvent(ws.id, event.id).subscribe({
      next: () => {
        this.events.update(prev => prev.filter(e => e.id !== event.id));
      },
      error: (err) => {
        alert(err.error?.message ?? 'Failed to delete event.');
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

    const payload = {
      name,
      sportId,
      status,
    };

    this.workspaceService.createCompetition(ws.id, event.id, payload).subscribe({
      next: (comp) => {
        this.isCreatingCompetition.set(false);
        this.competitionCreateSuccess.set(`Competition "${comp.name}" created successfully!`);
        this.newCompetitionName.set('');
        this.newCompetitionSportId.set('');
        this.newCompetitionStatus.set('upcoming');
        this.competitions.update(prev => [...prev, comp]);
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
    this.competitionUpdateError.set('');
    this.competitionUpdateSuccess.set('');
  }

  onCancelEditCompetition() {
    this.editingCompetition.set(null);
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

    const payload = {
      name,
      sportId,
      status,
    };

    this.workspaceService.updateCompetition(ws.id, event.id, comp.id, payload).subscribe({
      next: (updated) => {
        this.isUpdatingCompetition.set(false);
        this.competitionUpdateSuccess.set(`Competition updated successfully!`);
        this.competitions.update(prev => prev.map(c => c.id === comp.id ? updated : c));
        setTimeout(() => this.editingCompetition.set(null), 1000);
      },
      error: (err) => {
        this.isUpdatingCompetition.set(false);
        this.competitionUpdateError.set(err.error?.message ?? 'Failed to update competition.');
      }
    });
  }

  onDeleteCompetition(comp: Competition) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!ws || !event) return;
    if (!confirm(`Delete competition "${comp.name}"? This cannot be undone.`)) return;

    this.workspaceService.removeCompetition(ws.id, event.id, comp.id).subscribe({
      next: () => {
        this.competitions.update(prev => prev.filter(c => c.id !== comp.id));
      },
      error: (err) => {
        alert(err.error?.message ?? 'Failed to delete competition.');
      }
    });
  }
}
