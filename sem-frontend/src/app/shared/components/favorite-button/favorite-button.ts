import { Component, ChangeDetectionStrategy, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavoriteEntityType, FavoritesService } from '../../../core/services/favorites.service';

@Component({
  selector: 'app-favorite-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './favorite-button.html',
})
export class FavoriteButtonComponent {
  private favoritesService = inject(FavoritesService);

  workspaceId = input.required<string>();
  entityType = input.required<FavoriteEntityType>();
  entityId = input.required<string>();
  title = input.required<string>();
  subtitle = input<string>();
  url = input.required<string>();
  icon = input<string>();

  isFav = computed(() => {
    return this.favoritesService.isFavorite(this.entityType(), this.entityId());
  });

  defaultIcon = computed(() => {
    if (this.icon()) return this.icon()!;
    switch (this.entityType()) {
      case 'dashboard':
        return 'fi fi-rr-dashboard';
      case 'team':
        return 'fi fi-rr-users-alt';
      case 'event':
        return 'fi fi-rr-calendar';
      case 'report':
        return 'fi fi-rr-chart-histogram';
      case 'competition':
        return 'fi fi-rr-trophy';
      case 'form':
        return 'fi fi-rr-document';
      case 'workflow':
        return 'fi fi-rr-workflow';
      default:
        return 'fi fi-rr-star';
    }
  });

  toggle(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    this.favoritesService
      .toggleFavorite(this.workspaceId(), {
        entityType: this.entityType(),
        entityId: this.entityId(),
        title: this.title(),
        subtitle: this.subtitle(),
        url: this.url(),
        icon: this.defaultIcon(),
      })
      .subscribe();
  }
}
