import { Component, input, output, signal, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TeamService } from '../services/team.service';
import { Team } from '../../workspaces/services/workspace.service';
import { UiService } from '../../../core/services/ui.service';
import { PhotoCaptureComponent } from '../../../shared/components/photo-capture/photo-capture';
import { HelpTooltipComponent } from '../../../shared/components/help-tooltip/help-tooltip';

@Component({
  selector: 'app-team-modal',
  standalone: true,
  imports: [FormsModule, PhotoCaptureComponent, HelpTooltipComponent],
  templateUrl: './team-modal.html',
})
export class TeamModalComponent {
  isOpen = input<boolean>(false);
  team = input<Team | null>(null);
  workspaceId = input<string>('');

  close = output<void>();
  save = output<Team>();

  private teamService = inject(TeamService);
  private uiService = inject(UiService);

  name = signal('');
  code = signal('');
  description = signal('');
  logoUrl = signal('');
  primaryColor = signal('#7c3aed');
  secondaryColor = signal('#4f46e5');
  coaches = signal<
    Array<{
      id: string;
      name: string;
      role?: string | null;
      avatarUrl?: string | null;
      bio?: string | null;
    }>
  >([]);
  achievements = signal<
    Array<{
      id: string;
      title: string;
      year?: number | null;
      competitionName?: string | null;
      description?: string | null;
    }>
  >([]);

  newCoachName = signal('');
  newCoachRole = signal('');
  newCoachAvatar = signal('');
  newAchTitle = signal('');
  newAchYear = signal('');
  newAchComp = signal('');

  activeTab = signal<'basic' | 'coaches' | 'achievements'>('basic');

  isSaving = signal(false);
  saveSuccess = signal('');
  saveError = signal('');

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        const t = this.team();
        this.activeTab.set('basic');
        if (t) {
          this.name.set(t.name);
          this.code.set(t.code ?? '');
          this.description.set(t.description ?? '');
          this.logoUrl.set(t.logoUrl ?? '');
          this.primaryColor.set(t.primaryColor ?? '#7c3aed');
          this.secondaryColor.set(t.secondaryColor ?? '#4f46e5');
          this.coaches.set(t.coaches ?? []);
          this.achievements.set(t.achievements ?? []);
        } else {
          this.name.set('');
          this.code.set('');
          this.description.set('');
          this.logoUrl.set('');
          this.primaryColor.set('#7c3aed');
          this.secondaryColor.set('#4f46e5');
          this.coaches.set([]);
          this.achievements.set([]);
        }
        this.newCoachName.set('');
        this.newCoachRole.set('');
        this.newCoachAvatar.set('');
        this.newAchTitle.set('');
        this.newAchYear.set('');
        this.newAchComp.set('');
        this.saveSuccess.set('');
        this.saveError.set('');
      }
    });
  }

  addCoach() {
    const name = this.newCoachName().trim();
    if (!name) return;
    this.coaches.update((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        role: this.newCoachRole().trim() || null,
        avatarUrl: this.newCoachAvatar().trim() || null,
      },
    ]);
    this.newCoachName.set('');
    this.newCoachRole.set('');
    this.newCoachAvatar.set('');
  }

  removeCoach(id: string) {
    this.coaches.update((prev) => prev.filter((c) => c.id !== id));
  }

  addAchievement() {
    const title = this.newAchTitle().trim();
    if (!title) return;
    const yearRaw = this.newAchYear().trim();
    const year = yearRaw ? Number(yearRaw) : null;
    this.achievements.update((prev) => [
      {
        id: crypto.randomUUID(),
        title,
        year: Number.isFinite(year as number) ? year : null,
        competitionName: this.newAchComp().trim() || null,
      },
      ...prev,
    ]);
    this.newAchTitle.set('');
    this.newAchYear.set('');
    this.newAchComp.set('');
  }

  removeAchievement(id: string) {
    this.achievements.update((prev) => prev.filter((a) => a.id !== id));
  }

  closeModal() {
    this.close.emit();
  }

  onTeamLogoUploaded(url: string) {
    this.logoUrl.set(url);
    this.uiService.success('Team logo uploaded successfully.');
  }

  onSubmit() {
    const nameVal = this.name().trim();
    const codeVal = this.code().trim().toUpperCase();
    const descVal = this.description().trim();
    const logoVal = this.logoUrl().trim();
    const primaryColorVal = this.primaryColor().trim();
    const secondaryColorVal = this.secondaryColor().trim();
    const wsId = this.workspaceId();

    if (!wsId || !nameVal || !codeVal) return;

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    const payload = {
      name: nameVal,
      code: codeVal,
      description: descVal || null,
      logoUrl: logoVal || null,
      primaryColor: primaryColorVal || null,
      secondaryColor: secondaryColorVal || null,
      coaches: this.coaches(),
      achievements: this.achievements(),
    };

    const t = this.team();
    const obs = t
      ? this.teamService.updateTeam(wsId, t.id, payload)
      : this.teamService.createTeam(wsId, payload);

    obs.subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.saveSuccess.set(t ? 'Team updated successfully!' : 'Team registered successfully!');
        this.save.emit(res);
        setTimeout(() => this.closeModal(), 1000);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveError.set(err.error?.message ?? 'Failed to save team.');
      },
    });
  }
}
