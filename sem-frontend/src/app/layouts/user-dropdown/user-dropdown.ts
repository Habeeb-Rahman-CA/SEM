import { Component, input, model, output, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuicklinkDirective } from 'ngx-quicklink';
import { AvatarComponent } from '../../shared/components/avatar/avatar';

@Component({
  selector: 'app-user-dropdown',
  standalone: true,
  imports: [RouterLink, AvatarComponent, QuicklinkDirective],
  templateUrl: './user-dropdown.html',
})
export class UserDropdownComponent {
  isUserDropdownOpen = model<boolean>(false);
  currentUser = input.required<any>();
  userRoleSlug = input<string>('viewer');
  isUploadingAvatar = input<boolean>(false);

  signOut = output<void>();
  avatarUpload = output<Event>();

  onAvatarUpload(event: Event) {
    this.avatarUpload.emit(event);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.isUserDropdownOpen() && event.key === 'Escape') {
      this.isUserDropdownOpen.set(false);
      event.preventDefault();
    }
  }
}
