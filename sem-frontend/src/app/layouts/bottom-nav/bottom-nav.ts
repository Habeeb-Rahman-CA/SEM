import { Component, computed, inject, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CapacitorService } from '../../core/services/capacitor.service';

export type BottomNavTab = 'overview' | 'events' | 'players' | 'check-in' | 'more';

interface NavItem {
  key: BottomNavTab;
  label: string;
  icon: string;
  /** When present, activates a workspace tab via the tabChanged output. */
  workspaceTab?: 'overview' | 'events' | 'players' | 'venues' | 'reports' | 'settings' | 'files';
  /** When present, navigates via router. */
  routerLink?: any[];
  requiresWorkspace?: boolean;
}

/**
 * BottomNavComponent
 *
 * Native-style tab bar rendered only on mobile / native shells (hidden at
 * lg+). Reuses the same activeTab state that the sidebar drives so navigating
 * from either surface keeps the workspace-detail view in sync.
 *
 * Emits `tabChanged` for tabs that toggle a workspace-detail sub-view;
 * dedicated destinations (Check-in, More) use RouterLink directly.
 */
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [NgClass, RouterLink],
  template: `
    <nav
      aria-label="Primary"
      class="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-white/10 bottom-nav-safe shadow-[0_-8px_24px_rgba(0,0,0,0.35)]"
    >
      <ul class="flex items-stretch justify-around">
        @for (item of items(); track item.key) {
          @if (item.routerLink) {
            <li class="flex-1">
              <a
                [routerLink]="item.routerLink"
                (click)="onNativeTap()"
                [ngClass]="tabClass(item.key)"
              >
                <i [class]="'fi ' + item.icon + ' text-base'"></i>
                <span class="text-[10px] font-bold mt-0.5">{{ item.label }}</span>
              </a>
            </li>
          } @else {
            <li class="flex-1">
              <button type="button" (click)="onTabTap(item)" [ngClass]="tabClass(item.key)">
                <i [class]="'fi ' + item.icon + ' text-base'"></i>
                <span class="text-[10px] font-bold mt-0.5">{{ item.label }}</span>
              </button>
            </li>
          }
        }
      </ul>
    </nav>
  `,
})
export class BottomNavComponent {
  private capacitor = inject(CapacitorService);

  workspaceId = input<string | null>(null);
  activeKey = input<BottomNavTab>('overview');

  tabChanged = output<
    'overview' | 'events' | 'players' | 'venues' | 'reports' | 'settings' | 'files'
  >();

  items = computed<NavItem[]>(() => {
    const wsId = this.workspaceId();
    const inWorkspace = !!wsId;
    return [
      { key: 'overview', label: 'Home', icon: 'fi-rr-apps', workspaceTab: 'overview' },
      { key: 'events', label: 'Events', icon: 'fi-rr-trophy', workspaceTab: 'events' },
      { key: 'players', label: 'Players', icon: 'fi-rr-running', workspaceTab: 'players' },
      {
        key: 'check-in',
        label: 'Check-in',
        icon: 'fi-rr-qrcode',
        routerLink: inWorkspace ? ['/workspaces', wsId, 'check-in'] : ['/workspaces'],
        requiresWorkspace: true,
      },
      { key: 'more', label: 'Profile', icon: 'fi-rr-user', routerLink: ['/profile'] },
    ];
  });

  tabClass(key: BottomNavTab): Record<string, boolean> {
    const active = this.activeKey() === key;
    return {
      'w-full h-full flex flex-col items-center justify-center py-2 gap-0.5 outline-none cursor-pointer transition-colors': true,
      'text-violet-400': active,
      'text-slate-400 hover:text-white active:text-white': !active,
    };
  }

  onTabTap(item: NavItem) {
    if (!item.workspaceTab) return;
    void this.capacitor.haptic('light');
    this.tabChanged.emit(item.workspaceTab);
  }

  onNativeTap() {
    void this.capacitor.haptic('light');
  }
}
