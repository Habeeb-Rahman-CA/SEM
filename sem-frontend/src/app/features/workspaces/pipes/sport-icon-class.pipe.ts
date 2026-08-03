import { Pipe, PipeTransform } from '@angular/core';
import { getSportIconClass } from '../../../shared';

@Pipe({
  name: 'sportIconClass',
  standalone: true,
  pure: true,
})
export class SportIconClassPipe implements PipeTransform {
  transform(sportCode: string | null | undefined): string {
    return getSportIconClass(sportCode ?? undefined);
  }
}
