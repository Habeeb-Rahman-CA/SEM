import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

/**
 * DeferVisibleDirective — a structural directive that keeps its
 * template unrendered until the placeholder scrolls into (or near) the
 * viewport, then mounts it once.
 *
 * Complements Angular's built-in `@defer` blocks:
 *   - `@defer (on viewport)` is the modern first choice — use it when
 *     you can.
 *   - This directive is the drop-in equivalent for callers that need
 *     a custom root-margin, want to mount on-scroll inside a scroll
 *     container, or share a single trigger element across features.
 *
 *   <div *appDeferVisible="{ rootMargin: '400px' }">
 *     <app-heavy-widget />
 *   </div>
 *
 * Once rendered, the directive detaches the observer — content stays
 * mounted for the lifetime of the parent view, so scrolling away doesn't
 * flap it in/out.
 */
@Directive({
  selector: '[appDeferVisible]',
  standalone: true,
})
export class DeferVisibleDirective implements OnInit {
  private tpl = inject(TemplateRef);
  private vcr = inject(ViewContainerRef);
  private host = inject(ElementRef, { optional: true });
  private destroyRef = inject(DestroyRef);

  appDeferVisible = input<{ rootMargin?: string } | ''>('');

  private rendered = false;

  ngOnInit(): void {
    // If Intersection Observer isn't available (very old browsers / SSR),
    // just render eagerly — better than blank UI.
    if (typeof IntersectionObserver === 'undefined') {
      this.mount();
      return;
    }

    const anchor = this.host?.nativeElement || this.createAnchor();
    const opts = this.appDeferVisible();
    const rootMargin = typeof opts === 'object' && opts?.rootMargin ? opts.rootMargin : '200px';

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.mount();
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    observer.observe(anchor);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  private mount(): void {
    if (this.rendered) return;
    this.rendered = true;
    this.vcr.createEmbeddedView(this.tpl);
  }

  /**
   * Structural directives don't have a host element by default — they
   * are anchored at a template comment. Create a 0×0 span next to it
   * so the IntersectionObserver has something to watch.
   */
  private createAnchor(): HTMLElement {
    const anchor = document.createElement('span');
    anchor.style.display = 'inline-block';
    anchor.style.width = '0';
    anchor.style.height = '0';
    (this.vcr.element.nativeElement as Comment).parentNode?.insertBefore(
      anchor,
      this.vcr.element.nativeElement,
    );
    return anchor;
  }
}
