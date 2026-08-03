import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'matchClock',
  standalone: true,
})
export class MatchClockPipe implements PipeTransform {
  transform(seconds: number | undefined | null): string {
    if (seconds == null || isNaN(seconds)) return '00:00';
    const total = Math.max(0, Math.floor(seconds));
    const mm = Math.floor(total / 60);
    const ss = total % 60;
    const mmStr = mm < 10 ? '0' + mm : '' + mm;
    const ssStr = ss < 10 ? '0' + ss : '' + ss;
    return `${mmStr}:${ssStr}`;
  }
}
