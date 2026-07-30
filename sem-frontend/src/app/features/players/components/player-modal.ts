import { Component, input, output, signal, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlayerService } from '../services/player.service';
import { Player, Team, WorkspaceMember } from '../../workspaces/services/workspace.service';

@Component({
  selector: 'app-player-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './player-modal.html',
})
export class PlayerModalComponent {
  isOpen = input<boolean>(false);
  player = input<Player | null>(null);
  workspaceId = input<string>('');
  members = input<WorkspaceMember[]>([]);
  teams = input<Team[]>([]);

  close = output<void>();
  save = output<Player>();

  private playerService = inject(PlayerService);

  userId = signal('');
  teamId = signal('');
  jerseyNumber = signal('');
  bio = signal('');
  position = signal('');
  achievements = signal<
    Array<{ id: string; title: string; description?: string | null; year?: number | null }>
  >([]);
  newAchTitle = signal('');
  newAchDesc = signal('');
  newAchYear = signal('');

  isSaving = signal(false);
  saveSuccess = signal('');
  saveError = signal('');

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        const p = this.player();
        if (p) {
          this.userId.set(p.userId);
          this.teamId.set(p.teamId);
          this.jerseyNumber.set(p.jerseyNumber ?? '');
          this.bio.set(p.bio ?? '');
          this.position.set(p.position ?? '');
          this.achievements.set(p.achievements ?? []);
        } else {
          this.userId.set('');
          this.teamId.set('');
          this.jerseyNumber.set('');
          this.bio.set('');
          this.position.set('');
          this.achievements.set([]);
        }
        this.newAchTitle.set('');
        this.newAchDesc.set('');
        this.newAchYear.set('');
        this.saveSuccess.set('');
        this.saveError.set('');
      }
    });
  }

  addAchievement() {
    const title = this.newAchTitle().trim();
    if (!title) return;
    const yearRaw = this.newAchYear().trim();
    const year = yearRaw ? Number(yearRaw) : null;
    const entry = {
      id: crypto.randomUUID(),
      title,
      description: this.newAchDesc().trim() || null,
      year: Number.isFinite(year as number) ? year : null,
    };
    this.achievements.update((prev) => [entry, ...prev]);
    this.newAchTitle.set('');
    this.newAchDesc.set('');
    this.newAchYear.set('');
  }

  removeAchievement(id: string) {
    this.achievements.update((prev) => prev.filter((a) => a.id !== id));
  }

  closeModal() {
    this.close.emit();
  }

  onSubmit() {
    const userVal = this.userId();
    const teamVal = this.teamId();
    const jerseyVal = this.jerseyNumber().trim();
    const wsId = this.workspaceId();

    if (!wsId || !teamVal || (!this.player() && !userVal)) return;

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    const p = this.player();
    if (p) {
      // Edit mode
      const payload = {
        teamId: teamVal,
        jerseyNumber: jerseyVal || null,
        bio: this.bio().trim(),
        position: this.position().trim(),
        achievements: this.achievements(),
      };

      this.playerService.updatePlayer(wsId, p.id, payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.saveSuccess.set('Player details updated successfully!');
          this.save.emit(res);
          setTimeout(() => this.closeModal(), 1000);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.saveError.set(err.error?.message ?? 'Failed to update player.');
        },
      });
    } else {
      // Create mode
      const payload = {
        userId: userVal,
        teamId: teamVal,
        jerseyNumber: jerseyVal || null,
        bio: this.bio().trim(),
        position: this.position().trim(),
        achievements: this.achievements(),
      };

      this.playerService.createPlayer(wsId, payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.saveSuccess.set('Player registered successfully!');
          this.save.emit(res);
          setTimeout(() => this.closeModal(), 1000);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.saveError.set(err.error?.message ?? 'Failed to register player.');
        },
      });
    }
  }
}
