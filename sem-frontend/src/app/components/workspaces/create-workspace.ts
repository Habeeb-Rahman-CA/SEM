import { Component, signal, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../../services/workspace.service';

@Component({
  selector: 'app-create-workspace',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './create-workspace.html',
  styleUrl: './create-workspace.css',
})
export class CreateWorkspaceComponent {
  private workspaceService = inject(WorkspaceService);
  private router = inject(Router);

  name = signal('');
  description = signal('');
  isLoading = signal(false);
  error = signal('');

  // Auto-generate slug from name
  slugPreview = computed(() =>
    this.name()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60) || 'your-workspace'
  );

  onSubmit() {
    const name = this.name().trim();
    if (!name) {
      this.error.set('Workspace name is required.');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    this.workspaceService.create({ name, description: this.description().trim() || undefined }).subscribe({
      next: (ws) => {
        this.isLoading.set(false);
        this.router.navigate(['/workspaces', ws.id]);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error(err);
        if (err.status === 409) {
          this.error.set('A workspace with that name/slug already exists.');
        } else if (err.error?.message) {
          this.error.set(Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message);
        } else {
          this.error.set('Failed to create workspace. Please try again.');
        }
      },
    });
  }
}
