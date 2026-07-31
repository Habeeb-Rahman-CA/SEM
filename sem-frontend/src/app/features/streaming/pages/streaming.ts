import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  ClipType,
  StreamHighlight,
  StreamPlatform,
  StreamSession,
  StreamStatus,
  StreamSummary,
  StreamingService,
} from '../services/streaming.service';

type StreamTab = 'sessions' | 'highlights' | 'overlay-help';

@Component({
  selector: 'app-streaming',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './streaming.html',
})
export class StreamingComponent implements OnInit {
  workspaceId = input.required<string>();

  private service = inject(StreamingService);
  private sanitizer = inject(DomSanitizer);

  // Data
  summary = signal<StreamSummary | null>(null);
  sessions = signal<StreamSession[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  currentTab = signal<StreamTab>('sessions');
  statusFilter = signal<StreamStatus | ''>('');
  selectedSessionId = signal<string | null>(null);

  // Modals
  isSessionModalOpen = signal(false);
  isHighlightModalOpen = signal(false);

  editingSessionId = signal<string | null>(null);
  sessionForm = signal({
    title: '',
    description: '',
    platform: 'youtube' as StreamPlatform,
    streamUrl: '',
    embedUrl: '',
    thumbnailUrl: '',
    matchId: '',
    scheduledStart: '',
    showScoreOverlay: true,
    showStats: true,
    showTeamNames: true,
    isPublic: true,
    overlayColor: '#8b5cf6',
  });

  editingHighlightId = signal<string | null>(null);
  highlightSessionId = signal<string | null>(null);
  highlightForm = signal({
    title: '',
    description: '',
    timestampSec: 0,
    durationSec: null as number | null,
    clipUrl: '',
    thumbnailUrl: '',
    tagsInput: '',
    clipType: 'moment' as ClipType,
  });

  allPlatforms: StreamPlatform[] = ['youtube', 'twitch', 'facebook', 'vimeo', 'custom'];
  allClipTypes: ClipType[] = ['moment', 'goal', 'save', 'card', 'wicket', 'try', 'other'];

  filteredSessions = computed(() => {
    const s = this.statusFilter();
    return s ? this.sessions().filter((x) => x.status === s) : this.sessions();
  });

  selectedSession = computed<StreamSession | null>(() => {
    const id = this.selectedSessionId();
    if (!id) return null;
    return this.sessions().find((s) => s.id === id) || null;
  });

  constructor() {
    effect(
      () => {
        const wsId = this.workspaceId();
        if (wsId) this.loadAll();
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    const wsId = this.workspaceId();
    if (!wsId) return;
    this.isLoading.set(true);
    this.error.set(null);

    this.service.getSummary(wsId).subscribe({
      next: (s) => this.summary.set(s),
      error: (err) => console.error('Failed to load summary', err),
    });

    this.service.getSessions(wsId).subscribe({
      next: (list) => {
        this.sessions.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load streams');
        this.isLoading.set(false);
      },
    });
  }

  refreshSelectedSession() {
    const id = this.selectedSessionId();
    if (!id) return;
    this.service.getSessionById(this.workspaceId(), id).subscribe({
      next: (fresh) => {
        const list = this.sessions().map((s) => (s.id === fresh.id ? fresh : s));
        this.sessions.set(list);
      },
    });
  }

  // ─── Session Modal ───────────────────────────────────────────────────

  openSessionModal(session?: StreamSession) {
    if (session) {
      this.editingSessionId.set(session.id);
      this.sessionForm.set({
        title: session.title,
        description: session.description || '',
        platform: session.platform,
        streamUrl: session.streamUrl,
        embedUrl: session.embedUrl || '',
        thumbnailUrl: session.thumbnailUrl || '',
        matchId: session.matchId || '',
        scheduledStart: session.scheduledStart ? session.scheduledStart.slice(0, 16) : '',
        showScoreOverlay: session.showScoreOverlay,
        showStats: session.showStats,
        showTeamNames: session.showTeamNames,
        isPublic: session.isPublic,
        overlayColor: session.overlayColor || '#8b5cf6',
      });
    } else {
      this.editingSessionId.set(null);
      this.sessionForm.set({
        title: '',
        description: '',
        platform: 'youtube',
        streamUrl: '',
        embedUrl: '',
        thumbnailUrl: '',
        matchId: '',
        scheduledStart: '',
        showScoreOverlay: true,
        showStats: true,
        showTeamNames: true,
        isPublic: true,
        overlayColor: '#8b5cf6',
      });
    }
    this.isSessionModalOpen.set(true);
  }

  closeSessionModal() {
    this.isSessionModalOpen.set(false);
  }

  saveSession() {
    const form = this.sessionForm();
    const wsId = this.workspaceId();
    const id = this.editingSessionId();

    const payload: any = {
      title: form.title,
      description: form.description || null,
      embedUrl: form.embedUrl || undefined,
      thumbnailUrl: form.thumbnailUrl || null,
      matchId: form.matchId || null,
      scheduledStart: form.scheduledStart ? new Date(form.scheduledStart).toISOString() : null,
      showScoreOverlay: form.showScoreOverlay,
      showStats: form.showStats,
      showTeamNames: form.showTeamNames,
      isPublic: form.isPublic,
      overlayColor: form.overlayColor || null,
    };
    if (!id) {
      payload.platform = form.platform;
      payload.streamUrl = form.streamUrl;
    }

    const req = id
      ? this.service.updateSession(wsId, id, payload)
      : this.service.createSession(wsId, payload);

    req.subscribe({
      next: (s) => {
        this.closeSessionModal();
        this.loadAll();
        this.selectedSessionId.set(s.id);
      },
      error: (err) => alert(err?.error?.message || 'Failed to save session'),
    });
  }

  goLive(session: StreamSession) {
    this.service.goLive(this.workspaceId(), session.id).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed to go live'),
    });
  }

  endStream(session: StreamSession) {
    if (!confirm(`End stream "${session.title}"?`)) return;
    this.service.endStream(this.workspaceId(), session.id).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed to end stream'),
    });
  }

  reportViewers(session: StreamSession) {
    const input = prompt(
      `Current viewer count for "${session.title}"?`,
      String(session.viewerCount),
    );
    if (input === null) return;
    const n = Number(input);
    if (!Number.isFinite(n) || n < 0) {
      alert('Enter a non-negative number.');
      return;
    }
    this.service.updateViewerCount(this.workspaceId(), session.id, Math.floor(n)).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed to update'),
    });
  }

  deleteSession(session: StreamSession) {
    if (!confirm(`Delete stream session "${session.title}"?`)) return;
    this.service.deleteSession(this.workspaceId(), session.id).subscribe({
      next: () => {
        if (this.selectedSessionId() === session.id) {
          this.selectedSessionId.set(null);
        }
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed to delete'),
    });
  }

  copyOverlayUrl(session: StreamSession) {
    const url = this.overlayUrl(session);
    navigator.clipboard
      ?.writeText(url)
      .then(() => alert('Overlay URL copied to clipboard.'))
      .catch(() => {});
  }

  overlayUrl(session: StreamSession): string {
    const base = window.location.origin;
    return `${base}/public/streaming/${session.id}/overlay`;
  }

  publicUrl(session: StreamSession): string {
    const base = window.location.origin;
    return `${base}/public/streaming/${session.id}`;
  }

  safeEmbedUrl(url: string | null): SafeResourceUrl | null {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // ─── Highlight Modal ─────────────────────────────────────────────────

  openHighlightModal(sessionId: string, highlight?: StreamHighlight) {
    this.highlightSessionId.set(sessionId);
    if (highlight) {
      this.editingHighlightId.set(highlight.id);
      this.highlightForm.set({
        title: highlight.title,
        description: highlight.description || '',
        timestampSec: highlight.timestampSec,
        durationSec: highlight.durationSec,
        clipUrl: highlight.clipUrl || '',
        thumbnailUrl: highlight.thumbnailUrl || '',
        tagsInput: (highlight.tags || []).join(', '),
        clipType: highlight.clipType,
      });
    } else {
      this.editingHighlightId.set(null);
      this.highlightForm.set({
        title: '',
        description: '',
        timestampSec: 0,
        durationSec: null,
        clipUrl: '',
        thumbnailUrl: '',
        tagsInput: '',
        clipType: 'moment',
      });
    }
    this.isHighlightModalOpen.set(true);
  }

  closeHighlightModal() {
    this.isHighlightModalOpen.set(false);
  }

  saveHighlight() {
    const form = this.highlightForm();
    const sessionId = this.highlightSessionId();
    if (!sessionId) return;
    const wsId = this.workspaceId();
    const id = this.editingHighlightId();

    const tags = form.tagsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: any = {
      title: form.title,
      description: form.description || null,
      timestampSec: form.timestampSec,
      durationSec: form.durationSec,
      clipUrl: form.clipUrl || null,
      thumbnailUrl: form.thumbnailUrl || null,
      tags,
      clipType: form.clipType,
    };

    const req = id
      ? this.service.updateHighlight(wsId, id, payload)
      : this.service.createHighlight(wsId, { ...payload, sessionId });

    req.subscribe({
      next: () => {
        this.closeHighlightModal();
        this.refreshSelectedSession();
      },
      error: (err) => alert(err?.error?.message || 'Failed to save highlight'),
    });
  }

  deleteHighlight(highlight: StreamHighlight) {
    if (!confirm(`Delete highlight "${highlight.title}"?`)) return;
    this.service.deleteHighlight(this.workspaceId(), highlight.id).subscribe({
      next: () => this.refreshSelectedSession(),
      error: (err) => alert(err?.error?.message || 'Failed to delete'),
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  statusBadgeClass(status: StreamStatus): string {
    switch (status) {
      case 'live':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'scheduled':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'ended':
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
      case 'error':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    }
  }

  platformIcon(platform: StreamPlatform): string {
    switch (platform) {
      case 'youtube':
        return 'fi fi-brands-youtube';
      case 'twitch':
        return 'fi fi-brands-twitch';
      case 'facebook':
        return 'fi fi-brands-facebook';
      case 'vimeo':
        return 'fi fi-brands-vimeo';
      default:
        return 'fi fi-rr-video-camera-alt';
    }
  }

  formatTs(seconds: number): string {
    return this.service.formatTimestamp(seconds);
  }

  selectSession(id: string) {
    this.selectedSessionId.set(id);
    this.service.getSessionById(this.workspaceId(), id).subscribe({
      next: (fresh) => {
        const list = this.sessions().map((s) => (s.id === fresh.id ? fresh : s));
        this.sessions.set(list);
      },
    });
  }
}
