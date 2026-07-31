import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center"
    >
      <p class="text-sm font-semibold uppercase tracking-widest text-indigo-600">404</p>
      <h1 class="mt-2 text-4xl font-bold text-slate-900 sm:text-5xl">Page not found</h1>
      <p class="mt-4 max-w-md text-base text-slate-600">
        The page you're looking for doesn't exist or was moved. Check the URL, or head back to the
        dashboard.
      </p>
      <div class="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          routerLink="/"
          class="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          Go home
        </a>
        <a
          routerLink="/workspaces"
          class="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Open my workspaces
        </a>
      </div>
    </main>
  `,
})
export class NotFoundComponent {}
