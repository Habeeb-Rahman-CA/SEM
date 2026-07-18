import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Auth routes (redirect to /workspaces if already logged in)
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then(m => m.LoginComponent),
    canActivate: [noAuthGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register').then(m => m.RegisterComponent),
    canActivate: [noAuthGuard],
  },

  // Legacy dashboard
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },

  // Workspace routes
  {
    path: 'workspaces',
    loadComponent: () => import('./components/workspaces/workspaces').then(m => m.WorkspacesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'workspaces/join',
    loadComponent: () => import('./components/workspaces/join-workspace').then(m => m.JoinWorkspaceComponent),
  },
  {
    path: 'workspaces/:id',
    loadComponent: () => import('./components/workspaces/workspace-detail').then(m => m.WorkspaceDetailComponent),
    canActivate: [authGuard],
  },
  {
    path: 'system-settings',
    loadComponent: () => import('./components/system-settings/system-settings').then(m => m.SystemSettingsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/profile/profile').then(m => m.ProfileComponent),
    canActivate: [authGuard],
  },

  // Default redirect
  { path: '', redirectTo: '/workspaces', pathMatch: 'full' },
  { path: '**', redirectTo: '/workspaces' },
];

