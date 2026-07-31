import { DestroyRef, Directive, ElementRef, inject, input, OnInit, output } from '@angular/core';

/**
 * DebounceDirective
 *
 * Attach to any `<input>` or `<textarea>` to emit a debounced value after
 * the user stops typing. The typical use case is search: instead of
 * firing a request for every keystroke, wait until the user pauses.
 *
 *   <input
 *     appDebounce
 *     [delay]="300"
 *     (debouncedValue)="onSearch($event)"
 *   />
 *
 * Emits at most once per debounce window and cancels pending emissions
 * on destroy. Uses plain DOM events + setTimeout — no RxJS dep needed.
 * Trailing-edge only (no immediate emission).
 */
@Directive({
  selector: 'input[appDebounce], textarea[appDebounce]',
  standalone: true,
})
export class DebounceDirective implements OnInit {
  private el = inject(ElementRef<HTMLInputElement | HTMLTextAreaElement>);
  private destroyRef = inject(DestroyRef);

  /** Debounce interval in milliseconds (default 300 ms). */
  delay = input<number>(300);
  /** Optional min length before emission. Below this, emits empty string. */
  minLength = input<number>(0);

  debouncedValue = output<string>();

  private timer: any = null;

  ngOnInit(): void {
    const listener = (e: Event) => {
      const value = (e.target as HTMLInputElement | HTMLTextAreaElement).value;
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        const min = this.minLength();
        if (value.length < min) {
          this.debouncedValue.emit('');
        } else {
          this.debouncedValue.emit(value);
        }
        this.timer = null;
      }, this.delay());
    };
    this.el.nativeElement.addEventListener('input', listener);
    this.destroyRef.onDestroy(() => {
      this.el.nativeElement.removeEventListener('input', listener);
      if (this.timer) clearTimeout(this.timer);
    });
  }
}
