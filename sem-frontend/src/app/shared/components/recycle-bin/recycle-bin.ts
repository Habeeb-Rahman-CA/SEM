import { Component, inject, signal, computed, ElementRef, viewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import gsap from 'gsap';
import { RecycleBinService, TrashItem } from '../../../core/services/recycle-bin.service';
import { EmptyStateComponent } from '../empty-state/empty-state';

@Component({
  selector: 'app-recycle-bin',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  templateUrl: './recycle-bin.html',
})
export class RecycleBinComponent {
  recycleBinService = inject(RecycleBinService);
  drawerRef = viewChild<ElementRef<HTMLElement>>('drawer');

  categoryFilter = signal<string>('all');
  searchQuery = signal<string>('');

  filteredItems = computed(() => {
    const list = this.recycleBinService.trashItems();
    const cat = this.categoryFilter();
    const q = this.searchQuery().toLowerCase().trim();

    return list.filter((item) => {
      const matchesCat = cat === 'all' || item.entityType === cat;
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.entityId.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  });

  constructor() {
    effect(() => {
      const open = this.recycleBinService.isOpen();
      const el = this.drawerRef()?.nativeElement;
      if (el) {
        if (open) {
          gsap.fromTo(el, { x: '100%' }, { x: '0%', duration: 0.3, ease: 'power3.out' });
        }
      }
    });
  }

  close() {
    const el = this.drawerRef()?.nativeElement;
    if (el) {
      gsap.to(el, {
        x: '100%',
        duration: 0.25,
        ease: 'power3.in',
        onComplete: () => this.recycleBinService.closeRecycleBin(),
      });
    } else {
      this.recycleBinService.closeRecycleBin();
    }
  }

  restore(trashId: string) {
    this.recycleBinService.restoreItem(trashId);
  }

  deletePermanently(trashId: string) {
    this.recycleBinService.permanentlyDelete(trashId);
  }

  emptyAll() {
    this.recycleBinService.emptyTrash();
  }

  getTypeIcon(type: TrashItem['entityType']): string {
    switch (type) {
      case 'team':
        return 'fi fi-rr-users-alt text-violet-400';
      case 'player':
        return 'fi fi-rr-user text-amber-400';
      case 'workspace':
        return 'fi fi-rr-folder text-blue-400';
      case 'certificate':
        return 'fi fi-sr-diploma text-yellow-400';
      case 'form':
        return 'fi fi-rr-document text-emerald-400';
      case 'match':
        return 'fi fi-sr-trophy text-rose-400';
      default:
        return 'fi fi-rr-box text-slate-400';
    }
  }
}
