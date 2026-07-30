import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuicklinkDirective } from 'ngx-quicklink';
import { AuthService } from '../../auth/services/auth.service';
import { WorkspaceService } from '../../workspaces/services/workspace.service';
import { UiService } from '../../../core/services/ui.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { PhotoCaptureComponent } from '../../../shared/components/photo-capture/photo-capture';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    RouterLink,
    AvatarComponent,
    QuicklinkDirective,
    PhotoCaptureComponent,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent implements OnInit {
  authService = inject(AuthService);
  private workspaceService = inject(WorkspaceService);
  private uiService = inject(UiService);
  private router = inject(Router);

  // Tab State
  activeSubTab = signal<'profile' | 'workspaces' | 'security' | 'stats'>('profile');

  // Load States
  isLoading = signal(true);
  isSavingInfo = signal(false);
  isSavingPassword = signal(false);
  isUploadingAvatar = signal(false);
  isUserDropdownOpen = signal(false);

  // Form Fields
  newUsername = signal('');
  oldPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');

  // Password Visibility toggles
  showOldPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  // Profile Details
  profileDetails = signal<any>(null);

  // Messages
  infoSuccess = signal('');
  infoError = signal('');
  securitySuccess = signal('');
  securityError = signal('');

  ngOnInit() {
    this.loadProfileDetails();
  }

  loadProfileDetails() {
    this.isLoading.set(true);
    this.authService.fetchProfileDetails().subscribe({
      next: (details) => {
        this.profileDetails.set(details);
        this.newUsername.set(details.user.username);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.uiService.error('Failed to load profile details.');
      },
    });
  }

  /** Legacy topbar/dropdown file-input path — kept for the small avatar in the nav. */
  onAvatarSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingAvatar.set(true);
    this.workspaceService.uploadImage(file, 'user').subscribe({
      next: (res) => this.persistAvatarUrl(res.url),
      error: () => {
        this.isUploadingAvatar.set(false);
        this.uiService.error('Image upload failed.');
      },
    });
  }

  /** Called by <app-photo-capture> after Cloudinary upload succeeds. */
  onAvatarUploaded(url: string) {
    this.isUploadingAvatar.set(true);
    this.persistAvatarUrl(url);
  }

  private persistAvatarUrl(url: string) {
    this.authService.updateProfile(undefined, url).subscribe({
      next: (user) => {
        this.isUploadingAvatar.set(false);
        if (this.profileDetails()) {
          this.profileDetails.update((prev) => ({
            ...prev,
            user: { ...prev.user, avatarUrl: user.avatarUrl },
          }));
        }
        this.uiService.success('Profile picture updated successfully!');
      },
      error: () => {
        this.isUploadingAvatar.set(false);
        this.uiService.error('Failed to update avatar.');
      },
    });
  }

  onUpdateInfo() {
    const username = this.newUsername().trim();
    if (!username) return;

    this.isSavingInfo.set(true);
    this.infoSuccess.set('');
    this.infoError.set('');

    this.authService.updateProfile(username).subscribe({
      next: () => {
        this.isSavingInfo.set(false);
        this.infoSuccess.set('Profile details updated successfully!');
        if (this.profileDetails()) {
          this.profileDetails.update((prev) => ({
            ...prev,
            user: { ...prev.user, username },
          }));
        }
      },
      error: (err) => {
        this.isSavingInfo.set(false);
        this.infoError.set(err.error?.message ?? 'Failed to update username.');
      },
    });
  }

  onChangePassword() {
    const oldPass = this.oldPassword();
    const newPass = this.newPassword();
    const confPass = this.confirmPassword();

    if (!oldPass || !newPass || !confPass) return;

    if (newPass !== confPass) {
      this.securityError.set('New passwords do not match.');
      return;
    }

    if (newPass.length < 6) {
      this.securityError.set('Password must be at least 6 characters long.');
      return;
    }

    if (!/^(?=.*[A-Z])(?=.*\d).+$/.test(newPass)) {
      this.securityError.set('Password must contain at least one uppercase letter and one number.');
      return;
    }

    this.isSavingPassword.set(true);
    this.securitySuccess.set('');
    this.securityError.set('');

    this.authService.changePassword(oldPass, newPass).subscribe({
      next: () => {
        this.isSavingPassword.set(false);
        this.securitySuccess.set('Password changed successfully!');
        this.oldPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
      },
      error: (err) => {
        this.isSavingPassword.set(false);
        this.securityError.set(err.error?.message ?? 'Failed to change password.');
      },
    });
  }

  formatOvers(overs: number, balls: number): string {
    const totalOvers = overs + Math.floor(balls / 6);
    const extraBalls = balls % 6;
    return `${totalOvers}.${extraBalls}`;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onSignOut() {
    this.logout();
  }
}
