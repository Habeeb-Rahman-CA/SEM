import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'humanizeAction', standalone: true })
export class HumanizeActionPipe implements PipeTransform {
  transform(action: string | null | undefined): string {
    if (!action) return '';
    return action.replace(/_/g, ' ');
  }
}
