import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface BulkAssignOption {
  id: string;
  name: string;
}

export interface BulkStatusOption {
  key: string;
  label: string;
  color?: string;
}

@Component({
  selector: 'app-bulk-operations-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bulk-operations-bar.html',
})
export class BulkOperationsBarComponent {
  selectedCount = input.required<number>();
  totalCount = input<number>(0);
  entityName = input<string>('records');

  assignOptions = input<BulkAssignOption[]>([]);
  statusOptions = input<BulkStatusOption[]>([]);

  clearSelection = output<void>();
  selectAll = output<void>();
  bulkDelete = output<void>();
  bulkAssign = output<string>(); // Target option ID
  bulkExport = output<'csv' | 'excel' | 'json'>();
  bulkArchive = output<void>();
  bulkUpdateStatus = output<string>(); // Target status key

  // Dropdown States
  showAssignDropdown = signal<boolean>(false);
  showStatusDropdown = signal<boolean>(false);
  showExportDropdown = signal<boolean>(false);
  showDeleteConfirmModal = signal<boolean>(false);

  toggleAssignDropdown() {
    this.showAssignDropdown.set(!this.showAssignDropdown());
    this.showStatusDropdown.set(false);
    this.showExportDropdown.set(false);
  }

  toggleStatusDropdown() {
    this.showStatusDropdown.set(!this.showStatusDropdown());
    this.showAssignDropdown.set(false);
    this.showExportDropdown.set(false);
  }

  toggleExportDropdown() {
    this.showExportDropdown.set(!this.showExportDropdown());
    this.showAssignDropdown.set(false);
    this.showStatusDropdown.set(false);
  }

  closeAllDropdowns() {
    this.showAssignDropdown.set(false);
    this.showStatusDropdown.set(false);
    this.showExportDropdown.set(false);
  }

  onAssign(optionId: string) {
    this.bulkAssign.emit(optionId);
    this.closeAllDropdowns();
  }

  onUpdateStatus(statusKey: string) {
    this.bulkUpdateStatus.emit(statusKey);
    this.closeAllDropdowns();
  }

  onExport(format: 'csv' | 'excel' | 'json') {
    this.bulkExport.emit(format);
    this.closeAllDropdowns();
  }

  onArchive() {
    this.bulkArchive.emit();
    this.closeAllDropdowns();
  }

  confirmDelete() {
    this.bulkDelete.emit();
    this.showDeleteConfirmModal.set(false);
    this.closeAllDropdowns();
  }
}
