import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onUndo?: () => void;
  undoCountdown?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root',
})
export class UiService {
  // Toasts
  toasts = signal<Toast[]>([]);

  // Offline status signal
  isOffline = signal(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Confirm Modal
  confirmModalOpen = signal(false);
  confirmOptions = signal<ConfirmOptions | null>(null);
  private confirmResolve: ((value: boolean) => void) | null = null;

  // Keyboard Shortcuts Cheat Sheet Modal
  shortcutsModalOpen = signal(false);

  openShortcutsModal() {
    this.shortcutsModalOpen.set(true);
  }

  closeShortcutsModal() {
    this.shortcutsModalOpen.set(false);
  }

  toggleShortcutsModal() {
    this.shortcutsModalOpen.update((v) => !v);
  }

  // Compact Mode Density Signal
  isCompactMode = signal(false);

  toggleCompactMode() {
    this.isCompactMode.update((v) => !v);
    this.applyCompactMode();
    this.info(
      this.isCompactMode()
        ? 'Compact Mode Enabled (High Density View)'
        : 'Standard Density Mode Enabled',
    );
  }

  private applyCompactMode() {
    if (typeof document !== 'undefined') {
      if (this.isCompactMode()) {
        document.documentElement.classList.add('compact-mode');
        localStorage.setItem('sem_compact_mode', 'true');
      } else {
        document.documentElement.classList.remove('compact-mode');
        localStorage.setItem('sem_compact_mode', 'false');
      }
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const savedCompact = localStorage.getItem('sem_compact_mode') === 'true';
      if (savedCompact) {
        this.isCompactMode.set(true);
        this.applyCompactMode();
      }

      window.addEventListener('online', () => {
        this.isOffline.set(false);
        this.success('Your connection has been restored.');
      });
      window.addEventListener('offline', () => {
        this.isOffline.set(true);
        this.error('You are currently offline. Live updates and actions are disabled.');
      });
    }
  }

  showToast(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration = 3000,
    onUndo?: () => void,
  ) {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      message,
      type,
      duration,
      onUndo,
      undoCountdown: onUndo ? 10 : undefined,
    };
    this.toasts.update((prev) => [...prev, newToast]);

    if (onUndo) {
      let secondsLeft = 10;
      const interval = setInterval(() => {
        secondsLeft -= 1;
        this.toasts.update((prev) =>
          prev.map((t) => (t.id === id ? { ...t, undoCountdown: secondsLeft } : t)),
        );
        if (secondsLeft <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    }

    setTimeout(() => {
      this.removeToast(id);
    }, duration);
  }

  showUndo(message: string, onUndo: () => void, duration = 10000) {
    this.showToast(message, 'warning', duration, onUndo);
  }

  success(message: string, duration = 3000) {
    this.showToast(message, 'success', duration);
  }

  error(message: string, duration = 4000) {
    this.showToast(message, 'error', duration);
  }

  info(message: string, duration = 3000) {
    this.showToast(message, 'info', duration);
  }

  warning(message: string, duration = 3500) {
    this.showToast(message, 'warning', duration);
  }

  removeToast(id: string) {
    this.toasts.update((prev) => prev.filter((t) => t.id !== id));
  }

  // Returns a Promise that resolves to true (if confirmed) or false (if cancelled)
  confirm(options: ConfirmOptions): Promise<boolean> {
    this.confirmOptions.set(options);
    this.confirmModalOpen.set(true);

    return new Promise<boolean>((resolve) => {
      this.confirmResolve = resolve;
    });
  }

  handleConfirm(result: boolean) {
    if (this.confirmResolve) {
      this.confirmResolve(result);
      this.confirmResolve = null;
    }
    this.confirmModalOpen.set(false);
    this.confirmOptions.set(null);
  }
}
