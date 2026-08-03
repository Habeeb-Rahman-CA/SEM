import { Pipe, PipeTransform } from '@angular/core';
import { roleBadgeClass } from '../../../shared';

@Pipe({
  name: 'roleBadgeClass',
  standalone: true,
  pure: true,
})
export class RoleBadgeClassPipe implements PipeTransform {
  transform(slug: string | null | undefined): string {
    return roleBadgeClass(slug ?? '');
  }
}
