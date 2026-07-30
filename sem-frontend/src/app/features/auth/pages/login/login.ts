import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuicklinkDirective } from 'ngx-quicklink';
import { AuthService } from '../../services/auth.service';
import { BrandingService } from '../../../branding/services/branding.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, QuicklinkDirective],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private brandingService = inject(BrandingService);

  /** Branding resolved by App.ngOnInit — reactive via signal. */
  branding = this.brandingService.activeBranding;

  isBrandedLogin = computed(() => {
    const b = this.branding();
    return !!(b && b.isEnabled);
  });

  username = signal<string>('');
  password = signal<string>('');
  showPassword = signal<boolean>(false);
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  onSubmit() {
    const user = this.username().trim();
    const pass = this.password().trim();

    if (!user || !pass) {
      this.errorMessage.set('Please fill in all fields.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(user, pass).subscribe({
      next: () => {
        this.isLoading.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else {
          this.router.navigate(['/workspaces']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error(err);
        if (err.status === 401) {
          this.errorMessage.set('Invalid username or password.');
        } else {
          this.errorMessage.set('Could not connect to authentication server.');
        }
      },
    });
  }
}
