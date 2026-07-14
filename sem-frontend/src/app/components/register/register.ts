import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
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
      }
    });
  }
}
