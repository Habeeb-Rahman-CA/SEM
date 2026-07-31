import { Pipe, PipeTransform } from '@angular/core';

/**
 * Picks the best image URL from an ordered candidate list based on
 * (a) whether the browser probably supports the format and (b) the
 * URL extension. Cheap heuristic — no server negotiation, no probes.
 *
 *   <img [src]="[player.avifUrl, player.webpUrl, player.avatarUrl] | pickImageSrc" />
 *
 * Used together with `[appLazyImg]` this gives you WebP/AVIF delivery
 * for browsers that support it and a graceful fallback for those that
 * don't, without needing a full <picture> element in every list card.
 *
 * Pure pipe — the result is memoized until the input reference changes,
 * so it costs nothing to use in @for loops.
 */
@Pipe({
  name: 'pickImageSrc',
  standalone: true,
  pure: true,
})
export class PickImageSrcPipe implements PipeTransform {
  // Lazily-evaluated support flags — the check runs once per app session.
  private static supportsAvifCache: boolean | null = null;
  private static supportsWebpCache: boolean | null = null;

  transform(candidates: Array<string | null | undefined>): string | null {
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    const cleaned = candidates.filter((c): c is string => !!c);
    if (cleaned.length === 0) return null;

    const avifOk = PickImageSrcPipe.supportsAvif();
    const webpOk = PickImageSrcPipe.supportsWebp();

    for (const url of cleaned) {
      const lower = url.toLowerCase();
      if (lower.includes('.avif') && !avifOk) continue;
      if (lower.includes('.webp') && !webpOk) continue;
      return url;
    }
    // Nothing matched (unusual) — fall back to the first candidate.
    return cleaned[0];
  }

  private static supportsAvif(): boolean {
    if (this.supportsAvifCache !== null) return this.supportsAvifCache;
    try {
      const canvas = document.createElement('canvas');
      if (!canvas.getContext) return (this.supportsAvifCache = false);
      const url = canvas.toDataURL('image/avif');
      this.supportsAvifCache = url.startsWith('data:image/avif');
    } catch {
      this.supportsAvifCache = false;
    }
    return this.supportsAvifCache;
  }

  private static supportsWebp(): boolean {
    if (this.supportsWebpCache !== null) return this.supportsWebpCache;
    try {
      const canvas = document.createElement('canvas');
      if (!canvas.getContext) return (this.supportsWebpCache = false);
      const url = canvas.toDataURL('image/webp');
      this.supportsWebpCache = url.startsWith('data:image/webp');
    } catch {
      this.supportsWebpCache = false;
    }
    return this.supportsWebpCache;
  }
}
