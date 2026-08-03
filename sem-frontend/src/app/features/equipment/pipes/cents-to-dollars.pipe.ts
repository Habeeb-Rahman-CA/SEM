import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'centsToDollars', standalone: true })
export class CentsToDollarsPipe implements PipeTransform {
  transform(cents: number | null | undefined, fallback = 'N/A'): string {
    if (cents === null || cents === undefined) return fallback;
    return '$' + (cents / 100).toFixed(2);
  }
}
