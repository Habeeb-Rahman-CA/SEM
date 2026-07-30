import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  WorkspaceService,
  Workspace,
  WorkspaceMember,
  Player,
  Team,
  WorkspaceEvent,
} from '../../workspaces/services/workspace.service';
import { PlayerService } from '../../players/services/player.service';
import { TeamService } from '../../teams/services/team.service';
import { EventService } from '../../events/services/event.service';
import { UiService } from '../../../core/services/ui.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { QrScannerComponent } from '../../../shared/components/qr-scanner/qr-scanner';
import { PullToRefreshDirective } from '../../../shared/directives/pull-to-refresh.directive';
import { BottomNavComponent } from '../../../layouts/bottom-nav/bottom-nav';
import { CheckInRecord, CheckInService } from '../services/check-in.service';

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DatePipe,
    AvatarComponent,
    QrScannerComponent,
    PullToRefreshDirective,
    BottomNavComponent,
  ],
  templateUrl: './check-in.html',
})
export class CheckInComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private workspaceService = inject(WorkspaceService);
  private playerService = inject(PlayerService);
  private teamService = inject(TeamService);
  private eventService = inject(EventService);
  private checkInService = inject(CheckInService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  workspace = signal<Workspace | null>(null);
  members = signal<WorkspaceMember[]>([]);
  players = signal<Player[]>([]);
  teams = signal<Team[]>([]);
  events = signal<WorkspaceEvent[]>([]);

  selectedEventId = signal<string>('');
  filterQuery = signal<string>('');
  isLoading = signal(true);

  history = signal<CheckInRecord[]>([]);
  lastResult = signal<CheckInRecord | null>(null);

  filteredHistory = computed(() => {
    const evId = this.selectedEventId();
    const query = this.filterQuery().trim().toLowerCase();
    return this.history().filter((r) => {
      if (evId && r.eventId !== evId) return false;
      if (
        query &&
        !r.displayName.toLowerCase().includes(query) &&
        !r.code.toLowerCase().includes(query)
      )
        return false;
      return true;
    });
  });

  checkedInCount = computed(() => this.filteredHistory().filter((r) => r.verified).length);
  unverifiedCount = computed(() => this.filteredHistory().filter((r) => !r.verified).length);

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.workspaceId.set(id);
        this.loadWorkspace(id);
      }
    });
  }

  private loadWorkspace(id: string) {
    this.isLoading.set(true);
    forkJoin({
      workspace: this.workspaceService.getOne(id),
      members: this.workspaceService.getMembers(id),
      players: this.playerService.getPlayers(id),
      teams: this.teamService.getTeams(id),
      events: this.eventService.getEvents(id),
    }).subscribe({
      next: (res) => {
        this.workspace.set(res.workspace);
        this.members.set(res.members);
        this.players.set(res.players);
        this.teams.set(res.teams);
        this.events.set(res.events);
        this.isLoading.set(false);
        void this.reloadHistory();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.ui.error(err?.error?.message || 'Failed to load workspace for check-in.');
      },
    });
  }

  private async reloadHistory() {
    const wsId = this.workspaceId();
    if (!wsId) return;
    this.history.set(await this.checkInService.load(wsId));
  }

  /** Reload workspace + history in response to a mobile pull-to-refresh. */
  onPullRefresh(pull: PullToRefreshDirective) {
    const id = this.workspaceId();
    if (!id) {
      pull.complete();
      return;
    }
    this.loadWorkspace(id);
    // loadWorkspace flips isLoading — mirror it back into the pull indicator.
    const timer = setInterval(() => {
      if (!this.isLoading()) {
        pull.complete();
        clearInterval(timer);
      }
    }, 100);
  }

  onScanned(code: string) {
    const wsId = this.workspaceId();
    if (!wsId) return;

    const parsed = this.checkInService.parse(code);
    const resolved = this.resolveSubject(parsed.kind, parsed.id);

    const record: CheckInRecord = {
      id: crypto.randomUUID(),
      workspaceId: wsId,
      eventId: this.selectedEventId() || null,
      scannedAt: new Date().toISOString(),
      code: parsed.raw,
      subjectKind: resolved.kind,
      subjectId: resolved.subjectId,
      displayName: resolved.displayName,
      detail: resolved.detail,
      verified: resolved.verified,
      note: resolved.note,
    };

    this.lastResult.set(record);
    void this.persist(record);

    if (record.verified) {
      this.ui.success(`Checked in: ${record.displayName}`);
    } else {
      this.ui.warning(`Unable to verify code — see log for details.`);
    }
  }

  private async persist(record: CheckInRecord) {
    const wsId = this.workspaceId();
    if (!wsId) return;
    const merged = await this.checkInService.record(wsId, record);
    this.history.set(merged);
  }

  private resolveSubject(
    kind: string,
    id: string | null,
  ): {
    kind: CheckInRecord['subjectKind'];
    subjectId: string | null;
    displayName: string;
    detail?: string;
    verified: boolean;
    note?: string;
  } {
    if (!id) {
      return {
        kind: 'unknown',
        subjectId: null,
        displayName: 'Empty QR payload',
        verified: false,
        note: 'The scanned code did not contain any identifier.',
      };
    }

    // Player match — by player id or user id
    if (kind === 'player' || kind === 'unknown') {
      const player =
        this.players().find((p) => p.id === id) || this.players().find((p) => p.userId === id);
      if (player) {
        const team = this.teams().find((t) => t.id === player.teamId);
        return {
          kind: 'player',
          subjectId: player.id,
          displayName: player.user.username,
          detail: `${team?.name ?? 'Team'} • #${player.jerseyNumber ?? '—'}`,
          verified: true,
        };
      }
    }

    // Member / official
    if (kind === 'member' || kind === 'user' || kind === 'unknown') {
      const member =
        this.members().find((m) => m.id === id) || this.members().find((m) => m.userId === id);
      if (member) {
        return {
          kind: 'member',
          subjectId: member.id,
          displayName: member.user.username,
          detail: member.role?.name ?? 'Member',
          verified: true,
        };
      }
    }

    // Team accreditation
    if (kind === 'team' || kind === 'unknown') {
      const team =
        this.teams().find((t) => t.id === id) ||
        this.teams().find((t) => t.code?.toLowerCase() === id.toLowerCase());
      if (team) {
        return {
          kind: 'team',
          subjectId: team.id,
          displayName: team.name,
          detail: `Team code: ${team.code}`,
          verified: true,
        };
      }
    }

    // Event pass
    if (kind === 'pass') {
      const event = this.events().find((e) => e.id === id);
      return {
        kind: 'pass',
        subjectId: event?.id ?? id,
        displayName: event ? `Event pass — ${event.name}` : 'Unknown event pass',
        detail: event ? `Scheduled ${event.startDate ?? 'TBD'}` : undefined,
        verified: !!event,
        note: event ? undefined : 'No event matched this pass id in the current workspace.',
      };
    }

    return {
      kind: 'unknown',
      subjectId: id,
      displayName: `Unrecognized code (${id.slice(0, 12)}…)`,
      verified: false,
      note: 'No player, member, team or event matched this code.',
    };
  }

  async onClearHistory() {
    const confirmed = await this.ui.confirm({
      title: 'Clear Check-in Log',
      message: this.selectedEventId()
        ? 'Remove check-in records for the selected event?'
        : 'Remove ALL check-in records for this workspace? This cannot be undone.',
      confirmText: 'Clear',
      type: 'danger',
    });
    if (!confirmed) return;
    const remaining = await this.checkInService.clear(
      this.workspaceId(),
      this.selectedEventId() || null,
    );
    this.history.set(remaining);
    this.lastResult.set(null);
    this.ui.success('Check-in log cleared.');
  }
}
