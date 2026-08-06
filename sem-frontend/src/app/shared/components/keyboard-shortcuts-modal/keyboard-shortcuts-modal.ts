import { Component, ChangeDetectionStrategy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../../core/services/ui.service';

export interface ShortcutGroup {
  title: string;
  icon: string;
  shortcuts: {
    keys: string[];
    description: string;
    badge?: string;
  }[];
}

@Component({
  selector: 'app-keyboard-shortcuts-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './keyboard-shortcuts-modal.html',
})
export class KeyboardShortcutsModalComponent {
  uiService = inject(UiService);

  readonly groups: ShortcutGroup[] = [
    {
      title: 'Global Navigation & Speed',
      icon: 'fi fi-rr-bolt',
      shortcuts: [
        { keys: ['?'], description: 'Open Keyboard Shortcuts Cheat Sheet', badge: 'Help' },
        { keys: ['/'], description: 'Focus Search / Open Command Search', badge: 'Search' },
        { keys: ['N'], description: 'Quick New Item Creation', badge: 'Create' },
        { keys: ['Esc'], description: 'Close Open Modals / Dialogs / Search', badge: 'Close' },
      ],
    },
    {
      title: 'Form & Actions',
      icon: 'fi fi-rr-disk',
      shortcuts: [
        { keys: ['Ctrl', 'S'], description: 'Save Active Form / Workspace Sync', badge: 'Save' },
        { keys: ['⌘', 'K'], description: 'Open Global Command Palette', badge: 'Command' },
        { keys: ['⌘', 'E'], description: 'Create New Event', badge: 'Event' },
        { keys: ['⌘', 'T'], description: 'Create Team Roster', badge: 'Team' },
      ],
    },
    {
      title: 'Modules & Pipelines',
      icon: 'fi fi-rr-apps',
      shortcuts: [
        { keys: ['⌘', 'W'], description: 'Open Workflow Pipeline Builder', badge: 'Workflow' },
        { keys: ['⌘', 'R'], description: 'Export Analytics Report', badge: 'Export' },
        { keys: ['⌘', 'F'], description: 'Manage Saved Filters', badge: 'Filter' },
      ],
    },
  ];

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.uiService.shortcutsModalOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.uiService.closeShortcutsModal();
    }
  }

  close() {
    this.uiService.closeShortcutsModal();
  }
}
