import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Match, Player } from '../../../../../workspaces/services/workspace.service';
import { EventTypeLabelPipe } from '../../pipes/event-type-label.pipe';
import { GoalLabelPipe } from '../../pipes/goal-label.pipe';
import { CardLabelPipe } from '../../pipes/card-label.pipe';
import { PlayerNamePipe } from '../../pipes/player-name.pipe';
import { FilteredFootballEvent, FootballEvent } from '../../models/football-console.interface';

@Component({
  selector: 'app-football-timeline-panel',
  standalone: true,
  imports: [DatePipe, EventTypeLabelPipe, GoalLabelPipe, CardLabelPipe, PlayerNamePipe],
  templateUrl: './timeline-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelinePanelComponent {
  match = input.required<Match>();
  players = input.required<Player[]>();
  canScore = input<boolean>(false);

  editEvent = output<FilteredFootballEvent>();
  deleteEvent = output<number>();

  filterType = signal<string>('all');
  filterPlayer = signal<string>('all');
  showPanel = signal<boolean>(false);

  events = computed<FootballEvent[]>(() => this.match()?.liveData?.events ?? []);

  eventTypes = computed<string[]>(() => {
    return Array.from(new Set(this.events().map((e) => e.type)));
  });

  playerIds = computed<string[]>(() => {
    const ids = new Set<string>();
    for (const e of this.events()) {
      if (e.playerUserId) ids.add(e.playerUserId);
      if (e.playerOutId) ids.add(e.playerOutId);
      if (e.playerInId) ids.add(e.playerInId);
      if (e.assistPlayerUserId) ids.add(e.assistPlayerUserId);
    }
    return Array.from(ids);
  });

  filteredEvents = computed<FilteredFootballEvent[]>(() => {
    const typeFilter = this.filterType();
    const playerFilter = this.filterPlayer();
    return this.events()
      .map((e, originalIndex) => ({ ...e, _originalIndex: originalIndex }) as FilteredFootballEvent)
      .filter((e) => {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false;
        if (playerFilter !== 'all') {
          const matchesPlayer =
            e.playerUserId === playerFilter ||
            e.playerOutId === playerFilter ||
            e.playerInId === playerFilter ||
            e.assistPlayerUserId === playerFilter;
          if (!matchesPlayer) return false;
        }
        return true;
      })
      .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  });

  clearFilters() {
    this.filterType.set('all');
    this.filterPlayer.set('all');
  }
}
