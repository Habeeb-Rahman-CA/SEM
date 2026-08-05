import { Component, input, output, effect, ElementRef, HostListener, inject } from '@angular/core';

/**
 * ModalComponent
 *
 * Usage:
 *   <app-modal [open]="isOpen()" title="My Modal" (closed)="isOpen.set(false)">
 *     <p>Content goes here</p>
 *     <ng-container slot="footer">
 *       <app-button label="Cancel" variant="secondary" (clicked)="isOpen.set(false)" />
 *       <app-button label="Save" (clicked)="onSave()" />
 *     </ng-container>
 *   </app-modal>
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [],
  template: `
    @if (open()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
        (click)="onBackdropClick($event)"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="title() ? titleId : null"
        [attr.aria-describedby]="subtitle() ? descId : null"
      >
        <!-- Panel -->
        <div
          class="bg-slate-900 text-slate-100 border border-white/10 rounded-2xl w-full flex flex-col shadow-2xl relative overflow-hidden"
          [class]="panelSizeClass()"
          (click)="$event.stopPropagation()"
        >
          <!-- Accent gradient top line -->
          <div
            class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500"
          ></div>

          <!-- Header -->
          <div
            class="px-6 pt-7 pb-5 border-b border-white/5 flex items-start justify-between gap-4 shrink-0"
          >
            <div class="min-w-0">
              @if (title()) {
                <h3 [id]="titleId" class="text-base font-bold text-white flex items-center gap-2.5">
                  @if (iconClass()) {
                    <i [class]="'fi ' + iconClass() + ' text-violet-400 text-lg'"></i>
                  }
                  <span class="truncate">{{ title() }}</span>
                </h3>
              }
              @if (subtitle()) {
                <p [id]="descId" class="text-xs text-slate-400 mt-1">{{ subtitle() }}</p>
              }
            </div>
            <!-- Close button -->
            <button
              class="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer border-0 bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
              (click)="closed.emit()"
              aria-label="Close modal"
            >
              <i class="fi fi-rr-cross text-xs"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-5 overflow-y-auto flex-1 flex flex-col gap-4">
            <ng-content />
          </div>

          <!-- Footer (projected slot) -->
          <div
            class="px-6 pb-5 pt-4 border-t border-white/5 flex items-center justify-end gap-3 shrink-0 flex-wrap"
          >
            <ng-content select="[slot=footer]" />
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  open = input<boolean>(false);
  title = input<string | null>(null);
  subtitle = input<string | null>(null);
  iconClass = input<string | null>(null);
  /** 'sm' | 'md' | 'lg' | 'xl' | 'full' */
  size = input<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md');
  /** Whether clicking the backdrop closes the modal */
  closeOnBackdrop = input<boolean>(true);

  closed = output<void>();

  private elRef = inject(ElementRef);
  private previouslyFocusedElement: HTMLElement | null = null;
  protected readonly titleId = `modal-title-${Math.random().toString(36).substring(2, 9)}`;
  protected readonly descId = `modal-desc-${Math.random().toString(36).substring(2, 9)}`;

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (isOpen) {
        if (document.activeElement instanceof HTMLElement) {
          this.previouslyFocusedElement = document.activeElement;
        }
        setTimeout(() => {
          const el = this.elRef.nativeElement;
          const focusables = el.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusables.length > 0) {
            // Focus the first non-button (like input/textarea) if available, otherwise focus first element
            const firstInput = Array.from(focusables).find(
              (f: any) =>
                f.tagName === 'INPUT' || f.tagName === 'TEXTAREA' || f.tagName === 'SELECT',
            ) as HTMLElement;
            if (firstInput) {
              firstInput.focus();
            } else {
              (focusables[0] as HTMLElement).focus();
            }
          }
        }, 50);
      } else {
        if (this.previouslyFocusedElement) {
          this.previouslyFocusedElement.focus();
          this.previouslyFocusedElement = null;
        }
      }
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (!this.open()) return;

    if (event.key === 'Escape') {
      if (this.closeOnBackdrop()) {
        this.closed.emit();
      }
      event.preventDefault();
      return;
    }

    if (event.key === 'Tab') {
      const el = this.elRef.nativeElement;
      const focusables = el.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;

      const first = focusables[0] as HTMLElement;
      const last = focusables[focusables.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          event.preventDefault();
        }
      }
    }
  }

  protected panelSizeClass() {
    const map: Record<string, string> = {
      sm: 'max-w-md max-h-[90vh]',
      md: 'max-w-lg max-h-[90vh]',
      lg: 'max-w-2xl max-h-[90vh]',
      xl: 'max-w-4xl max-h-[92vh]',
      full: 'max-w-[95vw] max-h-[95vh]',
    };
    return map[this.size()] ?? map['md'];
  }

  protected onBackdropClick(e: MouseEvent) {
    if (this.closeOnBackdrop()) this.closed.emit();
  }
}
