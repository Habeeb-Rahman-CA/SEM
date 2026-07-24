import { Component, computed, input, output } from '@angular/core';

/**
 * PaginatorComponent — a reusable, signal-friendly paginator.
 *
 * Usage:
 *   <app-paginator
 *     [currentPage]="page()"
 *     [pageSize]="pageSize()"
 *     [total]="filteredItems().length"
 *     (pageChange)="page.set($event)"
 *     (pageSizeChange)="onPageSizeChange($event)" />
 */
@Component({
  selector: 'app-paginator',
  standalone: true,
  template: `
    @if (totalPages() > 1 || showAlways()) {
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1 select-none">

      <!-- Left: count summary + page-size picker -->
      <div class="flex items-center gap-3 text-xs text-slate-500">
        <span>
          {{ rangeStart() }}&ndash;{{ rangeEnd() }} of <strong class="text-slate-300">{{ total() }}</strong>
        </span>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] text-slate-600 uppercase tracking-wider">Per page</span>
          <div class="relative">
            <select
              [value]="pageSize()"
              (change)="onSizeChange($event)"
              class="appearance-none bg-slate-900 border border-white/10 text-slate-300 text-xs rounded-lg pl-2.5 pr-6 py-1 outline-none cursor-pointer hover:border-violet-500/40 transition-colors focus:border-violet-500">
              @for (s of pageSizeOptions(); track s) {
                <option [value]="s" class="bg-slate-900">{{ s }}</option>
              }
            </select>
            <i class="fi fi-rr-angle-small-down absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none"></i>
          </div>
        </div>
      </div>

      <!-- Right: page navigation -->
      <nav aria-label="Pagination" class="flex items-center gap-1">
        <!-- First -->
        <button
          (click)="goTo(1)"
          [disabled]="currentPage() === 1"
          title="First page"
          class="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <i class="fi fi-rr-angle-double-small-left text-xs"></i>
        </button>
        <!-- Prev -->
        <button
          (click)="goTo(currentPage() - 1)"
          [disabled]="currentPage() === 1"
          title="Previous page"
          class="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <i class="fi fi-rr-angle-small-left text-xs"></i>
        </button>

        <!-- Page numbers -->
        @for (p of visiblePages(); track p) {
          @if (p === -1) {
            <span class="px-1.5 text-slate-600 text-xs">…</span>
          } @else {
            <button
              (click)="goTo(p)"
              [class.bg-violet-600]="p === currentPage()"
              [class.text-white]="p === currentPage()"
              [class.font-bold]="p === currentPage()"
              [class.border-violet-500]="p === currentPage()"
              class="min-w-[30px] h-[30px] px-2 rounded-lg border text-xs transition-all
                     border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white">
              {{ p }}
            </button>
          }
        }

        <!-- Next -->
        <button
          (click)="goTo(currentPage() + 1)"
          [disabled]="currentPage() === totalPages()"
          title="Next page"
          class="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <i class="fi fi-rr-angle-small-right text-xs"></i>
        </button>
        <!-- Last -->
        <button
          (click)="goTo(totalPages())"
          [disabled]="currentPage() === totalPages()"
          title="Last page"
          class="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <i class="fi fi-rr-angle-double-small-right text-xs"></i>
        </button>
      </nav>
    </div>
    }
  `,
})
export class PaginatorComponent {
  currentPage      = input<number>(1);
  pageSize         = input<number>(10);
  total            = input<number>(0);
  pageSizeOptions  = input<number[]>([10, 25, 50, 100]);
  /** Always render even when there is only 1 page (e.g. to show count + size picker). */
  showAlways       = input<boolean>(false);

  pageChange       = output<number>();
  pageSizeChange   = output<number>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  rangeStart = computed(() => this.total() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
  rangeEnd   = computed(() => Math.min(this.currentPage() * this.pageSize(), this.total()));

  /** Generates a page-number array with ellipsis (-1) markers for large page counts. */
  visiblePages = computed<number[]>(() => {
    const total   = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: number[] = [1];
    if (current > 3) pages.push(-1);

    const start = Math.max(2, current - 1);
    const end   = Math.min(total - 1, current + 1);
    for (let p = start; p <= end; p++) pages.push(p);

    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  });

  goTo(page: number) {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    if (clamped !== this.currentPage()) this.pageChange.emit(clamped);
  }

  onSizeChange(e: Event) {
    const size = Number((e.target as HTMLSelectElement).value);
    this.pageSizeChange.emit(size);
  }
}
