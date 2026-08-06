import { Component, ElementRef, viewChild, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { ConfettiService } from '../../../core/services/confetti.service';

@Component({
  selector: 'app-celebration-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './celebration-modal.html',
})
export class CelebrationModalComponent {
  confettiService = inject(ConfettiService);

  bannerRef = viewChild<ElementRef<HTMLElement>>('banner');

  constructor() {
    effect(() => {
      const celebration = this.confettiService.currentCelebration();
      if (celebration) {
        setTimeout(() => {
          const el = this.bannerRef()?.nativeElement;
          if (el) {
            gsap.fromTo(
              el,
              { scale: 0.7, opacity: 0, y: -40 },
              { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.8)' },
            );
          }
        }, 0);
      }
    });
  }

  onDismiss() {
    const el = this.bannerRef()?.nativeElement;
    if (el) {
      gsap.to(el, {
        scale: 0.8,
        opacity: 0,
        y: -30,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => this.confettiService.dismissCelebration(),
      });
    } else {
      this.confettiService.dismissCelebration();
    }
  }
}
