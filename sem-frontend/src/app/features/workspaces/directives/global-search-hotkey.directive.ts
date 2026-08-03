import { Directive, HostListener, output } from '@angular/core';

/**
 * Emits when the user presses Ctrl+K / Cmd+K anywhere on the page and focuses
 * the DOM element with id `globalSearchInput` if present.
 */
@Directive({
  selector: '[appGlobalSearchHotkey]',
  standalone: true,
})
export class GlobalSearchHotkeyDirective {
  hotkeyTriggered = output<void>();

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const el = document.getElementById('globalSearchInput');
      if (el) el.focus();
      this.hotkeyTriggered.emit();
    }
  }
}
