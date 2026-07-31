import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdPlacement, AdService, ServedAd } from '../../services/ad.service';

/**
 * Public ad banner slot. Fetches a creative for the given placement + event
 * scope, records an impression when it first becomes visible on-screen
 * (IntersectionObserver so scrolled-past-but-never-seen ads don't inflate
 * counters), and records a click via sendBeacon before allowing the
 * browser to navigate to the target URL.
 *
 * Renders nothing when there's no eligible ad — safe to drop anywhere on
 * a public page.
 */
@Component({
  selector: 'app-ad-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ad(); as a) {
      <a
        #anchor
        [href]="a.targetUrl"
        target="_blank"
        rel="noopener noreferrer sponsored"
        (click)="onClick(a)"
        [class]="
          'group block rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 hover:border-violet-500/30 transition relative ' +
          (variant() === 'compact' ? 'h-14 sm:h-16' : 'aspect-[6/1] sm:aspect-[8/1]')
        "
        [attr.aria-label]="a.title || 'Advertisement'"
      >
        <img
          [src]="a.imageUrl"
          [alt]="a.title || 'Advertisement'"
          class="w-full h-full object-cover group-hover:scale-[1.01] transition"
          loading="lazy"
        />
        <div
          class="absolute top-1 right-1 text-[8px] font-bold uppercase tracking-widest bg-slate-950/70 text-slate-400 border border-white/10 rounded px-1.5 py-0.5 pointer-events-none backdrop-blur"
        >
          @if (a.sponsorName) {
            Sponsored · {{ a.sponsorName }}
          } @else {
            Ad
          }
        </div>
      </a>
    }
  `,
})
export class AdBannerComponent implements OnInit {
  private adService = inject(AdService);
  private destroyRef = inject(DestroyRef);

  placement = input.required<AdPlacement>();
  eventId = input<string | null>(null);
  variant = input<'compact' | 'wide'>('wide');

  @ViewChild('anchor', { static: false }) anchor?: ElementRef<HTMLElement>;

  ad = signal<ServedAd | null>(null);
  private impressionRecorded = false;
  private observer?: IntersectionObserver;

  ngOnInit() {
    this.adService.serve(this.placement(), this.eventId() ?? undefined).subscribe({
      next: (a) => {
        this.ad.set(a);
        // Defer to next tick so the @if block has time to mount the anchor.
        queueMicrotask(() => this.setupImpressionObserver());
      },
      error: () => this.ad.set(null),
    });

    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }

  onClick(ad: ServedAd) {
    // Fire before the navigation — sendBeacon inside AdService is
    // navigation-safe so we don't need to preventDefault.
    this.adService.recordClick(ad.id);
  }

  private setupImpressionObserver() {
    if (this.impressionRecorded) return;
    const el = this.anchor?.nativeElement;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // Fallback: record immediately when the browser can't observe.
      this.fireImpression();
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            this.fireImpression();
            this.observer?.disconnect();
            return;
          }
        }
      },
      { threshold: [0.5] },
    );
    this.observer.observe(el);
  }

  private fireImpression() {
    if (this.impressionRecorded) return;
    const a = this.ad();
    if (!a) return;
    this.impressionRecorded = true;
    this.adService.recordImpression(a.id);
  }
}
