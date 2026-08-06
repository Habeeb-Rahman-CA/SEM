import { Injectable, Logger } from '@nestjs/common';
import { TrashService } from './trash.service';

export interface BackendUndoableTransaction {
  id: string;
  workspaceId: string;
  description: string;
  undoHandler: () => Promise<any>;
  redoHandler?: () => Promise<any>;
  createdAt: Date;
}

@Injectable()
export class UndoService {
  private readonly logger = new Logger(UndoService.name);
  private undoMap: Map<string, BackendUndoableTransaction[]> = new Map();
  private redoMap: Map<string, BackendUndoableTransaction[]> = new Map();

  constructor(private readonly trashService: TrashService) {}

  registerTransaction(
    workspaceId: string,
    transaction: {
      description: string;
      undo: () => Promise<any>;
      redo?: () => Promise<any>;
    },
  ): BackendUndoableTransaction {
    const entry: BackendUndoableTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workspaceId,
      description: transaction.description,
      undoHandler: transaction.undo,
      redoHandler: transaction.redo,
      createdAt: new Date(),
    };

    const currentStack = this.undoMap.get(workspaceId) || [];
    this.undoMap.set(workspaceId, [...currentStack, entry]);
    this.redoMap.set(workspaceId, []); // Reset redo stack for workspace

    this.logger.log(
      `Registered undoable transaction for workspace ${workspaceId}: "${transaction.description}"`,
    );
    return entry;
  }

  async performUndo(
    workspaceId: string,
  ): Promise<{ success: boolean; description: string }> {
    const stack = this.undoMap.get(workspaceId) || [];
    if (stack.length === 0) {
      return { success: false, description: 'No actions to undo' };
    }

    const tx = stack.pop()!;
    this.undoMap.set(workspaceId, stack);

    try {
      await tx.undoHandler();
      const redoStack = this.redoMap.get(workspaceId) || [];
      this.redoMap.set(workspaceId, [...redoStack, tx]);

      this.logger.log(`Successfully undone transaction: "${tx.description}"`);
      return { success: true, description: tx.description };
    } catch (error) {
      this.logger.error(
        `Failed executing undo for transaction "${tx.description}":`,
        error,
      );
      throw error;
    }
  }

  async performRedo(
    workspaceId: string,
  ): Promise<{ success: boolean; description: string }> {
    const stack = this.redoMap.get(workspaceId) || [];
    if (stack.length === 0) {
      return { success: false, description: 'No actions to redo' };
    }

    const tx = stack.pop()!;
    this.redoMap.set(workspaceId, stack);

    if (!tx.redoHandler) {
      return {
        success: false,
        description: `Transaction "${tx.description}" cannot be redone`,
      };
    }

    try {
      await tx.redoHandler();
      const undoStack = this.undoMap.get(workspaceId) || [];
      this.undoMap.set(workspaceId, [...undoStack, tx]);

      this.logger.log(`Successfully redone transaction: "${tx.description}"`);
      return { success: true, description: tx.description };
    } catch (error) {
      this.logger.error(
        `Failed executing redo for transaction "${tx.description}":`,
        error,
      );
      throw error;
    }
  }

  getWorkspaceUndoHistory(
    workspaceId: string,
  ): Array<{ id: string; description: string; createdAt: Date }> {
    const stack = this.undoMap.get(workspaceId) || [];
    return stack.map((tx) => ({
      id: tx.id,
      description: tx.description,
      createdAt: tx.createdAt,
    }));
  }
}
