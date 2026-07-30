import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CapacitorService } from '../../../core/services/capacitor.service';
import { UiService } from '../../../core/services/ui.service';

/**
 * QrScannerComponent
 *
 * A self-contained "Scan QR" button. When pressed it triggers the platform-
 * appropriate scanner (native BarcodeScanner on device, browser
 * BarcodeDetector on the web, and a manual entry fallback otherwise).
 *
 * The scanner overlay itself is rendered by the CapacitorService, so this
 * component just owns the trigger button + optional inline manual-entry
 * fallback.
 *
 * Usage:
 *   <app-qr-scanner
 *     label="Check-in"
 *     (scanned)="onScanned($event)"
 *   />
 */
@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col gap-2 w-full">
      <button
        type="button"
        (click)="startScan()"
        [disabled]="isScanning() || disabled()"
        [class]="buttonClass()"
      >
        @if (isScanning()) {
          <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
          Scanning...
        } @else {
          <i class="fi fi-rr-qrcode text-sm"></i>
          {{ label() }}
        }
      </button>

      @if (showManualEntry()) {
        <div class="flex items-center gap-2">
          <input
            type="text"
            [placeholder]="manualPlaceholder()"
            class="flex-1 bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
            [ngModel]="manualValue()"
            (ngModelChange)="manualValue.set($event)"
            (keyup.enter)="submitManual()"
          />
          <button
            type="button"
            (click)="submitManual()"
            [disabled]="!manualValue().trim()"
            class="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex-shrink-0"
          >
            Submit
          </button>
        </div>
      }
    </div>
  `,
})
export class QrScannerComponent {
  private capacitor = inject(CapacitorService);
  private ui = inject(UiService);

  label = input<string>('Scan QR Code');
  disabled = input<boolean>(false);
  /** When true, always show a text input for typing codes by hand. */
  showManualEntry = input<boolean>(false);
  manualPlaceholder = input<string>('Or paste code here');
  /** Extra classes for the trigger button (overrides default when provided). */
  buttonClass = input<string>(
    'px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 w-full',
  );

  scanned = output<string>();
  cancelled = output<void>();

  isScanning = signal(false);
  manualValue = signal('');

  async startScan() {
    if (this.isScanning()) return;
    this.isScanning.set(true);
    try {
      const value = await this.capacitor.startQRScan();
      if (value) {
        this.scanned.emit(value);
      } else {
        this.cancelled.emit();
      }
    } catch (err: any) {
      console.error('QR scan failed:', err);
      this.ui.error(err?.message || 'Failed to start QR scanner.');
      this.cancelled.emit();
    } finally {
      this.isScanning.set(false);
    }
  }

  submitManual() {
    const value = this.manualValue().trim();
    if (!value) return;
    this.scanned.emit(value);
    this.manualValue.set('');
  }
}
