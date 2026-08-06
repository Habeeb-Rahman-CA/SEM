import {
  Component,
  inject,
  signal,
  HostListener,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { UiService } from '../../../core/services/ui.service';
import { TippyDirective } from '../../directives/tippy.directive';
import { QrScannerComponent } from '../qr-scanner/qr-scanner';

export interface FabAction {
  id: string;
  label: string;
  badge?: string;
  icon: string;
  colorClass: string;
  action: () => void;
}

@Component({
  selector: 'app-floating-action-button',
  standalone: true,
  imports: [TippyDirective, QrScannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './floating-action-button.html',
})
export class FloatingActionButtonComponent {
  private router = inject(Router);
  private ui = inject(UiService);
  private elementRef = inject(ElementRef);

  isOpen = signal<boolean>(false);
  isQrModalOpen = signal<boolean>(false);
  lastScannedResult = signal<string>('');

  readonly actions: FabAction[] = [
    {
      id: 'create-event',
      label: 'New Event',
      icon: 'fi fi-rr-calendar-plus',
      colorClass: 'from-violet-600 to-indigo-600 text-white',
      action: () => {
        this.closeMenu();
        this.router.navigate(['/workspaces']);
        this.ui.info('Navigated to Workspace to create a new Event.');
      },
    },
    {
      id: 'create-competition',
      label: 'New Competition',
      icon: 'fi fi-rr-trophy',
      colorClass: 'from-amber-500 to-orange-600 text-white',
      action: () => {
        this.closeMenu();
        this.router.navigate(['/workspaces']);
        this.ui.info('Navigated to Workspace Competitions.');
      },
    },
    {
      id: 'register-team',
      label: 'Register Team',
      icon: 'fi fi-rr-users-alt',
      colorClass: 'from-emerald-500 to-teal-600 text-white',
      action: () => {
        this.closeMenu();
        this.router.navigate(['/workspaces']);
        this.ui.info('Navigated to Workspace Teams.');
      },
    },
    {
      id: 'add-player',
      label: 'Add Player',
      icon: 'fi fi-rr-user-add',
      colorClass: 'from-cyan-500 to-blue-600 text-white',
      action: () => {
        this.closeMenu();
        this.router.navigate(['/workspaces']);
        this.ui.info('Navigated to Workspace Player Roster.');
      },
    },
    {
      id: 'scan-qr',
      label: 'Scan QR / Ticket',
      badge: 'Scan',
      icon: 'fi fi-rr-qr-scan',
      colorClass: 'from-pink-500 to-rose-600 text-white',
      action: () => {
        this.closeMenu();
        this.openQrScanner();
      },
    },
    {
      id: 'command-palette',
      label: 'Search (Ctrl+K)',
      shortcut: '⌘K',
      icon: 'fi fi-rr-search',
      colorClass: 'from-slate-700 to-slate-800 text-slate-200',
      action: () => {
        this.closeMenu();
        // Dispatch Ctrl+K keydown to trigger command palette globally
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
        );
      },
    } as any,
  ];

  toggleMenu() {
    this.isOpen.update((v) => !v);
  }

  closeMenu() {
    this.isOpen.set(false);
  }

  openQrScanner() {
    this.lastScannedResult.set('');
    this.isQrModalOpen.set(true);
  }

  closeQrScanner() {
    this.isQrModalOpen.set(false);
  }

  onQrScanned(code: string) {
    this.lastScannedResult.set(code);
    this.ui.success(`QR Code Scanned Successfully: "${code}"`);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isOpen()) return;
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.isQrModalOpen()) {
        this.closeQrScanner();
        event.preventDefault();
        return;
      }
      if (this.isOpen()) {
        this.closeMenu();
        event.preventDefault();
      }
    }
  }
}
