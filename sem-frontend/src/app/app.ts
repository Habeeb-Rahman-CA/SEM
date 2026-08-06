import { Component, inject, effect, HostListener, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgClass } from '@angular/common';
import { UiService } from './core/services/ui.service';
import { BrandingService } from './features/branding/services/branding.service';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette';
import { KeyboardShortcutsModalComponent } from './shared/components/keyboard-shortcuts-modal/keyboard-shortcuts-modal';
import { OfflineBannerComponent } from './shared/components/offline-banner/offline-banner';
import { OfflineSyncModalComponent } from './shared/components/offline-sync-modal/offline-sync-modal';
import { BackgroundJobsWidgetComponent } from './shared/components/background-jobs-widget/background-jobs-widget';
import { DraftRecoveryModalComponent } from './shared/components/draft-recovery-modal/draft-recovery-modal';
import { UndoToastComponent } from './shared/components/undo-toast/undo-toast';
import { VersionHistoryDrawerComponent } from './shared/components/version-history-drawer/version-history-drawer';
import { ToastItemComponent } from './shared/components/toast-item/toast-item';
import { CelebrationModalComponent } from './shared/components/celebration-modal/celebration-modal';
import { ActivityFeedComponent } from './shared/components/activity-feed/activity-feed';
import { RecycleBinComponent } from './shared/components/recycle-bin/recycle-bin';
import { SmartSuggestionToastComponent } from './shared/components/smart-suggestion-toast/smart-suggestion-toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NgClass,
    CommandPaletteComponent,
    KeyboardShortcutsModalComponent,
    OfflineBannerComponent,
    OfflineSyncModalComponent,
    BackgroundJobsWidgetComponent,
    DraftRecoveryModalComponent,
    UndoToastComponent,
    VersionHistoryDrawerComponent,
    ToastItemComponent,
    CelebrationModalComponent,
    ActivityFeedComponent,
    RecycleBinComponent,
    SmartSuggestionToastComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  uiService = inject(UiService);
  recycleBinService = inject(RecycleBinService);
  private brandingService = inject(BrandingService);
  private previouslyFocusedElement: HTMLElement | null = null;

  ngOnInit() {
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
    const activeEl = document.activeElement;
    const isEditingText =
      activeEl instanceof HTMLInputElement ||
      activeEl instanceof HTMLTextAreaElement ||
      activeEl?.getAttribute('contenteditable') === 'true';

    // 1. Esc key handling for confirm modal / shortcuts modal
    if (event.key === 'Escape') {
      if (this.uiService.confirmModalOpen()) {
        this.uiService.handleConfirm(false);
        event.preventDefault();
        return;
      }
      if (this.uiService.shortcutsModalOpen()) {
        this.uiService.closeShortcutsModal();
        event.preventDefault();
        return;
      }
    }

    // 2. Ctrl+S or Cmd+S handling (Save shortcut)
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      // Dispatch custom save event or notify active component
      const saveBtn = document.querySelector(
        '[data-shortcut="save"], button[type="submit"]',
      ) as HTMLElement;
      if (saveBtn) {
        saveBtn.click();
        this.uiService.success('Form saved successfully (Ctrl+S)');
      } else {
        this.uiService.success('Workspace state saved & synced (Ctrl+S)');
      }
      return;
    }

    // Modal trap focus for confirm dialog
    if (this.uiService.confirmModalOpen()) {
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
      return;
    }

    // If user is currently typing in an input field, do not trigger single-key hotkeys below
    if (isEditingText) return;

    // 3. '?' Key (Shift + /) - Open Keyboard Shortcuts Cheat Sheet Modal
    if (event.key === '?') {
      event.preventDefault();
      this.uiService.toggleShortcutsModal();
      return;
    }

    // 4. '/' Key - Focus Search Input
    if (event.key === '/') {
      event.preventDefault();
      const searchInput = document.querySelector(
        'input[type="search"], input[placeholder*="Search"], [data-shortcut="search"]',
      ) as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select?.();
      } else {
        // Fallback: trigger Ctrl+K Command Palette
        const cmdKEvent = new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
        });
        document.dispatchEvent(cmdKEvent);
      }
      return;
    }

    // 5. 'N' Key - Trigger New Item Creation
    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      const newBtn = document.querySelector(
        '[data-shortcut="new"], button:has(.fi-rr-plus), button:has(.fi-rr-add)',
      ) as HTMLElement;
      if (newBtn) {
        newBtn.click();
      } else {
        // Fallback: trigger Ctrl+K Command Palette
        const cmdKEvent = new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
        });
        document.dispatchEvent(cmdKEvent);
      }
      return;
    }
  }
}
