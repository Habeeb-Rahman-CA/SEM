import { Injectable, inject, signal } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
  active?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class BreadcrumbService {
  private router = inject(Router);

  // Reactive state signal
  breadcrumbs = signal<BreadcrumbItem[]>([]);
  private customOverride = false;

  constructor() {
    this.initRouterListener();
  }

  private initRouterListener() {
    // Re-generate breadcrumbs on route change unless manually overridden by component
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (!this.customOverride) {
          this.generateFromUrl(event.urlAfterRedirects || event.url);
        }
        this.customOverride = false;
      });
  }

  /**
   * Automatically generate breadcrumbs from URL path segments
   * e.g. /workspaces/default-ws/events/summer-cup/matches
   * -> Dashboard > Events > Summer Cup > Matches
   */
  generateFromUrl(url: string) {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const segments = cleanUrl.split('/').filter(Boolean);

    const items: BreadcrumbItem[] = [
      {
        label: 'Dashboard',
        url: '/workspaces/default-ws',
        icon: 'fi fi-rr-apps',
      },
    ];

    let currentPath = '';
    let skipNext = false;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      currentPath += `/${seg}`;

      if (skipNext) {
        skipNext = false;
        continue;
      }

      // Ignore generic prefix segments like 'workspaces' or ID params
      if (seg === 'workspaces') continue;
      if (seg === 'default-ws' || seg.startsWith('ws-') || seg.startsWith('usr-')) {
        continue;
      }

      // Formatting segment title: 'summer-cup' -> 'Summer Cup'
      const label = this.formatSegmentLabel(seg);
      const icon = this.getSegmentIcon(seg);

      items.push({
        label,
        url: currentPath,
        icon,
        active: i === segments.length - 1,
      });
    }

    // Set last item as active
    if (items.length > 0) {
      items[items.length - 1].active = true;
    }

    this.breadcrumbs.set(items);
  }

  /**
   * Set custom dynamic breadcrumbs (e.g. for nested sub-pages like Event > Summer Cup > Matches)
   */
  setBreadcrumbs(items: BreadcrumbItem[]) {
    this.customOverride = true;
    const formattedItems = [
      {
        label: 'Dashboard',
        url: '/workspaces/default-ws',
        icon: 'fi fi-rr-apps',
      },
      ...items,
    ];

    if (formattedItems.length > 0) {
      formattedItems[formattedItems.length - 1].active = true;
    }

    this.breadcrumbs.set(formattedItems);
  }

  private formatSegmentLabel(segment: string): string {
    // Pre-defined readable mappings
    const mappings: Record<string, string> = {
      overview: 'Overview',
      events: 'Events',
      teams: 'Teams',
      players: 'Players',
      matches: 'Matches',
      sponsors: 'Sponsors',
      venues: 'Venues',
      finance: 'Finance & Invoices',
      reports: 'Reports',
      governance: 'Governance',
      equipment: 'Equipment',
      medical: 'Medical',
      accreditation: 'Accreditation',
      streaming: 'Live Stream Hub',
      gallery: 'File Center & Media',
    };

    if (mappings[segment.toLowerCase()]) {
      return mappings[segment.toLowerCase()];
    }

    // Convert slug or kebab-case to Title Case: 'summer-cup' -> 'Summer Cup'
    return segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private getSegmentIcon(segment: string): string {
    const icons: Record<string, string> = {
      events: 'fi fi-rr-calendar-star',
      teams: 'fi fi-rr-users-alt',
      players: 'fi fi-rr-user-running',
      matches: 'fi fi-rr-trophy',
      sponsors: 'fi fi-rr-star',
      venues: 'fi fi-rr-marker',
      finance: 'fi fi-rr-file-invoice-dollar',
      reports: 'fi fi-rr-chart-histogram',
      governance: 'fi fi-rr-document-signed',
      equipment: 'fi fi-rr-box-alt',
      gallery: 'fi fi-rr-folder',
    };

    return icons[segment.toLowerCase()] || 'fi fi-rr-angle-small-right';
  }
}
