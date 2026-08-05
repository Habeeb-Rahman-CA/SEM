import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuicklinkDirective } from 'ngx-quicklink';
import { AuthService } from '../../services/auth.service';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { LanguageSelectorComponent } from '../../../../shared/components/language-selector/language-selector';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, QuicklinkDirective, ModalComponent, LanguageSelectorComponent],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = signal<string>('');
  password = signal<string>('');
  confirmPassword = signal<string>('');
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  // Contact support modal state
  isContactModalOpen = signal<boolean>(false);
  contactEmail = signal<string>('');
  contactTopic = signal<string>('Account Registration Inquiry');
  contactMessage = signal<string>('');
  isSendingContact = signal<boolean>(false);
  contactSuccess = signal<string | null>(null);

  openContactModal(e?: Event) {
    if (e) e.preventDefault();
    this.contactSuccess.set(null);
    if (!this.contactEmail() && this.username().includes('@')) {
      this.contactEmail.set(this.username());
    }
    this.isContactModalOpen.set(true);
  }

  closeContactModal() {
    this.isContactModalOpen.set(false);
    this.contactSuccess.set(null);
  }

  sendContactRequest() {
    if (!this.contactEmail().trim() || !this.contactMessage().trim()) return;

    this.isSendingContact.set(true);
    setTimeout(() => {
      this.isSendingContact.set(false);
      const ticketId = Math.floor(100000 + Math.random() * 900000);
      this.contactSuccess.set(
        `Ticket #${ticketId} created! Our support team has received your request and will follow up at ${this.contactEmail()} within 2 hours.`,
      );
      this.contactMessage.set('');
    }, 900);
  }

  // Terms and Privacy modal state
  isTermsModalOpen = signal<boolean>(false);
  activeTermsTab = signal<'terms' | 'privacy'>('terms');

  openTermsModal(tab: 'terms' | 'privacy' = 'terms', e?: Event) {
    if (e) e.preventDefault();
    this.activeTermsTab.set(tab);
    this.isTermsModalOpen.set(true);
  }

  closeTermsModal() {
    this.isTermsModalOpen.set(false);
  }

  onSubmit() {
    const user = this.username().trim();
    const pass = this.password().trim();
    const confirmPass = this.confirmPassword().trim();

    if (!user || !pass || !confirmPass) {
      this.errorMessage.set('Please fill in all fields.');
      return;
    }

    if (pass.length < 6) {
      this.errorMessage.set('Password must be at least 6 characters long.');
      return;
    }

    const hasUppercase = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    if (!hasUppercase || !hasNumber) {
      this.errorMessage.set('Password must contain at least one uppercase letter and one number.');
      return;
    }

    if (pass !== confirmPass) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.register(user, pass).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error(err);
        if (err.status === 409) {
          this.errorMessage.set('Username is already taken.');
        } else if (err.error?.message) {
          this.errorMessage.set(err.error.message);
        } else {
          this.errorMessage.set('An error occurred during registration.');
        }
      },
    });
  }
}
