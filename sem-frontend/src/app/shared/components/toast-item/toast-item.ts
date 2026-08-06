import { Component, input, output, ElementRef, viewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { ToastMessage } from '../../../core/services/ui.service';

@Component({
  selector: 'app-toast-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-item.html',
})
export class ToastItemComponent implements AfterViewInit {
  toast = input.required<ToastMessage>();
  dismiss = output<string>();

  checkIconRef = viewChild<ElementRef<HTMLElement>>('checkIcon');
  toastCardRef = viewChild<ElementRef<HTMLElement>>('toastCard');

  ngAfterViewInit() {
    // GSAP Entry Animation for Toast Card
    const card = this.toastCardRef()?.nativeElement;
    if (card) {
      gsap.fromTo(
        card,
        { opacity: 0, y: -20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out' },
      );
    }

    // GSAP Checkmark / Icon Animation
    const icon = this.checkIconRef()?.nativeElement;
    if (icon) {
      gsap.fromTo(
        icon,
        { scale: 0, rotation: -45, opacity: 0 },
        { scale: 1, rotation: 0, opacity: 1, duration: 0.45, ease: 'back.out(2)', delay: 0.05 },
      );
    }
  }

  onDismiss() {
    const card = this.toastCardRef()?.nativeElement;
    if (card) {
      gsap.to(card, {
        opacity: 0,
        x: 40,
        scale: 0.9,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => this.dismiss.emit(this.toast().id),
      });
    } else {
      this.dismiss.emit(this.toast().id);
    }
  }
}
