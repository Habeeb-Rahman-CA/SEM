import {
  Component,
  input,
  signal,
  computed,
  OnInit,
  TemplateRef,
  ContentChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../button/button';

export interface TableColumn {
  key: string;
  label: string;
  visible?: boolean;
  width?: number; // width in px
  sortable?: boolean;
}

@Component({
  selector: 'app-customizable-table',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './customizable-table.html',
})
export class CustomizableTableComponent implements OnInit {
  tableId = input.required<string>(); // Unique key for storing column preferences in LocalStorage
  columns = input.required<TableColumn[]>();
  data = input.required<any[]>();

  // Optional custom cell template
  @ContentChild('cellTemplate') cellTemplate?: TemplateRef<any>;

  configuredColumns = signal<TableColumn[]>([]);
  isCustomizerOpen = signal<boolean>(false);

  // Column Resizing State
  resizingKey = signal<string | null>(null);
  startX = 0;
  startWidth = 0;

  visibleColumns = computed(() => this.configuredColumns().filter((c) => c.visible !== false));

  ngOnInit() {
    this.loadColumnConfig();
  }

  private loadColumnConfig() {
    const storageKey = `table_cols_${this.tableId()}`;
    const saved = localStorage.getItem(storageKey);
    const defaults = this.columns().map((c) => ({
      ...c,
      visible: c.visible !== false,
      width: c.width || 180,
    }));

    if (saved) {
      try {
        const parsed: TableColumn[] = JSON.parse(saved);
        // Merge saved preferences with declared columns
        const merged = defaults.map((d) => {
          const match = parsed.find((p) => p.key === d.key);
          return match
            ? { ...d, visible: match.visible !== false, width: match.width || d.width }
            : d;
        });
        // Respect saved order if valid
        const savedKeys = parsed.map((p) => p.key);
        merged.sort((a, b) => {
          const indexA = savedKeys.indexOf(a.key);
          const indexB = savedKeys.indexOf(b.key);
          if (indexA === -1 || indexB === -1) return 0;
          return indexA - indexB;
        });
        this.configuredColumns.set(merged);
        return;
      } catch (e) {
        console.error('Failed to parse column config from localStorage', e);
      }
    }

    this.configuredColumns.set(defaults);
  }

  saveColumnConfig() {
    const storageKey = `table_cols_${this.tableId()}`;
    const state = this.configuredColumns().map((c) => ({
      key: c.key,
      visible: c.visible,
      width: c.width,
    }));
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  toggleColumnVisibility(key: string) {
    this.configuredColumns.update((cols) =>
      cols.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)),
    );
    this.saveColumnConfig();
  }

  moveColumn(index: number, direction: 'up' | 'down') {
    const list = [...this.configuredColumns()];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    this.configuredColumns.set(list);
    this.saveColumnConfig();
  }

  resetToDefault() {
    const defaults = this.columns().map((c) => ({
      ...c,
      visible: c.visible !== false,
      width: c.width || 180,
    }));
    this.configuredColumns.set(defaults);
    localStorage.removeItem(`table_cols_${this.tableId()}`);
  }

  // ── Column Resizing Logic ──
  startResize(event: MouseEvent, key: string, currentWidth: number) {
    event.preventDefault();
    event.stopPropagation();

    this.resizingKey.set(key);
    this.startX = event.clientX;
    this.startWidth = currentWidth || 180;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.resizingKey()) return;
      const deltaX = moveEvent.clientX - this.startX;
      const newWidth = Math.max(80, this.startWidth + deltaX);

      this.configuredColumns.update((cols) =>
        cols.map((c) => (c.key === key ? { ...c, width: newWidth } : c)),
      );
    };

    const onMouseUp = () => {
      this.resizingKey.set(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this.saveColumnConfig();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
}
