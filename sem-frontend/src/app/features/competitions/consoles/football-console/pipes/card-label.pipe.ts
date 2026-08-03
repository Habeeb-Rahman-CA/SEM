import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cardLabel',
  standalone: true,
})
export class CardLabelPipe implements PipeTransform {
  transform(cardType: string | undefined | null): string {
    switch (cardType) {
      case 'yellow':
        return 'Yellow Card';
      case 'second_yellow':
        return '2nd Yellow (Red)';
      default:
        return 'Red Card';
    }
  }
}
