import { Component, inject, effect, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgClass } from '@angular/common';
import { UiService } from './core/services/ui.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgClass],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  uiService = inject(UiService);
  private previouslyFocusedElement: HTMLElement | null = null;

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
