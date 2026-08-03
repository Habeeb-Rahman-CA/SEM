import { Injectable } from '@angular/core';
import type { Equipment } from './equipment.service';

@Injectable({ providedIn: 'root' })
export class EquipmentFilterService {
  filter(list: readonly Equipment[], query: string, category: string, status: string): Equipment[] {
    const q = query.toLowerCase().trim();
    return list.filter((e) => {
      if (q && !(e.name.toLowerCase().includes(q) || e.sku?.toLowerCase().includes(q))) {
        return false;
      }
      if (category && e.category !== category) return false;
      if (status && e.status !== status) return false;
      return true;
    });
  }

  distinctCategories(list: readonly Equipment[]): string[] {
    const set = new Set<string>();
    for (const e of list) {
      if (e.category) set.add(e.category);
    }
    return Array.from(set);
  }
}
