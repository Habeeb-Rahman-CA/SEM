import { Pipe, PipeTransform } from '@angular/core';

const LABELS: Record<string, string> = {
  goal: 'Goal',
  card: 'Card',
  substitution: 'Substitution',
  offside: 'Offside',
  foul: 'Foul',
  free_kick: 'Free Kick',
  corner_kick: 'Corner Kick',
  throw_in: 'Throw In',
  goal_kick: 'Goal Kick',
  injury: 'Injury',
  penalty: 'Penalty',
  shootout_penalty: 'Shootout Penalty',
};

@Pipe({
  name: 'eventTypeLabel',
  standalone: true,
})
export class EventTypeLabelPipe implements PipeTransform {
  transform(type: string | undefined | null): string {
    if (!type) return '';
    return LABELS[type] ?? type;
  }
}
