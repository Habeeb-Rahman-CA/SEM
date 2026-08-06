import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public marketing landing — signed-in users are auto-forwarded to /workspaces
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/pages/landing').then((m) => m.LandingComponent),
  },

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
    path: 'workspaces/:id/subscription',
    loadComponent: () =>
      import('./features/subscriptions/pages/subscription-settings/subscription-settings').then(
        (m) => m.SubscriptionSettingsComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'workspaces/:id/billing',
    loadComponent: () =>
      import('./features/billing/pages/billing-centre/billing-centre').then(
        (m) => m.BillingCentreComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'workspaces/:id/sponsors',
    loadComponent: () =>
      import('./features/sponsors/pages/sponsor-list/sponsor-list').then(
        (m) => m.SponsorListComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'workspaces/:id/certificates',
    loadComponent: () =>
      import('./features/certificates/pages/certificate-generator/certificate-generator').then(
        (m) => m.CertificateGeneratorComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'workspaces/:id/activity',
    loadComponent: () =>
      import('./features/activity-timeline/pages/activity-timeline/activity-timeline').then(
        (m) => m.ActivityTimelineComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'workspaces/:id/trash',
    loadComponent: () =>
      import('./features/trash/pages/recycle-bin/recycle-bin').then((m) => m.RecycleBinComponent),
    canActivate: [authGuard],
  },
  {
    path: 'workspaces/:id/drafts',
    loadComponent: () =>
      import('./features/drafts/pages/drafts-manager/drafts-manager').then(
        (m) => m.DraftsManagerComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'workspaces/:id/saved-filters',
    loadComponent: () =>
      import('./features/saved-filters/pages/saved-filters-manager/saved-filters-manager').then(
        (m) => m.SavedFiltersManagerComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'workspaces/:id/ads',
    loadComponent: () =>
      import('./features/ads/pages/ad-list/ad-list').then((m) => m.AdListComponent),
    canActivate: [authGuard],
  },
  {
    path: 'workspaces/:id/branding',
    loadComponent: () =>
      import('./features/branding/pages/branding-settings/branding-settings').then(
        (m) => m.BrandingSettingsComponent,
      ),
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
    path: 'system-settings/cache',
    loadComponent: () =>
      import('./features/cache-manager/pages/cache-manager').then((m) => m.CacheManagerComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/pages/profile').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },

  // Public events portal — list & browse without logging in
  {
    path: 'events',
    loadComponent: () =>
      import('./features/public-event/pages/portal/public-events-portal').then(
        (m) => m.PublicEventsPortalComponent,
      ),
  },
  // Live score hub — real-time scores across all public events
  {
    path: 'live',
    loadComponent: () =>
      import('./features/public-event/pages/live/live-score-hub').then(
        (m) => m.LiveScoreHubComponent,
      ),
  },
  // Pricing / plans catalog (public)
  {
    path: 'pricing',
    loadComponent: () =>
      import('./features/subscriptions/pages/pricing/pricing').then((m) => m.PricingComponent),
  },
  // Hall of Fame — permanent all-time records across every season
  {
    path: 'hall-of-fame',
    loadComponent: () =>
      import('./features/public-event/pages/hall-of-fame/hall-of-fame').then(
        (m) => m.HallOfFameComponent,
      ),
  },
  {
    path: 'public/events/:id',
    loadComponent: () =>
      import('./features/public-event/pages/public-event').then((m) => m.PublicEventComponent),
  },
  // Public player profile
  {
    path: 'public/players/:id',
    loadComponent: () =>
      import('./features/public-event/pages/player/public-player-profile').then(
        (m) => m.PublicPlayerProfileComponent,
      ),
  },
  // Public team profile
  {
    path: 'public/teams/:id',
    loadComponent: () =>
      import('./features/public-event/pages/team/public-team-profile').then(
        (m) => m.PublicTeamProfileComponent,
      ),
  },
  // Public match highlights page
  {
    path: 'public/matches/:id',
    loadComponent: () =>
      import('./features/public-event/pages/match/public-match').then(
        (m) => m.PublicMatchComponent,
      ),
  },

  // Public spectator portal for a live stream session
  {
    path: 'public/streaming/:id',
    loadComponent: () =>
      import('./features/streaming/pages/public-spectator').then((m) => m.PublicSpectatorComponent),
  },

  // Public QR Certificate Verification Portal
  {
    path: 'public/certificates/verify/:code',
    loadComponent: () =>
      import('./features/public-event/pages/certificate-verify/certificate-verify').then(
        (m) => m.CertificateVerifyComponent,
      ),
  },

  // Dedicated 404 (also the catch-all target — no silent redirect, so
  // broken links surface in analytics instead of blending into landing traffic)
  {
    path: '404',
    loadComponent: () =>
      import('./features/not-found/pages/not-found').then((m) => m.NotFoundComponent),
  },
  { path: '**', redirectTo: '/404' },
];
