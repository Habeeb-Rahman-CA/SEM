import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'goalLabel',
  standalone: true,
})
export class GoalLabelPipe implements PipeTransform {
  transform(goalType: string | undefined | null): string {
    switch (goalType) {
      case 'own_goal':
        return 'OWN GOAL';
      case 'penalty':
        return 'PENALTY GOAL';
      case 'free_kick':
        return 'FREE KICK GOAL';
      default:
        return 'GOAL';
    }
  }
}
