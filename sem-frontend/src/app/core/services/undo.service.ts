import { Injectable, computed, inject, signal } from '@angular/core';
import { UiService } from './ui.service';

export interface UndoableAction {
  id: string;
  description: string;
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class UndoService {
  private ui = inject(UiService);

  private undoStackSignal = signal<UndoableAction[]>([]);
  private redoStackSignal = signal<UndoableAction[]>([]);

  undoStack = this.undoStackSignal.asReadonly();
  redoStack = this.redoStackSignal.asReadonly();

  canUndo = computed(() => this.undoStackSignal().length > 0);
  canRedo = computed(() => this.redoStackSignal().length > 0);
  lastActionDescription = computed(() => {
    const stack = this.undoStackSignal();
    return stack.length > 0 ? stack[stack.length - 1].description : null;
  });

  constructor() {
    this.initKeyboardListener();
  }

  private initKeyboardListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (event: KeyboardEvent) => {
      // Don't intercept if user is typing inside input/textarea/contenteditable
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      if (cmdOrCtrl && event.key.toLowerCase() === 'z') {
        if (event.shiftKey) {
          // Cmd+Shift+Z or Ctrl+Shift+Z -> Redo
          event.preventDefault();
          this.redo();
        } else {
          // Cmd+Z or Ctrl+Z -> Undo
          event.preventDefault();
          this.undo();
        }
      } else if (cmdOrCtrl && event.key.toLowerCase() === 'y') {
        // Ctrl+Y -> Redo
        event.preventDefault();
        this.redo();
      }
    });
  }

  /**
   * Registers a new undoable action to the global stack and surfaces an Undo toast alert.
   */
  register(action: {
    description: string;
    undo: () => Promise<void> | void;
    redo?: () => Promise<void> | void;
    showToast?: boolean;
  }) {
    const entry: UndoableAction = {
      id: Math.random().toString(36).substring(2, 9),
      description: action.description,
      undo: action.undo,
      redo: action.redo,
      timestamp: new Date(),
    };

    this.undoStackSignal.update((stack) => [...stack, entry]);
    this.redoStackSignal.set([]); // Clear redo stack on new action

    if (action.showToast !== false) {
      this.ui.showUndo(action.description, () => {
        this.undoAction(entry);
      });
    }
  }

  /**
   * Undoes the last action on top of the undo stack.
   */
  async undo(): Promise<boolean> {
    const stack = this.undoStackSignal();
    if (stack.length === 0) return false;

    const action = stack[stack.length - 1];
    return this.undoAction(action);
  }

  private async undoAction(action: UndoableAction): Promise<boolean> {
    try {
      await action.undo();

      // Remove from undo stack & push to redo stack
      this.undoStackSignal.update((stack) => stack.filter((a) => a.id !== action.id));
      this.redoStackSignal.update((stack) => [...stack, action]);

      this.ui.success(`Undone: ${action.description}`);
      return true;
    } catch (err) {
      this.ui.error(`Failed to undo: ${action.description}`);
      return false;
    }
  }

  /**
   * Redoes the last undone action on top of the redo stack.
   */
  async redo(): Promise<boolean> {
    const stack = this.redoStackSignal();
    if (stack.length === 0) return false;

    const action = stack[stack.length - 1];

    if (!action.redo) {
      this.ui.info(`Cannot redo: ${action.description}`);
      return false;
    }

    try {
      await action.redo();

      // Remove from redo stack & push back to undo stack
      this.redoStackSignal.update((stack) => stack.filter((a) => a.id !== action.id));
      this.undoStackSignal.update((stack) => [...stack, action]);

      this.ui.success(`Redone: ${action.description}`);
      return true;
    } catch (err) {
      this.ui.error(`Failed to redo: ${action.description}`);
      return false;
    }
  }

  /**
   * Clears all undo/redo history.
   */
  clear() {
    this.undoStackSignal.set([]);
    this.redoStackSignal.set([]);
  }
}
