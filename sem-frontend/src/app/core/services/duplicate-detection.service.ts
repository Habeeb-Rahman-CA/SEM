import { Injectable, signal, inject } from '@angular/core';
import { UiService } from './ui.service';

export interface DuplicateCheckResult {
  isLikelyDuplicate: boolean;
  matchedRecord?: any;
  matchReason?: string;
  confidenceScore?: number;
}

@Injectable({
  providedIn: 'root',
})
export class DuplicateDetectionService {
  private ui = inject(UiService);

  // Warning Modal Signal State
  warningModalOpen = signal(false);
  activeMatchReason = signal<string>('');
  activeExistingRecord = signal<any>(null);
  activeConfidence = signal<number>(90);

  private pendingCreateCallback: (() => void) | null = null;

  /**
   * Check for duplicate record before submission
   */
  checkForDuplicate<T extends Record<string, any>>(
    newRecord: Partial<T>,
    existingList: T[],
    keysToCheck: Array<keyof T>,
    entityLabel = 'Record',
  ): DuplicateCheckResult {
    if (!existingList || existingList.length === 0) {
      return { isLikelyDuplicate: false };
    }

    for (const item of existingList) {
      for (const key of keysToCheck) {
        const val1 = newRecord[key];
        const val2 = item[key];

        if (val1 && val2) {
          const str1 = String(val1).trim().toLowerCase();
          const str2 = String(val2).trim().toLowerCase();

          // Exact match
          if (str1 === str2) {
            return {
              isLikelyDuplicate: true,
              matchedRecord: item,
              matchReason: `A ${entityLabel} with the same ${String(key)} ("${val1}") already exists.`,
              confidenceScore: 100,
            };
          }

          // Levenshtein / Substring similarity match (e.g. "Red Dragons FC" vs "Red Dragons")
          if (str1.length > 3 && str2.length > 3 && (str1.includes(str2) || str2.includes(str1))) {
            return {
              isLikelyDuplicate: true,
              matchedRecord: item,
              matchReason: `Likely duplicate: "${val1}" closely matches existing ${entityLabel} "${val2}".`,
              confidenceScore: 85,
            };
          }
        }
      }
    }

    return { isLikelyDuplicate: false };
  }

  /**
   * Prompts user with Duplicate Warning Modal if duplicate detected.
   * Resolves true if user chooses "Create Anyway", false if canceled.
   */
  confirmCreationWithDuplicateCheck<T extends Record<string, any>>(
    newRecord: Partial<T>,
    existingList: T[],
    keysToCheck: Array<keyof T>,
    entityLabel = 'Record',
  ): Promise<boolean> {
    const result = this.checkForDuplicate(newRecord, existingList, keysToCheck, entityLabel);

    if (!result.isLikelyDuplicate) {
      return Promise.resolve(true); // Proceed immediately if no duplicate
    }

    // Surface duplicate warning modal
    this.activeMatchReason.set(result.matchReason || 'Potential duplicate detected.');
    this.activeExistingRecord.set(result.matchedRecord);
    this.activeConfidence.set(result.confidenceScore || 85);
    this.warningModalOpen.set(true);

    return new Promise<boolean>((resolve) => {
      this.pendingCreateCallback = () => {
        this.warningModalOpen.set(false);
        resolve(true);
      };
    });
  }

  cancelCreation() {
    this.warningModalOpen.set(false);
    this.pendingCreateCallback = null;
    this.ui.info('Creation cancelled due to potential duplicate.');
  }

  proceedAnyway() {
    if (this.pendingCreateCallback) {
      this.pendingCreateCallback();
      this.pendingCreateCallback = null;
    }
  }
}
