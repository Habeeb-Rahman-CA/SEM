import { Injectable, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { UiService } from './ui.service';

const SESSION_URL_KEY = 'taisen_last_session_url';
const SESSION_TAB_KEY = 'taisen_last_session_tab';
const SESSION_RESTORE_ENABLED_KEY = 'taisen_session_restore_enabled';

const IGNORED_PATHS = ['/login', '/register', '/404', '/', '/workspaces/join'];

@Injectable({
  providedIn: 'root',
})
export class SessionRestoreService {
  private router = inject(Router);
  private storage = inject(StorageService);
  private ui = inject(UiService);

  lastSessionUrl = signal<string | null>(null);
  hasRestoredInCurrentRun = false;

  constructor() {
    this.initSessionTracking();
  }

  private async initSessionTracking() {
    const savedUrl = await this.storage.getItem(SESSION_URL_KEY);
    if (savedUrl) {
      this.lastSessionUrl.set(savedUrl);
    }

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects || event.url;
        if (this.shouldSaveRoute(url)) {
          this.lastSessionUrl.set(url);
          void this.storage.setItem(SESSION_URL_KEY, url);
        }
      });
  }

  private shouldSaveRoute(url: string): boolean {
    if (!url) return false;
    const cleanUrl = url.split('?')[0];
    return !IGNORED_PATHS.includes(cleanUrl);
  }

  /**
   * Attempts to restore the saved session route when user lands on a generic starting page.
   * Returns true if session was restored, false otherwise.
   */
  async restoreSessionIfAvailable(): Promise<boolean> {
    if (this.hasRestoredInCurrentRun) return false;

    const isEnabled = (await this.storage.getItem(SESSION_RESTORE_ENABLED_KEY)) !== 'false';
    if (!isEnabled) return false;

    const savedUrl = await this.storage.getItem(SESSION_URL_KEY);
    if (!savedUrl) return false;

    const currentUrl = this.router.url;
    // Only auto-restore if user is currently at default target (e.g. /workspaces or /)
    if (currentUrl === '/workspaces' || currentUrl === '/' || currentUrl === '') {
      if (savedUrl !== currentUrl && this.shouldSaveRoute(savedUrl)) {
        this.hasRestoredInCurrentRun = true;
        await this.router.navigateByUrl(savedUrl);
        this.ui.info('Session Restored: Reopened where you left off!');
        return true;
      }
    }

    return false;
  }

  /** Save active tab within a component (e.g. workspace tabs) */
  async saveTabState(tabId: string): Promise<void> {
    await this.storage.setItem(SESSION_TAB_KEY, tabId);
  }

  /** Get last active tab state */
  async getTabState(): Promise<string | null> {
    return await this.storage.getItem(SESSION_TAB_KEY);
  }

  /** Clear saved session state */
  async clearSavedSession(): Promise<void> {
    this.lastSessionUrl.set(null);
    await this.storage.removeItem(SESSION_URL_KEY);
    await this.storage.removeItem(SESSION_TAB_KEY);
  }
}
