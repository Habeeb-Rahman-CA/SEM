import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  OnChanges,
  OnInit,
  Renderer2,
  SimpleChanges,
} from '@angular/core';

/**
 * LazyImgDirective
 *
 * Defers image download until the element scrolls into (or near) the viewport,
 * cutting data usage on long list pages. Uses IntersectionObserver where
 * available; otherwise falls back to native `loading="lazy"`.
 *
 * Modern-format upgrade
 * ─────────────────────
 * If the caller opts in with `formatUpgrade="true"`, the directive rewrites
 * `.jpg`/`.jpeg`/`.png` URLs into an `srcset` value with AVIF first, then
 * WebP, falling back to the original. Assumes the CDN publishes parallel
 * variants at the same path (e.g. `photo.jpg`, `photo.webp`, `photo.avif`).
 *
 *   <img [appLazyImg]="url" formatUpgrade alt="…" />
 *
 * When the src is null/empty, the directive stays inert so callers can still
 * fall back to their own placeholder rendering.
 */
@Directive({
  selector: '[appLazyImg]',
  standalone: true,
})
export class LazyImgDirective implements OnInit, OnChanges {
  private el = inject(ElementRef<HTMLImageElement>);
  private renderer = inject(Renderer2);
  private destroyRef = inject(DestroyRef);

  appLazyImg = input<string | null | undefined>(null);
  /** Extra pixels around the viewport that still count as "visible". */
  rootMargin = input<string>('200px');
  /** Enable AVIF/WebP srcset upgrade when the URL ends in .jpg/.jpeg/.png */
  formatUpgrade = input<boolean>(false);
  /** Optional low-res placeholder shown until the real image loads. */
  placeholderSrc = input<string | null>(null);

  private observer: IntersectionObserver | null = null;
  private currentSrc: string | null = null;

  ngOnInit(): void {
    this.applyPlaceholder();
    this.tryLoad();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appLazyImg'] && !changes['appLazyImg'].firstChange) {
      // Src changed after init — retry
      this.observer?.disconnect();
      this.observer = null;
      this.tryLoad();
    }
  }

  private applyPlaceholder(): void {
    const ph = this.placeholderSrc();
    if (ph) {
      this.renderer.setAttribute(this.el.nativeElement, 'src', ph);
    }
  }

  private tryLoad(): void {
    const img = this.el.nativeElement;
    const src = this.appLazyImg();
    if (!src) return;
    if (src === this.currentSrc) return;
    this.currentSrc = src;

    // Prefer native lazy loading — free and jank-free.
    if ('loading' in HTMLImageElement.prototype) {
      img.loading = 'lazy';
      img.decoding = 'async';
      this.setSources(img, src);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this.setSources(img, src);
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.setSources(img, src);
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

  private setSources(img: HTMLImageElement, src: string): void {
    if (!this.formatUpgrade()) {
      img.src = src;
      return;
    }
    const upgrade = this.buildUpgradedSrcset(src);
    if (upgrade) {
      // srcset lets the browser pick the best variant it supports; the
      // last URL is always the original so nothing breaks if AVIF/WebP
      // aren't published for this asset.
      img.srcset = upgrade;
      img.src = src;
      return;
    }
    img.src = src;
  }

  private buildUpgradedSrcset(src: string): string | null {
    const m = src.match(/^(.*)\.(jpe?g|png)(\?.*)?$/i);
    if (!m) return null;
    const [, base, , query] = m;
    const q = query ?? '';
    return `${base}.avif${q}, ${base}.webp${q}, ${src}`;
  }
}
