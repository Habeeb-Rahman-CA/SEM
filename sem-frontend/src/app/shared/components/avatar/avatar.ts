import { Component, input } from '@angular/core';
import { InitialsPipe } from '../../pipes/initials.pipe';
import { AvatarColorPipe } from '../../pipes/avatar-color.pipe';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [InitialsPipe, AvatarColorPipe],
  template: `
    <div
      [class]="
        customClass() +
        ' overflow-hidden flex items-center justify-center flex-shrink-0 border border-white/10'
      "
      [style.background]="logoUrl() ? 'transparent' : (name() | avatarColor)"
    >
      @if (logoUrl()) {
        <img
          [src]="logoUrl()"
          [alt]="name() || 'Avatar'"
          loading="lazy"
          decoding="async"
          class="w-full h-full object-cover"
        />
      } @else {
        <span [class]="textClass() || 'text-[11px] font-bold text-white'">
          {{ name() | initials }}
        </span>
      }
    </div>
  `,
})
export class AvatarComponent {
  name = input<string | null | undefined>(null);
  logoUrl = input<string | null | undefined>(null);
  customClass = input<string>('w-10 h-10 rounded-xl bg-slate-950');
  textClass = input<string | null>(null);
}
