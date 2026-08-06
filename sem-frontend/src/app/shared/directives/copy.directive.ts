import { Directive, input, HostListener, inject } from '@angular/core';
import { UiService } from '../../core/services/ui.service';

@Directive({
  selector: '[appCopy]',
  standalone: true,
})
export class CopyDirective {
  appCopy = input.required<string>();
  copyMessage = input<string>('Copied to clipboard!');

  private ui = inject(UiService);

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    event.stopPropagation();
    const text = this.appCopy();
    if (!text) return;

    navigator.clipboard.writeText(text).then(
      () => {
        this.ui.success(this.copyMessage());
      },
      (err) => {
        console.error('Copy to clipboard failed', err);
        this.ui.error('Failed to copy to clipboard');
      },
    );
  }
}
