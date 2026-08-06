import { Injectable, signal } from '@angular/core';
import confetti from 'canvas-confetti';

export type CelebrationMilestone =
  | 'tournament_created'
  | 'registration_completed'
  | 'championship_won'
  | 'match_victory'
  | 'certificate_issued'
  | 'first_workspace_created'
  | 'squad_filled'
  | 'hat_trick'
  | 'clean_sheet'
  | 'mvp_awarded'
  | 'sponsor_unlocked'
  | 'file_center_synced'
  | 'workflow_automated'
  | 'streak_unlocked'
  | 'milestone_unlocked';

export interface MilestoneCelebration {
  id: string;
  type: CelebrationMilestone;
  title: string;
  subtitle: string;
  badge: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConfettiService {
  currentCelebration = signal<MilestoneCelebration | null>(null);

  /**
   * Universal Milestone Trigger
   */
  celebrate(type: CelebrationMilestone, customTitle?: string, customSubtitle?: string) {
    switch (type) {
      case 'tournament_created':
        this.fireSideCannons();
        this.showCelebrationBanner(
          type,
          customTitle || 'Tournament Created!',
          customSubtitle || 'Your new tournament is ready to receive team registrations.',
          'fi-rr-trophy',
        );
        break;

      case 'registration_completed':
        this.fireCenterPop();
        this.showCelebrationBanner(
          type,
          customTitle || 'Registration Completed!',
          customSubtitle || 'Your entry has been officially registered and verified.',
          'fi-rr-check-circle',
        );
        break;

      case 'championship_won':
        this.fireGoldenRain();
        this.showCelebrationBanner(
          type,
          customTitle || 'Championship Won!',
          customSubtitle || 'Congratulations! Winner of the grand championship trophy!',
          'fi-rr-crown',
        );
        break;

      case 'match_victory':
        this.fireFireworks();
        this.showCelebrationBanner(
          type,
          customTitle || 'Match Victory!',
          customSubtitle || 'Outstanding performance! Match result submitted & logged.',
          'fi-rr-star',
        );
        break;

      case 'certificate_issued':
        this.fireSparkles();
        this.showCelebrationBanner(
          type,
          customTitle || 'Certificate Issued!',
          customSubtitle || 'Official achievement certificate generated successfully.',
          'fi-rr-diploma',
        );
        break;

      case 'first_workspace_created':
        this.fireGoldenRain();
        this.showCelebrationBanner(
          type,
          customTitle || 'Workspace Pioneer!',
          customSubtitle || 'Created your first workspace on Taisen! Let the games begin.',
          'fi-rr-layers',
        );
        break;

      case 'squad_filled':
        this.fireSideCannons();
        this.showCelebrationBanner(
          type,
          customTitle || 'Full Squad Assembled!',
          customSubtitle || 'Your team roster is fully stacked and ready for competition.',
          'fi-rr-users-alt',
        );
        break;

      case 'hat_trick':
        this.fireFireworks();
        this.showCelebrationBanner(
          type,
          customTitle || 'Hat-Trick Hero!',
          customSubtitle || 'Unbelievable performance! 3+ goal/wicket milestone recorded.',
          'fi-rr-flame',
        );
        break;

      case 'clean_sheet':
        this.fireCenterPop();
        this.showCelebrationBanner(
          type,
          customTitle || 'Wall of Steel!',
          customSubtitle || 'Zero goals allowed — clean sheet recorded for the team.',
          'fi-rr-shield-check',
        );
        break;

      case 'mvp_awarded':
        this.fireSparkles();
        this.showCelebrationBanner(
          type,
          customTitle || 'MVP Awarded!',
          customSubtitle || 'Selected as the most valuable player of the tournament match.',
          'fi-rr-medal',
        );
        break;

      case 'sponsor_unlocked':
        this.fireSideCannons();
        this.showCelebrationBanner(
          type,
          customTitle || 'Sponsorship Unlocked!',
          customSubtitle || 'New brand partnership successfully partnered with the event.',
          'fi-rr-gem',
        );
        break;

      case 'file_center_synced':
        this.fireCenterPop();
        this.showCelebrationBanner(
          type,
          customTitle || 'Master Archivist!',
          customSubtitle || 'All press kits, rules & media assets uploaded to Repository.',
          'fi-rr-folder-download',
        );
        break;

      case 'workflow_automated':
        this.fireSparkles();
        this.showCelebrationBanner(
          type,
          customTitle || 'Automation Master!',
          customSubtitle || 'Custom dynamic form and automated workflow published.',
          'fi-rr-magic-wand',
        );
        break;

      case 'streak_unlocked':
        this.fireGoldenRain();
        this.showCelebrationBanner(
          type,
          customTitle || 'Unstoppable Streak!',
          customSubtitle || 'Maintained a flawless winning streak across tournament fixtures.',
          'fi-rr-bolt',
        );
        break;

      default:
        this.fireCenterPop();
        this.showCelebrationBanner(
          type,
          customTitle || 'Milestone Unlocked!',
          customSubtitle || 'Great job reaching a new platform achievement!',
          'fi-rr-sparkles',
        );
        break;
    }
  }

  // ─── CONFETTI PRESETS ───

  private fireSideCannons() {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#7c3aed', '#fbbf24', '#38bdf8', '#34d399', '#f43f5e'],
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }

  private fireCenterPop() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#a855f7', '#ec4899', '#3b82f6', '#10b981'],
    });
  }

  private fireGoldenRain() {
    const end = Date.now() + 3 * 1000;
    const colors = ['#fbbf24', '#f59e0b', '#d97706', '#ffffff', '#7c3aed'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }

  private fireFireworks() {
    const duration = 2.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 99999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }

  private fireSparkles() {
    confetti({
      shapes: ['star'],
      particleCount: 80,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#fbbf24', '#f472b6', '#a78bfa', '#38bdf8'],
    });
  }

  private showCelebrationBanner(
    type: CelebrationMilestone,
    title: string,
    subtitle: string,
    badge: string,
  ) {
    const celebration: MilestoneCelebration = {
      id: 'cel_' + Date.now(),
      type,
      title,
      subtitle,
      badge,
    };
    this.currentCelebration.set(celebration);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      if (this.currentCelebration()?.id === celebration.id) {
        this.currentCelebration.set(null);
      }
    }, 5000);
  }

  dismissCelebration() {
    this.currentCelebration.set(null);
  }
}
