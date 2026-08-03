import { Pipe, PipeTransform } from '@angular/core';
import { formatMatchStatusDetail } from '../../../shared';

@Pipe({
  name: 'matchStatusDetail',
  standalone: true,
  pure: false,
})
export class MatchStatusDetailPipe implements PipeTransform {
  transform(match: unknown): string {
    return formatMatchStatusDetail(match);
  }
}
