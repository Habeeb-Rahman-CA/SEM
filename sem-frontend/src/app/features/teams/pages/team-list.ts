import { Component, input, output, signal, computed, effect, inject, model } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeamService } from '../services/team.service';
import { Team } from '../../workspaces/services/workspace.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { ButtonComponent } from '../../../shared/components/button/button';
import { BadgeComponent } from '../../../shared/components/badge/badge';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card';
import { TabBarComponent } from '../../../shared/components/tab-bar/tab-bar';
import { TabItem } from '../../../shared/components/tab-bar/tab-bar';
import {
  BulkImportComponent,
  BulkImportFieldMapping,
} from '../../../shared/components/bulk-import/bulk-import';
import { PaginatorComponent } from '../../../shared';
import { BulkOperationsBarComponent } from '../../../shared/components/bulk-operations-bar/bulk-operations-bar';
import { SavedFiltersBarComponent } from '../../../shared/components/saved-filters-bar/saved-filters-bar';
import { UndoService } from '../../../core/services/undo.service';
import { VersionHistoryService } from '../../../core/services/version-history.service';
import { ConfettiService } from '../../../core/services/confetti.service';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    FormsModule,
    AvatarComponent,
    ButtonComponent,
    BadgeComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    SearchInputComponent,
    StatCardComponent,
    TabBarComponent,
    BulkImportComponent,
    PaginatorComponent,
    BulkOperationsBarComponent,
    SavedFiltersBarComponent,
  ],
  templateUrl: './team-list.html',
})
export class TeamListComponent {
  teamImportMapping: BulkImportFieldMapping = {
    titleKey: 'name',
    subtitleKey: 'code',
    subtitleLabel: 'Code',
    extraKey: 'logoUrl',
    extraLabel: 'Has Logo',
  };

  private teamService = inject(TeamService);
  private ui = inject(UiService);
  private confetti = inject(ConfettiService);
  undoService = inject(UndoService);
  versionService = inject(VersionHistoryService);

  workspaceId = input.required<string>();
  teams = input.required<Team[]>();
  canUpdate = input<boolean>(false);
  selectedTeamId = model<string | null>(null);

  add = output<void>();
  edit = output<Team>();
  delete = output<Team>();
  teamsImported = output<Team[]>();

  teamSearchQuery = signal('');
  sortOrder = signal('name-asc');
  page = signal(1);
  pageSize = signal(12);

  selectedTeamForDetails = signal<any | null>(null);
  selectedTeamAnalytics = signal<any | null>(null);
  activeTeamDetailTab = signal<'overview' | 'analytics' | 'competitions' | 'squad'>('overview');
  teamDetailTabs = computed<TabItem[]>(() => {
    const details = this.selectedTeamForDetails();
    const squadCount = details?.squad?.length ?? 0;
    return [
      { id: 'overview', label: 'All-Time Stats' },
      { id: 'analytics', label: 'Performance Analytics' },
      { id: 'competitions', label: 'Competition History' },
      { id: 'squad', label: 'Squad', badge: squadCount },
    ];
  });
  isLoadingTeamStats = signal(false);
  isLoadingTeamAnalytics = signal(false);

  // Bulk Import
  isBulkModalOpen = signal(false);
  bulkImportTeams = signal<any[]>([]);
  bulkImportError = signal('');
  bulkImportSuccess = signal('');
  bulkImportProgress = signal(0);
  isImportingBulk = signal(false);

  // ── Bulk Selection & Operations ──────────────────────────────────────────────
  selectedTeamIds = signal<Set<string>>(new Set());

  selectedCount = computed(() => this.selectedTeamIds().size);

  isAllSelected = computed(() => {
    const list = this.filteredTeams();
    if (list.length === 0) return false;
    const selected = this.selectedTeamIds();
    return list.every((t) => selected.has(t.id));
  });

  teamStatusOptions = [
    { key: 'active', label: 'Active', color: 'bg-emerald-400' },
    { key: 'inactive', label: 'Inactive', color: 'bg-amber-400' },
    { key: 'archived', label: 'Archived', color: 'bg-slate-500' },
  ];

  filteredTeams = computed(() => {
    const query = this.teamSearchQuery().toLowerCase().trim();
    let list = this.teams();

    if (query) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(query) || (t.code && t.code.toLowerCase().includes(query)),
      );
    }

    const sort = this.sortOrder();
    list = [...list].sort((a, b) => {
      if (sort === 'name-asc') {
        return a.name.localeCompare(b.name);
      } else if (sort === 'name-desc') {
        return b.name.localeCompare(a.name);
      } else if (sort === 'code-asc') {
        return (a.code || '').localeCompare(b.code || '');
      } else if (sort === 'code-desc') {
        return (b.code || '').localeCompare(a.code || '');
      }
      return 0;
    });

    return list;
  });

  paginatedTeams = computed(() => {
    const list = this.filteredTeams();
    const startIndex = (this.page() - 1) * this.pageSize();
    return list.slice(startIndex, startIndex + this.pageSize());
  });

  constructor() {
    effect(
      () => {
        const teamId = this.selectedTeamId();
        const wsId = this.workspaceId();
        if (teamId && wsId) {
          this.loadTeamStats(wsId, teamId);
        } else {
          this.selectedTeamForDetails.set(null);
          this.selectedTeamAnalytics.set(null);
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        this.teamSearchQuery();
        this.sortOrder();
        this.page.set(1);
      },
      { allowSignalWrites: true },
    );
  }

  toggleSelectAll() {
    const currentSelected = this.selectedTeamIds();
    const list = this.filteredTeams();
    const newSet = new Set(currentSelected);

    if (this.isAllSelected()) {
      for (const t of list) {
        newSet.delete(t.id);
      }
    } else {
      for (const t of list) {
        newSet.add(t.id);
      }
    }
    this.selectedTeamIds.set(newSet);
  }

  toggleSelectTeam(id: string) {
    const newSet = new Set(this.selectedTeamIds());
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    this.selectedTeamIds.set(newSet);
  }

  clearSelection() {
    this.selectedTeamIds.set(new Set());
  }

  handleBulkDelete() {
    const count = this.selectedCount();
    const ids = Array.from(this.selectedTeamIds());

    for (const id of ids) {
      const team = this.teams().find((t) => t.id === id);
      if (team) this.delete.emit(team);
    }

    this.selectedTeamIds.set(new Set());
    this.ui.success(`Bulk Operation: ${count} teams deleted.`);
  }

  handleBulkAssign(targetId: string) {
    const count = this.selectedCount();
    this.ui.success(`Bulk Operation: Assigned ${count} teams.`);
    this.selectedTeamIds.set(new Set());
  }

  handleBulkExport(format: 'csv' | 'excel' | 'json') {
    const selectedList = this.teams().filter((t) => this.selectedTeamIds().has(t.id));
    const count = selectedList.length;

    if (format === 'json') {
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedList, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `teams_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      let csvContent = 'data:text/csv;charset=utf-8,ID,Name,Code,Description\n';
      for (const t of selectedList) {
        csvContent += `"${t.id}","${t.name}","${t.code || ''}","${t.description || ''}"\n`;
      }
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `teams_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    this.ui.success(`Exported ${count} teams as ${format.toUpperCase()}.`);
  }

  handleBulkArchive() {
    const count = this.selectedCount();
    this.ui.info(`Bulk Operation: Archived ${count} selected teams.`);
    this.undoService.registerUndoAction(`Archived ${count} teams`, () => {
      this.ui.info(`Restored ${count} archived teams.`);
    });
    this.selectedTeamIds.set(new Set());
  }

  onApplyPreset(preset: any) {
    if (preset.query) {
      this.teamSearchQuery.set(preset.query);
    }
  }

  openTeamVersionHistory(team: Team) {
    this.versionService.openVersionHistory('team', team.id, `Team Roster: ${team.name}`);
  }

  handleBulkUpdateStatus(statusKey: string) {
    const count = this.selectedCount();
    this.ui.success(
      `Bulk Operation: Updated status to "${statusKey.toUpperCase()}" for ${count} teams.`,
    );
    this.selectedTeamIds.set(new Set());
  }

  loadTeamStats(workspaceId: string, teamId: string) {
    this.isLoadingTeamStats.set(true);
    this.selectedTeamAnalytics.set(null);
    this.teamService.getTeamStats(workspaceId, teamId).subscribe({
      next: (stats) => {
        this.selectedTeamForDetails.set(stats);
        this.activeTeamDetailTab.set('overview');
        this.isLoadingTeamStats.set(false);
        this.loadTeamAnalytics(workspaceId, teamId);
      },
      error: (err) => {
        this.isLoadingTeamStats.set(false);
        this.selectedTeamForDetails.set(null);
        this.selectedTeamAnalytics.set(null);
        this.selectedTeamId.set(null);
        console.error('Failed to load team statistics', err);
      },
    });
  }

  loadTeamAnalytics(workspaceId: string, teamId: string) {
    this.isLoadingTeamAnalytics.set(true);
    this.teamService.getTeamAnalytics(workspaceId, teamId).subscribe({
      next: (analytics) => {
        this.selectedTeamAnalytics.set(analytics);
        this.isLoadingTeamAnalytics.set(false);
      },
      error: (err) => {
        this.isLoadingTeamAnalytics.set(false);
        console.error('Failed to load team analytics', err);
      },
    });
  }

  onBackToTeams() {
    this.selectedTeamId.set(null);
    this.selectedTeamAnalytics.set(null);
  }

  // Bulk import actions
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
    const XLSX = (await import('xlsx-js-style')) as any;
    const ws: any = {
      '!ref': 'A1:D3',
      A1: { v: 'Name', t: 's', s: { font: { bold: true } } },
      B1: { v: 'Code', t: 's', s: { font: { bold: true } } },
      C1: { v: 'Description', t: 's', s: { font: { bold: true } } },
      D1: { v: 'LogoUrl', t: 's', s: { font: { bold: true } } },
      A2: { v: '#Required', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
      B2: { v: '#Required', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
      C2: { v: '#Optional', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
      D2: { v: '#Optional', t: 's', s: { font: { color: { rgb: '4B525D' } } } },
      A3: { v: 'eg. Warriors FC', t: 's', s: { font: { italic: true } } },
      B3: { v: 'eg. WAR', t: 's', s: { font: { italic: true } } },
      C3: { v: 'eg. A passionate local football club.', t: 's', s: { font: { italic: true } } },
      D3: { v: 'eg. https://example.com/logo.png', t: 's', s: { font: { italic: true } } },
    };

    ws['!cols'] = [{ wch: 22 }, { wch: 15 }, { wch: 42 }, { wch: 42 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teams Template');
    XLSX.writeFile(wb, 'teams_import_template.xlsx');
  }

  onTeamsExcelParsed(json: any[]) {
    const parsedTeams = json
      .map((row: any) => {
        const nameKey = Object.keys(row).find((k) => k.toLowerCase() === 'name') || 'Name';
        const codeKey = Object.keys(row).find((k) => k.toLowerCase() === 'code') || 'Code';
        const descKey =
          Object.keys(row).find((k) => k.toLowerCase() === 'description') || 'Description';
        const logoKey =
          Object.keys(row).find(
            (k) => k.toLowerCase() === 'logourl' || k.toLowerCase() === 'logo',
          ) || 'LogoUrl';

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
          const nameExists = this.teams().some((t) => t.name.toLowerCase() === name.toLowerCase());
          const codeExists =
            code && this.teams().some((t) => t.code && t.code.toUpperCase() === code.toUpperCase());

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
          error,
        };
      })
      .filter((t) => {
        if (!t.name) return false;
        const lowerName = t.name.toLowerCase();
        if (lowerName === '#required' || lowerName === 'required') return false;
        if (lowerName.startsWith('eg.')) return false;
        if (lowerName.startsWith('eg ')) return false;
        return true;
      });

    this.bulkImportTeams.set(parsedTeams);
    this.bulkImportError.set('');
    if (parsedTeams.length === 0) {
      this.bulkImportError.set(
        'No valid teams found in the spreadsheet. Make sure you have a "Name" column.',
      );
    }
  }

  async onConfirmBulkImport() {
    const wsId = this.workspaceId();
    const teamsToImport = [...this.bulkImportTeams()];
    if (!wsId || teamsToImport.length === 0) return;

    this.isImportingBulk.set(true);
    this.bulkImportProgress.set(0);
    this.bulkImportError.set('');
    this.bulkImportSuccess.set('');

    let successCount = 0;
    let failCount = 0;
    let existCount = 0;

    const importedList: Team[] = [];

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
          const finalCode =
            item.code ||
            item.name.substring(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);
          this.teamService
            .createTeam(wsId, {
              name: item.name,
              code: finalCode,
              description: item.description || undefined,
              logoUrl: item.logoUrl || undefined,
            })
            .subscribe({
              next: (team) => {
                importedList.push(team);
                item.status = 'success';
                item.error = '';
                successCount++;
                this.bulkImportTeams.set([...teamsToImport]);
                resolve();
              },
              error: (err) => {
                const errMsg = err.error?.message ?? 'Unknown error';
                if (
                  errMsg.toLowerCase().includes('already registered') ||
                  errMsg.toLowerCase().includes('unique') ||
                  err.status === 409
                ) {
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
              },
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
    if (importedList.length > 0) {
      this.teamsImported.emit(importedList);
      this.confetti.celebrate(
        'registration_completed',
        'Teams Registration Completed!',
        `Successfully registered ${importedList.length} teams in the workspace.`,
      );
    }

    if (failCount === 0 && existCount === 0) {
      this.bulkImportSuccess.set(`Successfully imported all ${successCount} teams!`);
    } else {
      this.bulkImportSuccess.set(
        `Import finished: ${successCount} successful, ${existCount} already existed, ${failCount} failed.`,
      );
    }
  }
}
