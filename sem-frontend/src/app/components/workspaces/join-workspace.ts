import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkspaceService } from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-join-workspace',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
      <div class="max-w-md w-full bg-slate-900 border border-white/5 rounded-2xl p-8 text-center shadow-2xl">
        <div class="flex justify-center mb-6">
          <div class="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <i class="fi fi-rr-users text-3xl"></i>
          </div>
        </div>

        @if (isLoading()) {
          <h2 class="text-xl font-bold mb-2">Joining Workspace...</h2>
          <p class="text-slate-400 text-xs mb-6">Please wait while we add you to the workspace members.</p>
          <div class="flex justify-center">
            <svg class="animate-spin h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        } @else if (error()) {
          <h2 class="text-xl font-bold text-rose-400 mb-2">Failed to Join</h2>
          <p class="text-slate-400 text-xs mb-8">{{ error() }}</p>
          <a routerLink="/workspaces" 
            class="inline-block w-full py-3 bg-slate-800 hover:bg-slate-700 text-white hover:text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer">
            Go to Workspaces
          </a>
        }
      </div>
    </div>
  `
})
export class JoinWorkspaceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workspaceService = inject(WorkspaceService);
  private authService = inject(AuthService);

  isLoading = signal(true);
  error = signal('');

  ngOnInit() {
    const workspaceId = this.route.snapshot.queryParamMap.get('id');

    if (!workspaceId) {
      this.error.set('No workspace ID provided in the invite link.');
      this.isLoading.set(false);
      return;
    }

    if (!this.authService.isAuthenticated()) {
      // User is not logged in, redirect to login page with returnUrl
      const currentUrl = `/workspaces/join?id=${workspaceId}`;
      this.router.navigate(['/login'], { queryParams: { returnUrl: currentUrl } });
      return;
    }

    // Call backend to join workspace
    this.workspaceService.joinWorkspace(workspaceId).subscribe({
      next: () => {
        this.isLoading.set(false);
        // On success, redirect directly into the workspace details
        this.router.navigate(['/workspaces', workspaceId]);
      },
      error: (err) => {
        console.error(err);
        this.error.set(err.error?.message || 'Could not join the workspace. The link might be invalid or you do not have permission.');
        this.isLoading.set(false);
      }
    });
  }
}
