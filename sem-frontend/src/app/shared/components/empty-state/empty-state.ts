import { Component, input } from '@angular/core';

/**
 * EmptyStateComponent — zero-data placeholder.
 *
 * Usage:
 *   <app-empty-state
 *     iconClass="fi-rr-user"
 *     title="No players yet"
 *     message="Add your first player to get started." />
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div
      class="flex flex-col items-center justify-center py-16 text-center bg-slate-900/40 border border-white/10 rounded-2xl"
    >
      @if (iconClass()) {
        <div
          class="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center mb-4"
        >
          <i [class]="'fi ' + iconClass() + ' text-slate-600 text-2xl'"></i>
        </div>
      }
      <h3 class="text-sm font-bold text-white mb-1">
        {{ title() || 'No items created yet' }}
      </h3>
      <p class="text-xs text-slate-400 max-w-xs mx-auto">
        {{ message() || 'Create your first record to get started.' }}
      </p>
      <!-- Optional action slot -->
      @if (true) {
        <div class="mt-5">
          <ng-content />
        </div>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  iconClass = input<string | null>(null);
  title = input<string | null>(null);
  message = input<string | null>(null);
}
