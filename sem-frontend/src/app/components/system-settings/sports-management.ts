import { Component, signal, inject, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkspaceService, Sport } from '../../services/workspace.service';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-sports-management',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sports-management.html',
})
export class SportsManagementComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  private uiService = inject(UiService);

  sports = signal<Sport[]>([]);
  isLoadingSports = signal(false);

  // Create Sport Form Signals
  newSportName = signal('');
  newSportCode = signal('');
  newSportDescription = signal('');
  isCreatingSport = signal(false);
  sportCreateSuccess = signal('');
  sportCreateError = signal('');

  // Edit Sport Modal State
  editingSport = signal<Sport | null>(null);
  editSportName = signal('');
  editSportCode = signal('');
  editSportDescription = signal('');
  isUpdatingSport = signal(false);

  // Output to notify parent when list changes (so parent can update its counts)
  sportsChanged = output<number>();

  ngOnInit() {
    this.loadSports();
  }

  loadSports() {
    this.isLoadingSports.set(true);
    this.workspaceService.getSports().subscribe({
      next: (sports) => {
        this.sports.set(sports);
        this.isLoadingSports.set(false);
        this.sportsChanged.emit(sports.length);
      },
      error: (err) => {
        console.error('Failed to load sports', err);
        this.isLoadingSports.set(false);
      },
    });
  }

  onCreateSport() {
    const name = this.newSportName().trim();
    const code = this.newSportCode().trim();
    const description = this.newSportDescription().trim();
    if (!name || !code) return;

    this.isCreatingSport.set(true);
    this.sportCreateError.set('');
    this.sportCreateSuccess.set('');

    this.workspaceService.createSport(name, code, description || undefined).subscribe({
      next: (sport) => {
        this.isCreatingSport.set(false);
        this.sportCreateSuccess.set(`Sport "${sport.name}" created successfully!`);
        this.newSportName.set('');
        this.newSportCode.set('');
        this.newSportDescription.set('');
        this.sports.update((prev) => [...prev, sport]);
        this.sportsChanged.emit(this.sports().length);
      },
      error: (err) => {
        this.isCreatingSport.set(false);
        this.sportCreateError.set(err.error?.message ?? 'Failed to create sport.');
      },
    });
  }

  openEditSportModal(sport: Sport) {
    this.editingSport.set(sport);
    this.editSportName.set(sport.name);
    this.editSportCode.set(sport.code);
    this.editSportDescription.set(sport.description || '');
  }

  closeEditSportModal() {
    this.editingSport.set(null);
    this.editSportName.set('');
    this.editSportCode.set('');
    this.editSportDescription.set('');
  }

  onUpdateSport() {
    const sport = this.editingSport();
    if (!sport) return;

    const name = this.editSportName().trim();
    const code = this.editSportCode().trim();
    const description = this.editSportDescription().trim();
    if (!name || !code) return;

    this.isUpdatingSport.set(true);
    this.workspaceService.updateSport(sport.id, name, code, description || undefined).subscribe({
      next: (updatedSport) => {
        this.isUpdatingSport.set(false);
        this.sports.update((prev) =>
          prev.map((s) => (s.id === updatedSport.id ? updatedSport : s))
        );
        this.closeEditSportModal();
        this.uiService.success(`Sport "${updatedSport.name}" updated successfully.`);
        this.sportsChanged.emit(this.sports().length);
      },
      error: (err) => {
        this.isUpdatingSport.set(false);
        this.uiService.error(err.error?.message ?? 'Failed to update sport.');
      },
    });
  }

  async onDeleteSport(sport: Sport) {
    const confirmed = await this.uiService.confirm({
      title: 'Delete Sport Master Data',
      message: `Delete the sport "${sport.name}" (${sport.code})? This will fail if competitions use it.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.deleteSport(sport.id).subscribe({
      next: () => {
        this.sports.update((prev) => prev.filter((s) => s.id !== sport.id));
        this.uiService.success(`Sport "${sport.name}" deleted successfully.`);
        this.sportsChanged.emit(this.sports().length);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete sport.');
      },
    });
  }
}
