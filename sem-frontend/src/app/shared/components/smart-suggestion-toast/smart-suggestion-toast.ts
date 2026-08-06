import { Component, inject, ElementRef, viewChildren, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import {
  SmartSuggestionsService,
  SmartSuggestion,
} from '../../../core/services/smart-suggestions.service';

@Component({
  selector: 'app-smart-suggestion-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './smart-suggestion-toast.html',
})
export class SmartSuggestionToastComponent {
  suggestionsService = inject(SmartSuggestionsService);
  toastElements = viewChildren<ElementRef<HTMLElement>>('toastItem');

  constructor() {
    afterNextRender(() => {
      // Animate entry when new toasts render
      const els = this.toastElements();
      if (els.length > 0) {
        const lastEl = els[els.length - 1]?.nativeElement;
        if (lastEl) {
          gsap.fromTo(
            lastEl,
            { y: -30, opacity: 0, scale: 0.9 },
            { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.4)' },
          );
        }
      }
    });
  }

  dismiss(item: SmartSuggestion) {
    this.suggestionsService.dismissSuggestion(item.id);
  }

  triggerAction(item: SmartSuggestion) {
    if (item.onAction) {
      item.onAction();
    }
    this.dismiss(item);
  }
}
