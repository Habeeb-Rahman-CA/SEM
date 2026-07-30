import { Component, input, output, signal, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TeamService } from '../services/team.service';
import { Team } from '../../workspaces/services/workspace.service';
import { UiService } from '../../../core/services/ui.service';
import { PhotoCaptureComponent } from '../../../shared/components/photo-capture/photo-capture';

@Component({
  selector: 'app-team-modal',
  standalone: true,
  imports: [FormsModule, PhotoCaptureComponent],
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

  isSaving = signal(false);
  saveSuccess = signal('');
  saveError = signal('');

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        const t = this.team();
        if (t) {
          this.name.set(t.name);
          this.code.set(t.code ?? '');
          this.description.set(t.description ?? '');
          this.logoUrl.set(t.logoUrl ?? '');
          this.primaryColor.set(t.primaryColor ?? '#7c3aed');
          this.secondaryColor.set(t.secondaryColor ?? '#4f46e5');
        } else {
          this.name.set('');
          this.code.set('');
          this.description.set('');
          this.logoUrl.set('');
          this.primaryColor.set('#7c3aed');
          this.secondaryColor.set('#4f46e5');
        }
        this.saveSuccess.set('');
        this.saveError.set('');
      }
    });
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
