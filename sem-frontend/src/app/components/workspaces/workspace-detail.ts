import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceService, Workspace, WorkspaceMember, Role, Team, Player, WorkspaceEvent, Sport, Competition, CompetitionStage, CompetitionTeam, Match } from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';

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

  workspace = signal<Workspace | null>(null);
  members = signal<WorkspaceMember[]>([]);
  roles = signal<Role[]>([]);
  isLoading = signal(true);
  error = signal('');
  activeTab = signal<'overview' | 'members' | 'settings' | 'teams' | 'players' | 'events'>('overview');
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

  // ── Stages State ───────────────────────────────────────────────────────────
  selectedCompetition = signal<Competition | null>(null);
  stages = signal<CompetitionStage[]>([]);
  isLoadingStages = signal(false);

  newStageName = signal('');
  newStageType = signal<'group' | 'knockout' | 'group_knockout'>('group');
  newStageWinPoint = signal<number>(3);
  newStageDrawPoint = signal<number>(1);
  newStageTwoLegged = signal<boolean>(false);
  newStageGroupsCount = signal<number>(2);
  newStageAdvancingCount = signal<number>(2);
  newStageGamesPerTeam = signal<number>(3);

  isCreatingStage = signal(false);
  stageCreateError = signal('');
  stageCreateSuccess = signal('');

  editingStage = signal<CompetitionStage | null>(null);
  editStageName = signal('');
  editStageType = signal<'group' | 'knockout' | 'group_knockout'>('group');
  editStageWinPoint = signal<number>(3);
  editStageDrawPoint = signal<number>(1);
  editStageTwoLegged = signal<boolean>(false);
  editStageGroupsCount = signal<number>(2);
  editStageAdvancingCount = signal<number>(2);
  editStageGamesPerTeam = signal<number>(3);

  isUpdatingStage = signal(false);
  stageUpdateError = signal('');
  stageUpdateSuccess = signal('');

  // ── Matches State ──────────────────────────────────────────────────────────
  selectedStage = signal<CompetitionStage | null>(null);
  matches = signal<Match[]>([]);
  selectedMatch = signal<Match | null>(null);
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

  // ── Fixture Generator State ─────────────────────────────────────────────────
  isGeneratingFixtures = signal(false);
  generateFixturesError = signal('');
  generateFixturesSuccess = signal('');

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

  onAddEvent() {
    this.editingEvent.set(null);
    this.newEventName.set('');
    this.newEventDescription.set('');
    this.newEventStartDate.set('');
    this.newEventEndDate.set('');
    this.newEventStatus.set('upcoming');
    this.newEventLogoUrl.set('');
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
      ...(description && { description }),
      ...(startDate && { startDate: new Date(startDate).toISOString() }),
      ...(endDate && { endDate: new Date(endDate).toISOString() }),
      ...(status && { status }),
      ...(this.newEventLogoUrl() && { logoUrl: this.newEventLogoUrl() }),
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
    };

    this.workspaceService.updateEvent(ws.id, event.id, payload).subscribe({
      next: (updated) => {
        this.isUpdatingEvent.set(false);
        this.eventUpdateSuccess.set(`Event updated successfully!`);
        this.events.update(prev => prev.map(e => e.id === event.id ? updated : e));
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
      config,
    }).subscribe({
      next: (created) => {
        this.matches.update(prev => [...prev, created]);
        this.matchCreateSuccess.set('Match scheduled successfully!');
        this.uiService.success('Match scheduled successfully!');
        this.newMatchHomeTeamId.set('');
        this.newMatchAwayTeamId.set('');
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

  onRecordFootballGoal(teamId: string, scorerId: string, assistId: string) {
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
      teamId,
      playerUserId: scorerId,
      assistPlayerUserId: assistId || undefined,
      minute: currentMin,
    });

    const isHome = teamId === match.homeTeamId;
    const newHomeScore = isHome ? match.homeScore + 1 : match.homeScore;
    const newAwayScore = !isHome ? match.awayScore + 1 : match.awayScore;

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

  onRecordCricketBall(runs: number, extraRuns: number, wicket: boolean) {
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

    // Update Runs
    innings.runs += runs + extraRuns;
    innings.balls += 1;
    if (innings.balls >= 6) {
      innings.overs += 1;
      innings.balls = 0;
    }

    // Update wickets
    if (wicket) {
      innings.wickets += 1;
    }

    live.inningsData[inningsIndex] = innings;

    // Update main scores
    const isHomeBatting = innings.battingTeamId === match.homeTeamId;
    const homeScore = isHomeBatting ? innings.runs : (live.inningsData[0]?.runs ?? 0);
    const awayScore = !isHomeBatting ? innings.runs : (live.inningsData[0]?.runs ?? 0);

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
}
