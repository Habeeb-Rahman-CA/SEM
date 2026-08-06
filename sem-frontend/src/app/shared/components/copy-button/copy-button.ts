import { Component, input, signal, ElementRef, viewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-copy-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './copy-button.html',
})
export class CopyButtonComponent {
  value = input.required<string>(); // Text / ID / URL to copy
  label = input<string>(''); // Optional button text label
  toastMessage = input<string>('Copied to clipboard!');

  private ui = inject(UiService);

  btnRef = viewChild<ElementRef<HTMLElement>>('btn');
  isCopied = signal(false);

  copyToClipboard(event: MouseEvent) {
    event.stopPropagation();
    const text = this.value();
    if (!text) return;

    navigator.clipboard.writeText(text).then(
      () => {
        this.isCopied.set(true);
        this.ui.success(this.toastMessage());

        const el = this.btnRef()?.nativeElement;
        if (el) {
          gsap.fromTo(
            el,
            { scale: 0.8 },
            { scale: 1.15, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' },
          );
        }

        setTimeout(() => this.isCopied.set(false), 2000);
      },
      (err) => {
        console.error('Failed to copy text', err);
        this.ui.error('Failed to copy to clipboard.');
      },
    );
  }
}
