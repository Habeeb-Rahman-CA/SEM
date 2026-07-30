import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShareEntityKind, ShareService } from '../services/share.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-share-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      (click)="open()"
      [class]="
        'inline-flex items-center gap-2 rounded-xl border transition cursor-pointer ' +
        (variant() === 'ghost'
          ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
          : 'bg-violet-600 hover:bg-violet-500 border-violet-500 text-white shadow-md shadow-violet-500/20') +
        ' ' +
        (size() === 'sm' ? 'px-3 py-1.5 text-[11px] font-bold' : 'px-4 py-2 text-xs font-bold')
      "
    >
      <i class="fi fi-rr-share text-[11px]"></i>
      {{ label() }}
    </button>

    @if (isOpen()) {
      <div
        class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        (click)="close()"
      >
        <div
          class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden"
          (click)="$event.stopPropagation()"
        >
          <div
            class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500"
          ></div>

          <div class="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 class="text-sm font-black text-white flex items-center gap-2">
              <i class="fi fi-rr-share text-violet-400"></i>
              Share {{ shareTitle() }}
            </h3>
            <button
              type="button"
              (click)="close()"
              class="text-slate-400 hover:text-white transition bg-transparent border-0"
              aria-label="Close"
            >
              <i class="fi fi-rr-cross-small text-lg"></i>
            </button>
          </div>

          <div class="p-5 flex flex-col gap-4">
            <!-- QR code -->
            <div class="flex items-center justify-center">
              <div class="bg-white p-3 rounded-2xl">
                <img [src]="qrUrl()" alt="QR code" class="w-40 h-40" loading="lazy" />
              </div>
            </div>

            <!-- Copy link -->
            <div class="flex items-center gap-2">
              <input
                readonly
                [value]="url()"
                class="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-slate-300 font-mono outline-none truncate"
                (focus)="onLinkFocus($event)"
              />
              <button
                type="button"
                (click)="copyLink()"
                class="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-1.5 flex-shrink-0"
              >
                @if (copied()) {
                  <i class="fi fi-rr-check text-xs"></i>
                  Copied
                } @else {
                  <i class="fi fi-rr-copy text-xs"></i>
                  Copy
                }
              </button>
            </div>

            <!-- Social buttons -->
            <div class="grid grid-cols-3 gap-2">
              <a
                [href]="social().whatsapp"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex flex-col items-center gap-1 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-[10px] font-bold uppercase tracking-wider transition"
              >
                <i class="fi fi-brands-whatsapp text-base"></i>
                WhatsApp
              </a>
              <a
                [href]="social().twitter"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex flex-col items-center gap-1 py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-300 text-[10px] font-bold uppercase tracking-wider transition"
              >
                <i class="fi fi-brands-twitter-alt text-base"></i>
                Twitter
              </a>
              <a
                [href]="social().facebook"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex flex-col items-center gap-1 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-300 text-[10px] font-bold uppercase tracking-wider transition"
              >
                <i class="fi fi-brands-facebook text-base"></i>
                Facebook
              </a>
              <a
                [href]="social().telegram"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex flex-col items-center gap-1 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-cyan-300 text-[10px] font-bold uppercase tracking-wider transition"
              >
                <i class="fi fi-brands-telegram text-base"></i>
                Telegram
              </a>
              <a
                [href]="social().linkedin"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex flex-col items-center gap-1 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 text-[10px] font-bold uppercase tracking-wider transition"
              >
                <i class="fi fi-brands-linkedin text-base"></i>
                LinkedIn
              </a>
              <a
                [href]="social().email"
                class="inline-flex flex-col items-center gap-1 py-2.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/25 text-slate-300 text-[10px] font-bold uppercase tracking-wider transition"
              >
                <i class="fi fi-rr-envelope text-base"></i>
                Email
              </a>
            </div>

            @if (nativeShareAvailable()) {
              <button
                type="button"
                (click)="nativeShare()"
                class="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 cursor-pointer transition"
              >
                <i class="fi fi-rr-share-square text-xs"></i>
                More sharing options
              </button>
            }

            <p class="text-[10px] text-slate-500 text-center">
              Rich previews load automatically on WhatsApp, iMessage, Facebook, Slack, and Twitter.
            </p>
          </div>
        </div>
      </div>
    }
  `,
})
export class ShareButtonComponent {
  private shareService = inject(ShareService);
  private ui = inject(UiService);

  entity = input.required<ShareEntityKind>();
  entityId = input.required<string>();
  shareTitle = input<string>('this page');
  label = input<string>('Share');
  variant = input<'ghost' | 'primary'>('ghost');
  size = input<'sm' | 'md'>('md');
  extraParams = input<Record<string, string> | null>(null);

  isOpen = signal(false);
  copied = signal(false);

  url = computed(() =>
    this.shareService.shareUrl(this.entity(), this.entityId(), {
      extra: this.extraParams() ?? undefined,
    }),
  );

  qrUrl = computed(() => this.shareService.qrUrl(this.url()));

  social = computed(() => this.shareService.buildSocialLinks(this.url(), this.shareTitle()));

  nativeShareAvailable(): boolean {
    if (typeof navigator === 'undefined') return false;
    return typeof (navigator as any).share === 'function';
  }

  open() {
    this.isOpen.set(true);
    this.copied.set(false);
  }

  close() {
    this.isOpen.set(false);
  }

  onLinkFocus(event: FocusEvent) {
    const el = event.target as HTMLInputElement | null;
    el?.select();
  }

  copyLink() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(this.url()).then(() => {
      this.copied.set(true);
      this.ui.success('Link copied to clipboard.');
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  nativeShare() {
    if (typeof navigator === 'undefined' || !(navigator as any).share) return;
    (navigator as any)
      .share({
        title: this.shareTitle(),
        text: this.shareTitle(),
        url: this.url(),
      })
      .catch(() => {
        /* user cancelled */
      });
  }
}
