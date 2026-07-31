import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { OverlayData, StreamSession, StreamingService } from '../services/streaming.service';

@Component({
  selector: 'app-public-spectator',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-4">
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <a routerLink="/" class="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <i class="fi fi-rr-angle-left"></i>
            Back
          </a>
          <a routerLink="/live" class="text-xs text-violet-400 hover:text-violet-300">
            Browse all live streams →
          </a>
        </div>

        @if (isLoading()) {
          <div class="text-center text-slate-400 text-sm py-16">Loading stream…</div>
        } @else if (error()) {
          <div class="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {{ error() }}
          </div>
        } @else if (session(); as s) {
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Player -->
            <div class="lg:col-span-2 space-y-4">
              @if (safeEmbedUrl(); as embed) {
                <div
                  class="aspect-video bg-black rounded-xl overflow-hidden border border-white/10"
                >
                  <iframe
                    [src]="embed"
                    class="w-full h-full"
                    frameborder="0"
                    allowfullscreen
                  ></iframe>
                </div>
              } @else {
                <div
                  class="aspect-video bg-slate-900 rounded-xl border border-white/10 flex items-center justify-center"
                >
                  <a
                    [href]="s.streamUrl"
                    target="_blank"
                    class="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl no-underline"
                  >
                    Watch on {{ s.platform }} →
                  </a>
                </div>
              }
              <div class="flex items-center justify-between">
                <div>
                  <h1 class="text-2xl font-black">{{ s.title }}</h1>
                  <div class="text-xs text-slate-400 mt-1">
                    @if (s.status === 'live') {
                      <span class="text-red-400 font-bold">
                        <span
                          class="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"
                        ></span>
                        LIVE
                      </span>
                      · {{ s.viewerCount }} watching
                    } @else if (s.status === 'scheduled') {
                      <span class="text-sky-400 font-bold">Scheduled</span>
                      @if (s.scheduledStart) {
                        for {{ s.scheduledStart | date: 'medium' }}
                      }
                    } @else {
                      <span class="text-slate-400 font-bold">{{ s.status | uppercase }}</span>
                    }
                  </div>
                </div>
              </div>
              @if (s.description) {
                <p class="text-sm text-slate-300 leading-relaxed">{{ s.description }}</p>
              }
            </div>

            <!-- Sidebar: overlay + highlights -->
            <div class="space-y-4">
              <!-- Live score overlay -->
              @if (overlay()?.match; as match) {
                <div
                  class="p-4 rounded-xl bg-slate-900 border-2"
                  [style.border-color]="overlay()?.overlayColor || '#8b5cf6'"
                >
                  <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-2">
                    Live Score
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="text-center flex-1 min-w-0">
                      @if (match.homeTeam?.logoUrl) {
                        <img
                          [src]="match.homeTeam?.logoUrl"
                          [alt]="match.homeTeam?.name"
                          class="w-10 h-10 object-contain mx-auto mb-1"
                        />
                      }
                      <div class="text-xs text-slate-300 truncate">
                        {{ match.homeTeam?.name || '—' }}
                      </div>
                      <div class="text-4xl font-black">{{ match.homeScore }}</div>
                    </div>
                    <div class="text-slate-600 text-xl font-black">—</div>
                    <div class="text-center flex-1 min-w-0">
                      @if (match.awayTeam?.logoUrl) {
                        <img
                          [src]="match.awayTeam?.logoUrl"
                          [alt]="match.awayTeam?.name"
                          class="w-10 h-10 object-contain mx-auto mb-1"
                        />
                      }
                      <div class="text-xs text-slate-300 truncate">
                        {{ match.awayTeam?.name || '—' }}
                      </div>
                      <div class="text-4xl font-black">{{ match.awayScore }}</div>
                    </div>
                  </div>
                  @if (match.competition) {
                    <div class="text-[10px] text-slate-500 text-center mt-3">
                      {{ match.competition.name }}
                      @if (match.competition.sport) {
                        · {{ match.competition.sport.name }}
                      }
                    </div>
                  }
                  <div class="text-[10px] text-slate-500 text-center mt-1">
                    Status: {{ match.status }}
                  </div>
                </div>
              }

              <!-- Highlights -->
              @if (s.highlights && s.highlights.length > 0) {
                <div class="p-4 bg-slate-900 rounded-xl border border-white/5">
                  <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-3">
                    Highlights ({{ s.highlights.length }})
                  </div>
                  <div class="space-y-2 max-h-96 overflow-y-auto">
                    @for (h of s.highlights; track h.id) {
                      <div
                        class="p-2 bg-slate-950 border border-white/5 rounded flex items-start gap-2"
                      >
                        <div class="text-[10px] font-mono text-violet-400 mt-0.5">
                          {{ formatTs(h.timestampSec) }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <span
                              class="px-1.5 py-0.5 text-[9px] font-bold rounded bg-violet-500/20 text-violet-400 uppercase"
                            >
                              {{ h.clipType }}
                            </span>
                            <span class="text-xs text-white truncate">{{ h.title }}</span>
                          </div>
                          @if (h.description) {
                            <div class="text-[10px] text-slate-400 mt-0.5">
                              {{ h.description }}
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="text-center text-slate-500 text-sm py-16">Stream not found.</div>
        }
      </div>
    </div>
  `,
})
export class PublicSpectatorComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private service = inject(StreamingService);
  private sanitizer = inject(DomSanitizer);

  session = signal<StreamSession | null>(null);
  overlay = signal<OverlayData | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  private pollTimer: any = null;
  private sessionId: string | null = null;

  ngOnInit() {
    this.sessionId = this.route.snapshot.paramMap.get('id');
    if (!this.sessionId) {
      this.error.set('Missing session id');
      this.isLoading.set(false);
      return;
    }

    this.loadSession();
    // Poll overlay every 5s so score updates without full reload.
    this.pollTimer = setInterval(() => this.pollOverlay(), 5000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  loadSession() {
    if (!this.sessionId) return;
    this.service.getPublicSession(this.sessionId).subscribe({
      next: (s) => {
        this.session.set(s);
        this.isLoading.set(false);
        this.pollOverlay();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load stream');
        this.isLoading.set(false);
      },
    });
  }

  pollOverlay() {
    if (!this.sessionId) return;
    this.service.getOverlay(this.sessionId).subscribe({
      next: (o) => this.overlay.set(o),
    });
  }

  safeEmbedUrl(): SafeResourceUrl | null {
    const url = this.session()?.embedUrl;
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  formatTs(seconds: number): string {
    return this.service.formatTimestamp(seconds);
  }
}
