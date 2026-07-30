import {
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CapacitorService } from '../../core/services/capacitor.service';

/**
 * PullToRefreshDirective
 *
 * Attach to any scroll container to enable the standard mobile pull-down-to-
 * refresh gesture. Emits `refresh` once the user drags past `threshold` and
 * releases. A single visual chevron/spinner sits above the content and
 * animates as the user pulls.
 *
 * Only activates when the parent element is scrolled to the top and the
 * viewport is below `md` (mobile-only by default) — desktop users have other
 * refresh affordances.
 *
 *   <div appPullToRefresh (refresh)="reload()">... list ...</div>
 */
@Directive({
  selector: '[appPullToRefresh]',
  standalone: true,
  exportAs: 'pullToRefresh',
})
export class PullToRefreshDirective {
  private el = inject(ElementRef<HTMLElement>);
  private capacitor = inject(CapacitorService);
  private destroyRef = inject(DestroyRef);

  /** Pixels of pull required to trigger a refresh. */
  threshold = input<number>(72);
  /** Max viewport width (px) at which the gesture is active. */
  mobileMaxWidth = input<number>(1024);
  /** External signal you can flip to lock the gesture (e.g. while loading). */
  disabled = input<boolean>(false);

  refresh = output<void>();

  private startY = 0;
  private currentY = 0;
  private pulling = false;
  isRefreshing = signal(false);
  pullOffset = signal(0);

  private indicator!: HTMLDivElement;

  constructor() {
    // Overlay indicator, absolutely positioned above the container's content.
    const host = this.el.nativeElement;
    host.style.position = host.style.position || 'relative';

    this.indicator = document.createElement('div');
    this.indicator.setAttribute('aria-hidden', 'true');
    this.indicator.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      'right:0',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'pointer-events:none',
      'height:0',
      'overflow:hidden',
      'transition:height 180ms ease',
      'color:#a78bfa',
      'font-size:12px',
      'font-weight:700',
      'z-index:5',
    ].join(';');
    this.indicator.innerHTML =
      '<i class="fi fi-rr-arrow-down" style="transition:transform 180ms ease"></i>';
    host.appendChild(this.indicator);

    this.destroyRef.onDestroy(() => this.indicator.remove());
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= this.mobileMaxWidth();
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent) {
    if (this.disabled() || this.isRefreshing() || !this.isMobile()) return;
    if (this.el.nativeElement.scrollTop > 0) return;
    this.startY = e.touches[0].clientY;
    this.pulling = true;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent) {
    if (!this.pulling) return;
    this.currentY = e.touches[0].clientY;
    const delta = this.currentY - this.startY;
    if (delta <= 0) {
      this.setOffset(0);
      return;
    }
    // Dampen the pull so it feels rubber-band-ish.
    const damped = Math.min(delta * 0.5, this.threshold() * 1.5);
    this.setOffset(damped);
    // Prevent the browser's built-in overscroll while we drive our own.
    if (e.cancelable) e.preventDefault();
  }

  @HostListener('touchend')
  @HostListener('touchcancel')
  onTouchEnd() {
    if (!this.pulling) return;
    this.pulling = false;
    if (this.pullOffset() >= this.threshold()) {
      this.setOffset(this.threshold());
      this.isRefreshing.set(true);
      void this.capacitor.haptic('medium');
      this.refresh.emit();
    } else {
      this.setOffset(0);
    }
  }

  /** Parent calls this once its async refresh work is done. */
  complete() {
    this.isRefreshing.set(false);
    this.setOffset(0);
  }

  private setOffset(px: number) {
    this.pullOffset.set(px);
    this.indicator.style.height = `${px}px`;
    const icon = this.indicator.firstElementChild as HTMLElement | null;
    if (icon) {
      const passed = px >= this.threshold();
      icon.style.transform = passed ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }
}
