import { Pipe, PipeTransform } from '@angular/core';
import { getSportBadgeClass } from '../../../shared';

@Pipe({
  name: 'sportBadgeClass',
  standalone: true,
  pure: true,
})
export class SportBadgeClassPipe implements PipeTransform {
  transform(sportCode: string | null | undefined): string {
    return getSportBadgeClass(sportCode ?? undefined);
  }
}
