import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SkeletonVariant =
  'text' | 'title' | 'avatar' | 'thumb' | 'card' | 'stat' | 'row' | 'button';

/**
 * Reusable skeleton loader. Prefer this over spinners: the pulsing shape
 * matches the eventual content, so perceived load time feels shorter and
 * layout doesn't shift when the real content arrives.
 *
 *   <app-skeleton />                                <!-- default one-line text -->
 *   <app-skeleton variant="title" width="60%" />
 *   <app-skeleton variant="avatar" />
 *   <app-skeleton variant="card" [rows]="4" />
 *   <app-skeleton variant="row" [rows]="10" />       <!-- table body skeleton -->
 *
 * OnPush + zero DOM listeners = extremely cheap to render dozens at a
 * time (which is exactly what you want during a list load).
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (variant()) {
      @case ('avatar') {
        <span
          class="inline-block bg-slate-800/60 animate-pulse rounded-full"
          [style.width]="size()"
          [style.height]="size()"
        ></span>
      }
      @case ('thumb') {
        <span
          class="inline-block bg-slate-800/60 animate-pulse rounded-lg"
          [style.width]="width() || '3rem'"
          [style.height]="width() || '3rem'"
        ></span>
      }
      @case ('title') {
        <span
          class="block bg-slate-800/60 animate-pulse rounded"
          [style.height]="'1.25rem'"
          [style.width]="width() || '40%'"
        ></span>
      }
      @case ('stat') {
        <div class="p-4 rounded-xl bg-slate-900/40 border border-white/5">
          <span class="block bg-slate-800/60 animate-pulse rounded h-3 w-1/3 mb-2"></span>
          <span class="block bg-slate-800/60 animate-pulse rounded h-6 w-2/3"></span>
        </div>
      }
      @case ('card') {
        <div class="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-2">
          @for (r of range(rows() || 3); track r) {
            <span
              class="block bg-slate-800/60 animate-pulse rounded h-3"
              [style.width]="r === 0 ? '70%' : '100%'"
            ></span>
          }
        </div>
      }
      @case ('row') {
        <div class="space-y-2">
          @for (r of range(rows() || 5); track r) {
            <span
              class="block bg-slate-800/60 animate-pulse rounded"
              [style.height]="'1rem'"
              [style.width]="'100%'"
            ></span>
          }
        </div>
      }
      @case ('button') {
        <span
          class="inline-block bg-slate-800/60 animate-pulse rounded-lg"
          [style.width]="width() || '6rem'"
          [style.height]="'2.25rem'"
        ></span>
      }
      @default {
        <!-- text -->
        <span
          class="block bg-slate-800/60 animate-pulse rounded"
          [style.height]="'0.875rem'"
          [style.width]="width() || '100%'"
        ></span>
      }
    }
  `,
})
export class SkeletonComponent {
  variant = input<SkeletonVariant>('text');
  width = input<string | null>(null);
  /** Only used by 'card' / 'row' variants. */
  rows = input<number>(3);
  /** Avatar diameter. */
  size = input<string>('2.5rem');

  // Zero-alloc range for template @for
  private rangeCache = new Map<number, number[]>();
  range = (n: number): number[] => {
    let arr = this.rangeCache.get(n);
    if (!arr) {
      arr = Array.from({ length: n }, (_, i) => i);
      this.rangeCache.set(n, arr);
    }
    return arr;
  };
}
