import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';

interface FeatureCard {
  icon: string;
  title: string;
  copy: string;
}

interface Step {
  label: string;
  title: string;
  copy: string;
}

interface Sport {
  code: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('hero', { static: false }) hero?: ElementRef<HTMLElement>;
  @ViewChild('root', { static: false }) root?: ElementRef<HTMLElement>;

  readonly stats: Array<{ value: string; label: string }> = [
    { value: '4+', label: 'Sports out of the box' },
    { value: 'Real-time', label: 'Live scoring & sync' },
    { value: 'Offline-first', label: 'Score without WiFi' },
    { value: 'Mobile-ready', label: 'iOS, Android & web' },
  ];

  readonly features: FeatureCard[] = [
    {
      icon: 'fi-rr-stopwatch',
      title: 'Live scoring consoles',
      copy: 'Sport-aware referee consoles for football, cricket and badminton. Time it, tap it, publish — spectators see the score change instantly.',
    },
    {
      icon: 'fi-rr-diagram-project',
      title: 'Tournaments & brackets',
      copy: 'Design events with multiple competitions, stages, groups, knockouts, and double-elimination brackets. Standings recalculate as matches complete.',
    },
    {
      icon: 'fi-rr-cloud-share',
      title: 'Offline-first sync',
      copy: 'Referees keep scoring even when the venue WiFi drops. Every update is queued locally and reconciled with conflict prompts the moment you reconnect.',
    },
    {
      icon: 'fi-rr-qrcode',
      title: 'QR check-in & accreditation',
      copy: 'Scan a participant badge, event pass, or team code to verify registration at the gate. Works with the built-in camera on iOS and Android.',
    },
    {
      icon: 'fi-rr-camera',
      title: 'Camera-first evidence',
      copy: 'Capture player photos, event banners, venue images, and match evidence straight from the device camera — auto-uploaded to your workspace CDN.',
    },
    {
      icon: 'fi-rr-users-alt',
      title: 'Workspaces & roles',
      copy: 'Organise leagues by workspace, invite officials with fine-grained roles (owner, admin, referee, viewer), and delegate scoring without giving away the keys.',
    },
    {
      icon: 'fi-rr-chart-pie',
      title: 'Analytics & leaderboards',
      copy: 'Top scorers, MVP awards, player ratings, and competition-level breakdowns — sortable, exportable, and pushed to the public event page.',
    },
    {
      icon: 'fi-rr-bell',
      title: 'Push notifications',
      copy: 'Match starts, score updates, lineup changes, and admin invites are delivered natively to teammates and spectators who follow your workspace.',
    },
  ];

  readonly steps: Step[] = [
    {
      label: '01',
      title: 'Create your workspace',
      copy: 'Spin up a workspace for your league, club, or one-off tournament. Invite officials with the exact role they need.',
    },
    {
      label: '02',
      title: 'Register teams & players',
      copy: 'Add teams, upload logos, register players with jersey numbers and profile photos captured from the camera.',
    },
    {
      label: '03',
      title: 'Design the event',
      copy: 'Pick your sports, configure stages and formats, schedule fixtures against venues, and publish a public page.',
    },
    {
      label: '04',
      title: 'Go live',
      copy: 'Referees open the mobile console and score in real time. Standings, stats, and the public page update as it happens.',
    },
  ];

  readonly sports: Sport[] = [
    { code: 'football', label: 'Football', icon: 'fi-rr-football' },
    { code: 'cricket', label: 'Cricket', icon: 'fi-rr-cricket' },
    { code: 'badminton', label: 'Badminton', icon: 'fi-rr-play' },
    { code: 'custom', label: 'Custom sports', icon: 'fi-rr-trophy' },
  ];

  ngOnInit() {
    // Signed-in users skip the marketing page and go straight into the app.
    if (this.auth.isAuthenticated()) {
      void this.router.navigate(['/workspaces']);
    }
  }

  async ngAfterViewInit() {
    if (this.auth.isAuthenticated()) return; // will already have navigated away
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Dynamic import keeps GSAP out of the initial vendor bundle for the rest
    // of the app — only landing visitors pay the ~40 kB cost.
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]);
    gsap.registerPlugin(ScrollTrigger);

    const rootEl = this.root?.nativeElement;
    if (!rootEl) return;

    const ctx = gsap.context(() => {
      // Hero opening timeline — cascades headline chunks in from below.
      gsap
        .timeline({ defaults: { ease: 'power3.out', duration: 0.9 } })
        .from('[data-hero-eyebrow]', { y: 20, opacity: 0, duration: 0.6 })
        .from('[data-hero-title] > span', { y: 40, opacity: 0, stagger: 0.12 }, '-=0.25')
        .from('[data-hero-sub]', { y: 20, opacity: 0, duration: 0.7 }, '-=0.4')
        .from('[data-hero-cta] > *', { y: 20, opacity: 0, stagger: 0.12 }, '-=0.4')
        .from('[data-hero-mockup]', { y: 50, opacity: 0, scale: 0.97, duration: 1.1 }, '-=0.5');

      // Section-level reveal — everything with [data-reveal] fades in on scroll.
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      // Staggered grid reveal — used on feature + step + sport grids.
      gsap.utils.toArray<HTMLElement>('[data-reveal-stagger]').forEach((grid) => {
        gsap.from(grid.children, {
          y: 30,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: {
            trigger: grid,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      });
    }, rootEl);

    // GSAP context handles unwinding everything (timelines + ScrollTriggers).
    this.destroyRef.onDestroy(() => ctx.revert());
  }
}
