import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'centsToCurrency', standalone: true })
export class CentsToCurrencyPipe implements PipeTransform {
  transform(cents: number | null | undefined, symbol: string = '$'): string {
    const val = Number(cents ?? 0) / 100;
    return `${symbol}${val.toFixed(2)}`;
  }
}
