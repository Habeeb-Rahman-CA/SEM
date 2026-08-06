import { Component, signal, computed, inject, ElementRef, viewChild, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import gsap from 'gsap';
import {
  ActivityFeedService,
  ActivityCategory,
  ActivityItem,
} from '../../../core/services/activity-feed.service';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './activity-feed.html',
})
export class ActivityFeedComponent {
  activityService = inject(ActivityFeedService);

  isOpen = signal<boolean>(false);
  activeCategory = signal<ActivityCategory | 'all'>('all');

  drawerRef = viewChild<ElementRef<HTMLElement>>('drawer');

  filteredActivities = computed<ActivityItem[]>(() => {
    const cat = this.activeCategory();
    const list = this.activityService.activitiesSignal();
    if (cat === 'all') return list;
    return list.filter((a) => a.category === cat);
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        setTimeout(() => {
          const el = this.drawerRef()?.nativeElement;
          if (el) {
            gsap.fromTo(
              el,
              { x: '100%', opacity: 0 },
              { x: '0%', opacity: 1, duration: 0.4, ease: 'power3.out' },
            );
          }
        }, 0);
      }
    });
  }

  toggleFeed() {
    if (this.isOpen()) {
      this.closeFeed();
    } else {
      this.isOpen.set(true);
    }
  }

  closeFeed() {
    const el = this.drawerRef()?.nativeElement;
    if (el) {
      gsap.to(el, {
        x: '100%',
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => this.isOpen.set(false),
      });
    } else {
      this.isOpen.set(false);
    }
  }

  setCategory(cat: ActivityCategory | 'all') {
    this.activeCategory.set(cat);
  }

  clearFeed() {
    this.activityService.clearActivities();
  }
}
