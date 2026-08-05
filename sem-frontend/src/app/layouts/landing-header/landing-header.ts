import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector';

@Component({
  selector: 'app-landing-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LanguageSelectorComponent],
  templateUrl: './landing-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block relative z-50',
  },
})
export class LandingHeaderComponent {
  private router = inject(Router);

  backUrl = input<string | null>(null);
  isMobileMenuOpen = signal<boolean>(false);

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  navigateToSection(sectionId: string, event: Event) {
    this.closeMobileMenu();
    const currentUrl = this.router.url.split('#')[0];
    if (currentUrl === '/' || currentUrl === '') {
      event.preventDefault();
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      void this.router.navigate(['/'], { fragment: sectionId });
    }
  }
}
