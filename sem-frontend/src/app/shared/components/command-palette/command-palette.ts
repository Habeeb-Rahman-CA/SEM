import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UiService } from '../../../core/services/ui.service';

export interface CommandItem {
  id: string;
  label: string;
  category: 'Actions' | 'Navigation' | 'Directory' | 'Settings';
  icon: string;
  shortcut?: string;
  action: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './command-palette.html',
})
export class CommandPaletteComponent {
  private router = inject(Router);
  private ui = inject(UiService);

  isOpen = signal<boolean>(false);
  query = signal<string>('');
  selectedIndex = signal<number>(0);

  commands = computed<CommandItem[]>(() => [
    // ⚡ Actions
    {
      id: 'create-event',
      label: 'Create New Event',
      category: 'Actions',
      icon: 'fi fi-rr-calendar-plus',
      shortcut: '⌘E',
      action: () => {
        this.close();
        this.router.navigate(['/workspaces']);
        this.ui.info('Navigated to Workspace events creator.');
      },
    },
    {
      id: 'create-team',
      label: 'Create Team Roster',
      category: 'Actions',
      icon: 'fi fi-rr-users-alt',
      shortcut: '⌘T',
      action: () => {
        this.close();
        this.router.navigate(['/workspaces']);
        this.ui.info('Navigated to Teams management.');
      },
    },
    {
      id: 'issue-certificate',
      label: 'Issue Digital Certificate',
      category: 'Actions',
      icon: 'fi fi-sr-diploma',
      action: () => {
        this.close();
        this.router.navigate(['/workspaces/default-ws/certificates']);
      },
    },
    {
      id: 'export-report',
      label: 'Export Analytics Report',
      category: 'Actions',
      icon: 'fi fi-rr-file-export',
      shortcut: '⌘R',
      action: () => {
        this.close();
        this.ui.success('Analytics Report exported successfully!');
      },
    },
    // 🚀 Navigation
    {
      id: 'open-dashboard',
      label: 'Open Workspace Dashboard',
      category: 'Navigation',
      icon: 'fi fi-rr-dashboard',
      action: () => {
        this.close();
        this.router.navigate(['/workspaces']);
      },
    },
    {
      id: 'open-public-portal',
      label: 'Open Public Events Portal',
      category: 'Navigation',
      icon: 'fi fi-rr-globe',
      action: () => {
        this.close();
        this.router.navigate(['/events']);
      },
    },
    {
      id: 'open-live-scores',
      label: 'Open Live Score Hub',
      category: 'Navigation',
      icon: 'fi fi-sr-play-alt',
      action: () => {
        this.close();
        this.router.navigate(['/live']);
      },
    },
    {
      id: 'open-activity-timeline',
      label: 'Open Global Activity Timeline',
      category: 'Navigation',
      icon: 'fi fi-rr-time-past',
      shortcut: '⌘A',
      action: () => {
        this.close();
        this.router.navigate(['/workspaces/default-ws/activity']);
      },
    },
    {
      id: 'open-recycle-bin',
      label: 'Open Workspace Recycle Bin (Undo & Trash)',
      category: 'Navigation',
      icon: 'fi fi-rr-trash',
      shortcut: '⌘Z',
      action: () => {
        this.close();
        this.router.navigate(['/workspaces/default-ws/trash']);
      },
    },
    {
      id: 'open-drafts-manager',
      label: 'Open Drafts Manager (Save & Resume Unfinished Work)',
      category: 'Navigation',
      icon: 'fi fi-rr-document',
      shortcut: '⌘D',
      action: () => {
        this.close();
        this.router.navigate(['/workspaces/default-ws/drafts']);
      },
    },
    {
      id: 'open-saved-filters',
      label: 'Open Saved Filters Manager (1-Click Presets & Views)',
      category: 'Navigation',
      icon: 'fi fi-rr-filter',
      shortcut: '⌘F',
      action: () => {
        this.close();
        this.router.navigate(['/workspaces/default-ws/saved-filters']);
      },
    },
    {
      id: 'open-custom-dashboard',
      label: 'Open Custom Workspace Dashboard (Drag & Drop Widgets)',
      category: 'Navigation',
      icon: 'fi fi-rr-apps',
      shortcut: '⌘B',
      action: () => {
        this.close();
        this.router.navigate(['/workspaces/default-ws/custom-dashboard']);
      },
    },
    {
      id: 'open-notification-center',
      label: 'Open Notification Center (Mentions, Support & Alerts)',
      category: 'Navigation',
      icon: 'fi fi-rr-bell',
      shortcut: '⌘N',
      action: () => {
        this.close();
        this.router.navigate(['/workspaces/default-ws/notifications']);
      },
    },
    {
      id: 'open-hall-of-fame',
      label: 'Open Hall of Fame & Legends',
      category: 'Navigation',
      icon: 'fi fi-sr-trophy',
      action: () => {
        this.close();
        this.router.navigate(['/hall-of-fame']);
      },
    },
    {
      id: 'open-sponsor-analytics',
      label: 'Open Sponsor Analytics Dashboard',
      category: 'Navigation',
      icon: 'fi fi-rr-chart-histogram',
      action: () => {
        this.close();
        this.router.navigate(['/workspaces/default-ws/sponsors']);
      },
    },
    {
      id: 'open-pricing',
      label: 'View Subscription Plans & Pricing',
      category: 'Navigation',
      icon: 'fi fi-rr-credit-card',
      action: () => {
        this.close();
        this.router.navigate(['/pricing']);
      },
    },
    // 🔍 Directory & Lookups
    {
      id: 'search-player',
      label: 'Search Players Directory',
      category: 'Directory',
      icon: 'fi fi-rr-user-search',
      action: () => {
        this.close();
        this.router.navigate(['/workspaces']);
        this.ui.info('Search players in workspace directory.');
      },
    },
    {
      id: 'verify-certificate',
      label: 'Verify Digital Certificate (QR Code)',
      category: 'Directory',
      icon: 'fi fi-rr-qr-code',
      action: () => {
        this.close();
        this.router.navigate(['/public/certificates/verify/CERT-2026-TAISEN-WIN-98A4']);
      },
    },
    // ⚙️ Settings
    {
      id: 'system-settings',
      label: 'Open System Settings',
      category: 'Settings',
      icon: 'fi fi-rr-settings',
      action: () => {
        this.close();
        this.router.navigate(['/system-settings']);
      },
    },
    {
      id: 'toggle-dark-mode',
      label: 'Toggle Dark / High-Contrast Mode',
      category: 'Settings',
      icon: 'fi fi-rr-moon',
      action: () => {
        this.close();
        this.ui.success('Dark mode preference active.');
      },
    },
  ]);

  filteredCommands = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.commands();
    return this.commands().filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  });

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    // Listen for Ctrl+K or Cmd+K
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggle();
      return;
    }

    if (!this.isOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    const list = this.filteredCommands();
    if (list.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i + 1) % list.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i - 1 + list.length) % list.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const current = list[this.selectedIndex()];
      if (current) {
        current.action();
      }
    }
  }

  toggle() {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.query.set('');
      this.selectedIndex.set(0);
    }
  }

  close() {
    this.isOpen.set(false);
  }

  execute(cmd: CommandItem) {
    cmd.action();
  }
}
