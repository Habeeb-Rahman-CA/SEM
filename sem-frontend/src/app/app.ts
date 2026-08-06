import { Component, inject, effect, HostListener, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgClass } from '@angular/common';
import { UiService } from './core/services/ui.service';
import { BrandingService } from './features/branding/services/branding.service';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgClass, CommandPaletteComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  uiService = inject(UiService);
  private brandingService = inject(BrandingService);
  private previouslyFocusedElement: HTMLElement | null = null;

  ngOnInit() {
    // Resolve workspace branding for this window (custom domain / ?workspace=)
    // and apply the CSS custom properties + favicon + title. Silent failure —
    // the SPA falls back to the default Taisen look when no verified branding
    // is available.
    this.brandingService.resolveForCurrentWindow().subscribe({
      error: () => undefined,
    });
  }

  constructor() {
    effect(() => {
      const open = this.uiService.confirmModalOpen();
      if (open) {
        if (document.activeElement instanceof HTMLElement) {
          this.previouslyFocusedElement = document.activeElement;
        }
        setTimeout(() => {
          const container = document.querySelector('[role="alertdialog"]');
          if (container) {
            const firstButton = container.querySelector('button') as HTMLElement;
            if (firstButton) {
              firstButton.focus();
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
    if (!this.uiService.confirmModalOpen()) return;

    if (event.key === 'Escape') {
      this.uiService.handleConfirm(false);
      event.preventDefault();
      return;
    }

    if (event.key === 'Tab') {
      const container = document.querySelector('[role="alertdialog"]');
      if (!container) return;

      const focusables = container.querySelectorAll('button');
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
}
