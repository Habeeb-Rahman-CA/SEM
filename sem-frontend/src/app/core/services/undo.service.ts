import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { UiService } from './ui.service';

export interface UndoAction {
  id: string;
  description: string;
  undoFn: () => Observable<any> | Promise<any> | void;
  timeoutSeconds: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class UndoService {
  private ui = inject(UiService);

  activeAction = signal<UndoAction | null>(null);
  countdown = signal<number>(0);

  private timer: any = null;

  registerUndoAction(
    description: string,
    undoFn: () => Observable<any> | Promise<any> | void,
    timeoutSeconds: number = 8,
  ) {
    this.clearTimer();

    const action: UndoAction = {
      id: crypto.randomUUID(),
      description,
      undoFn,
      timeoutSeconds,
      timestamp: Date.now(),
    };

    this.activeAction.set(action);
    this.countdown.set(timeoutSeconds);

    this.timer = setInterval(() => {
      const current = this.countdown();
      if (current <= 1) {
        this.clearTimer();
        this.activeAction.set(null);
      } else {
        this.countdown.set(current - 1);
      }
    }, 1000);
  }

  executeUndo() {
    const action = this.activeAction();
    if (!action) return;

    this.clearTimer();
    this.activeAction.set(null);

    try {
      const result = action.undoFn();
      if (result instanceof Observable) {
        result.subscribe({
          next: () => this.ui.success(`↩️ Action Undone: ${action.description}`),
          error: () => this.ui.error('Failed to undo action.'),
        });
      } else if (result instanceof Promise) {
        result
          .then(() => this.ui.success(`↩️ Action Undone: ${action.description}`))
          .catch(() => this.ui.error('Failed to undo action.'));
      } else {
        this.ui.success(`↩️ Action Undone: ${action.description}`);
      }
    } catch (e) {
      this.ui.error('Failed to undo action.');
    }
  }

  dismiss() {
    this.clearTimer();
    this.activeAction.set(null);
  }

  private clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
