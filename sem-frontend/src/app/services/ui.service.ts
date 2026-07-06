import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
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

  // Confirm Modal
  confirmModalOpen = signal(false);
  confirmOptions = signal<ConfirmOptions | null>(null);
  private confirmResolve: ((value: boolean) => void) | null = null;

  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3000) {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration };
    this.toasts.update((prev) => [...prev, newToast]);

    setTimeout(() => {
      this.removeToast(id);
    }, duration);
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
