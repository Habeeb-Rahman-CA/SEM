import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { DashboardComponent } from './components/dashboard/dashboard';
import { WorkspacesComponent } from './components/workspaces/workspaces';
import { CreateWorkspaceComponent } from './components/workspaces/create-workspace';
import { WorkspaceDetailComponent } from './components/workspaces/workspace-detail';
import { authGuard, noAuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Auth routes (redirect to /workspaces if already logged in)
  { path: 'login', component: LoginComponent, canActivate: [noAuthGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [noAuthGuard] },

  // Legacy dashboard (kept for now)
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

  // Workspace routes
  { path: 'workspaces', component: WorkspacesComponent, canActivate: [authGuard] },
  { path: 'workspaces/new', component: CreateWorkspaceComponent, canActivate: [authGuard] },
  { path: 'workspaces/:id', component: WorkspaceDetailComponent, canActivate: [authGuard] },

  // Default redirect
  { path: '', redirectTo: '/workspaces', pathMatch: 'full' },
  { path: '**', redirectTo: '/workspaces' },
];
