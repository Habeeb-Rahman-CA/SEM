import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Auth routes (redirect to /workspaces if already logged in)
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.LoginComponent),
    canActivate: [noAuthGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register/register').then((m) => m.RegisterComponent),
    canActivate: [noAuthGuard],
  },

  // Workspace routes
  {
    path: 'workspaces',
    loadComponent: () =>
      import('./features/workspaces/pages/workspaces').then((m) => m.WorkspacesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'workspaces/join',
    loadComponent: () =>
      import('./features/workspaces/pages/join-workspace').then((m) => m.JoinWorkspaceComponent),
  },
  {
    path: 'workspaces/:id',
    loadComponent: () =>
      import('./features/workspaces/pages/workspace-detail').then(
        (m) => m.WorkspaceDetailComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'workspaces/:id/check-in',
    loadComponent: () =>
      import('./features/check-in/pages/check-in').then((m) => m.CheckInComponent),
    canActivate: [authGuard],
  },
  {
    path: 'system-settings',
    loadComponent: () =>
      import('./features/system-settings/pages/system-settings').then(
        (m) => m.SystemSettingsComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/pages/profile').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },

  {
    path: 'public/events/:id',
    loadComponent: () =>
      import('./features/public-event/pages/public-event').then((m) => m.PublicEventComponent),
  },

  // Default redirect
  { path: '', redirectTo: '/workspaces', pathMatch: 'full' },
  { path: '**', redirectTo: '/workspaces' },
];
