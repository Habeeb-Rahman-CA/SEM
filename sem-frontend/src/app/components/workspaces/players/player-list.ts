import { Component, input, output, signal, computed, effect, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlayerService } from '../../../services/player.service';
import { Player, Team, WorkspaceMember } from '../../../services/workspace.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { ButtonComponent } from '../../../shared/components/button/button';
import { BadgeComponent } from '../../../shared/components/badge/badge';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card';
import { BulkImportComponent, BulkImportFieldMapping } from '../../../shared/components/bulk-import/bulk-import';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [
    FormsModule,
    AvatarComponent,
    ButtonComponent,
    BadgeComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    SearchInputComponent,
    StatCardComponent,
    BulkImportComponent
  ],
  templateUrl: './player-list.html',
})
export class PlayerListComponent {
  playerImportMapping: BulkImportFieldMapping = {
    titleKey: 'username',
    subtitleKey: 'jerseyNumber',
    subtitleLabel: 'Jersey',
    detailKey: 'teamCode',
    detailLabel: 'Team Code',
  };

  private playerService = inject(PlayerService);

  workspaceId = input.required<string>();
  players = input.required<Player[]>();
  members = input.required<WorkspaceMember[]>();
  teams = input.required<Team[]>();
  canUpdate = input<boolean>(false);
  selectedPlayerId = model<string | null>(null);

  add = output<void>();
  edit = output<Player>();
  delete = output<Player>();
  playersImported = output<Player[]>();

  playerSearchQuery = signal('');

  selectedPlayerForDetails = signal<any | null>(null);
  isLoadingPlayerStats = signal(false);

  // Bulk Import
  isBulkModalOpen = signal(false);
  bulkImportPlayers = signal<any[]>([]);
  bulkImportError = signal('');
  bulkImportSuccess = signal('');
  bulkImportProgress = signal(0);
  isImportingBulk = signal(false);

  filteredPlayers = computed(() => {
    const query = this.playerSearchQuery().toLowerCase().trim();
    if (!query) return this.players();
    return this.players().filter(p =>
      p.user.username.toLowerCase().includes(query) ||
      p.team.name.toLowerCase().includes(query) ||
      (p.jerseyNumber && p.jerseyNumber.toLowerCase().includes(query))
    );
  });

  constructor() {
    effect(() => {
      const playerId = this.selectedPlayerId();
      const wsId = this.workspaceId();
      if (playerId && wsId) {
        this.loadPlayerStats(wsId, playerId);
      } else {
        this.selectedPlayerForDetails.set(null);
      }
    }, { allowSignalWrites: true });
  }

  loadPlayerStats(workspaceId: string, playerId: string) {
    this.isLoadingPlayerStats.set(true);
    this.playerService.getPlayerStats(workspaceId, playerId).subscribe({
      next: (stats) => {
        this.selectedPlayerForDetails.set(stats);
        this.isLoadingPlayerStats.set(false);
      },
      error: (err) => {
        this.isLoadingPlayerStats.set(false);
        this.selectedPlayerForDetails.set(null);
        this.selectedPlayerId.set(null);
        console.error('Failed to load player statistics', err);
      }
    });
  }

  onBackToPlayers() {
    this.selectedPlayerId.set(null);
  }

  // Bulk import actions
  openBulkModal() {
    this.bulkImportPlayers.set([]);
    this.bulkImportError.set('');
    this.bulkImportSuccess.set('');
    this.bulkImportProgress.set(0);
    this.isImportingBulk.set(false);
    this.isBulkModalOpen.set(true);
  }

  closeBulkModal() {
    this.isBulkModalOpen.set(false);
    this.bulkImportPlayers.set([]);
    this.bulkImportError.set('');
    this.bulkImportSuccess.set('');
    this.bulkImportProgress.set(0);
    this.isImportingBulk.set(false);
  }

  async downloadTemplate() {
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

  onPlayersExcelParsed(json: any[]) {
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
    this.bulkImportError.set('');
    if (parsedPlayers.length === 0) {
      this.bulkImportError.set('No valid players found in the spreadsheet. Make sure you have a "Username" column.');
    }
  }

  async onConfirmBulkImport() {
    const wsId = this.workspaceId();
    const playersToImport = [...this.bulkImportPlayers()];
    if (!wsId || playersToImport.length === 0) return;

    this.isImportingBulk.set(true);
    this.bulkImportProgress.set(0);
    this.bulkImportError.set('');
    this.bulkImportSuccess.set('');

    let successCount = 0;
    let failCount = 0;
    let existCount = 0;

    const importedList: Player[] = [];

    for (let i = 0; i < playersToImport.length; i++) {
      const item = playersToImport[i];

      if (item.status === 'failed') {
        failCount++;
        this.bulkImportProgress.set(Math.round(((i + 1) / playersToImport.length) * 100));
        continue;
      }
      if (item.status === 'exist') {
        existCount++;
        this.bulkImportProgress.set(Math.round(((i + 1) / playersToImport.length) * 100));
        continue;
      }

      const member = this.members().find(m => m.user.username.toLowerCase() === item.username.toLowerCase());
      const team = this.teams().find(t => t.code && t.code.toUpperCase() === item.teamCode.toUpperCase());

      if (!member) {
        item.status = 'failed';
        item.error = 'User not found in workspace';
        failCount++;
        this.bulkImportPlayers.set([...playersToImport]);
        this.bulkImportProgress.set(Math.round(((i + 1) / playersToImport.length) * 100));
        continue;
      }
      if (!team) {
        item.status = 'failed';
        item.error = 'Team Code not found';
        failCount++;
        this.bulkImportPlayers.set([...playersToImport]);
        this.bulkImportProgress.set(Math.round(((i + 1) / playersToImport.length) * 100));
        continue;
      }

      try {
        await new Promise<void>((resolve) => {
          const payload = {
            userId: member.userId,
            teamId: team.id,
            ...(item.jerseyNumber && { jerseyNumber: item.jerseyNumber }),
          };

          this.playerService.createPlayer(wsId, payload).subscribe({
            next: (player) => {
              importedList.push(player);
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
      this.bulkImportProgress.set(Math.round(((i + 1) / playersToImport.length) * 100));
    }

    this.isImportingBulk.set(false);
    if (importedList.length > 0) {
      this.playersImported.emit(importedList);
    }

    if (failCount === 0 && existCount === 0) {
      this.bulkImportSuccess.set(`Successfully imported all ${successCount} players!`);
    } else {
      this.bulkImportSuccess.set(`Import finished: ${successCount} successful, ${existCount} already existed, ${failCount} failed.`);
    }
  }
}
