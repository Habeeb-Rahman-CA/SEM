import { DestroyRef, Directive, ElementRef, inject, input, OnInit } from '@angular/core';

/**
 * LazyImgDirective
 *
 * Defers image download until the element scrolls into (or near) the viewport,
 * cutting data usage on long list pages. Uses IntersectionObserver where
 * available; otherwise falls back to native `loading="lazy"` which most
 * modern mobile browsers support.
 *
 *   <img [appLazyImg]="player.user.avatarUrl" alt="..." />
 *
 * When the src is null/empty, the directive stays inert so callers can still
 * fall back to their own placeholder rendering.
 */
@Directive({
  selector: '[appLazyImg]',
  standalone: true,
})
export class LazyImgDirective implements OnInit {
  private el = inject(ElementRef<HTMLImageElement>);
  private destroyRef = inject(DestroyRef);

  appLazyImg = input<string | null | undefined>(null);
  /** Extra pixels around the viewport that still count as "visible". */
  rootMargin = input<string>('200px');

  private observer: IntersectionObserver | null = null;

  ngOnInit() {
    const img = this.el.nativeElement;
    const src = this.appLazyImg();
    if (!src) return;

    // Prefer native lazy loading — free and jank-free.
    if ('loading' in HTMLImageElement.prototype) {
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = src;
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      img.src = src;
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            img.src = src;
            this.observer?.disconnect();
            this.observer = null;
            break;
          }
        }
      },
      { rootMargin: this.rootMargin() },
    );
    this.observer.observe(img);

    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }
}
