import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';

export type ShareEntityKind = 'events' | 'matches' | 'players' | 'teams';

@Injectable({ providedIn: 'root' })
export class ShareService {
  private title = inject(Title);
  private meta = inject(Meta);

  /**
   * Bot-facing share URL — always resolves back to the SPA via a redirect,
   * but exposes OG tags so scrapers like WhatsApp/Facebook/Twitter can build
   * a rich preview.
   */
  shareUrl(
    kind: ShareEntityKind,
    id: string,
    opts: { extra?: Record<string, string> } = {},
  ): string {
    const base = `${environment.apiUrl}/share/${kind}/${encodeURIComponent(id)}`;
    if (opts.extra) {
      const q = new URLSearchParams(opts.extra).toString();
      if (q) return `${base}?${q}`;
    }
    return base;
  }

  /**
   * Direct link into the SPA — no OG. Useful when users copy the visible URL
   * from the browser bar.
   */
  spaUrl(kind: ShareEntityKind, id: string, opts: { extra?: Record<string, string> } = {}): string {
    if (typeof window === 'undefined') return '';
    const path = this.spaPath(kind, id);
    const base = `${window.location.origin}${path}`;
    if (opts.extra) {
      const q = new URLSearchParams(opts.extra).toString();
      if (q) return `${base}?${q}`;
    }
    return base;
  }

  spaPath(kind: ShareEntityKind, id: string): string {
    switch (kind) {
      case 'events':
        return `/public/events/${encodeURIComponent(id)}`;
      case 'matches':
        return `/public/matches/${encodeURIComponent(id)}`;
      case 'players':
        return `/public/players/${encodeURIComponent(id)}`;
      case 'teams':
        return `/public/teams/${encodeURIComponent(id)}`;
    }
  }

  qrUrl(url: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
  }

  /**
   * Set the browser tab title + full set of OG/Twitter tags for the current
   * page. JS-capable scrapers (Slack, LinkedIn) will pick these up.
   * Non-JS scrapers (Facebook, WhatsApp) rely on the /share/* endpoints
   * instead — always share via `shareUrl(...)` for those.
   */
  setPageMeta(opts: {
    title: string;
    description?: string;
    image?: string | null;
    url?: string | null;
  }) {
    this.title.setTitle(`${opts.title} · SEM`);

    const set = (name: string, value: string, isProperty = false) => {
      const selector = isProperty ? `property="${name}"` : `name="${name}"`;
      if (this.meta.getTag(selector)) {
        this.meta.updateTag({ [isProperty ? 'property' : 'name']: name, content: value } as any);
      } else {
        this.meta.addTag({ [isProperty ? 'property' : 'name']: name, content: value } as any);
      }
    };

    const desc = (opts.description ?? '').slice(0, 200);

    set('description', desc);
    set('og:title', opts.title, true);
    set('og:description', desc, true);
    set('og:type', 'website', true);
    if (opts.url) set('og:url', opts.url, true);
    if (opts.image) {
      set('og:image', opts.image, true);
      set('twitter:card', 'summary_large_image');
      set('twitter:image', opts.image);
    } else {
      set('twitter:card', 'summary');
    }
    set('twitter:title', opts.title);
    set('twitter:description', desc);
  }

  buildSocialLinks(url: string, title: string) {
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title);
    const body = encodeURIComponent(`${title}: ${url}`);
    return {
      whatsapp: `https://api.whatsapp.com/send?text=${body}`,
      twitter: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      telegram: `https://t.me/share/url?url=${u}&text=${t}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      email: `mailto:?subject=${t}&body=${body}`,
    };
  }
}
