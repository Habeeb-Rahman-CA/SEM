import { Injectable } from '@angular/core';

/**
 * DynamicLibLoader
 *
 * A tiny facade for lazy-importing heavy third-party libraries so they
 * ship as their own chunks instead of bloating the initial bundle.
 *
 * The problem: libraries like `xlsx` (~500 KB min+gzip), `gsap` (~90 KB),
 * and `cloudinary` are used by only a handful of screens (exports,
 * animations, image uploads). Statically importing them anywhere in the
 * app graph pulls them into a bundle that every user downloads —
 * including the 90 % who never trigger those features.
 *
 * The fix: import inside a function, cache the promise once resolved,
 * and let esbuild code-split the chunk. Callers do this:
 *
 *   const XLSX = await this.libs.xlsx();
 *   const sheet = XLSX.utils.json_to_sheet(rows);
 *
 * or:
 *
 *   const { gsap } = await this.libs.gsap();
 *   gsap.to(el, { opacity: 1, duration: 0.3 });
 *
 * Every loader here is idempotent — subsequent calls return the cached
 * module instance without re-downloading.
 */
@Injectable({ providedIn: 'root' })
export class DynamicLibLoader {
  private xlsxPromise: Promise<any> | null = null;
  private gsapPromise: Promise<any> | null = null;
  private cloudinaryPromise: Promise<any> | null = null;
  private socketPromise: Promise<any> | null = null;

  /**
   * `xlsx` for CSV/XLSX export/import. ~500 KB — never pull into the
   * initial bundle. First call triggers a network fetch of the chunk.
   */
  xlsx(): Promise<any> {
    return (this.xlsxPromise ??= import('xlsx').catch((err) => {
      this.xlsxPromise = null;
      throw err;
    }));
  }

  /** Same for `xlsx-js-style` when styled exports are needed. */
  xlsxStyled(): Promise<any> {
    return this.load('xlsx-js-style', 'xlsxStyled');
  }

  /**
   * `gsap` for advanced animations. Prefer CSS transitions where possible;
   * pull gsap in only for the one page that actually uses it.
   */
  gsap(): Promise<any> {
    return (this.gsapPromise ??= import('gsap').catch((err) => {
      this.gsapPromise = null;
      throw err;
    }));
  }

  /** Cloudinary browser SDK — only needed on upload/edit surfaces. */
  cloudinary(): Promise<any> {
    return (this.cloudinaryPromise ??= import('cloudinary').catch((err) => {
      this.cloudinaryPromise = null;
      throw err;
    }));
  }

  /**
   * `socket.io-client` for live match / auction streams. Screens without
   * realtime UI don't need to pay for the connection primitives.
   */
  socketIO(): Promise<any> {
    return (this.socketPromise ??= import('socket.io-client').catch((err) => {
      this.socketPromise = null;
      throw err;
    }));
  }

  /**
   * Generic loader for anything not on the shortlist above. Prefer the
   * named helpers when they exist — they get better TypeScript types and
   * the code-splitter can pre-tune chunk names.
   */
  private cache = new Map<string, Promise<any>>();
  load(specifier: string, cacheKey?: string): Promise<any> {
    const key = cacheKey ?? specifier;
    const existing = this.cache.get(key);
    if (existing) return existing;
    // `import()` with a runtime string still code-splits; but esbuild
    // won't be able to pre-name the chunk. Prefer literal imports above.
    const p = (async () => {
      try {
        return await (Function('s', 'return import(s)') as any)(specifier);
      } catch (err) {
        this.cache.delete(key);
        throw err;
      }
    })();
    this.cache.set(key, p);
    return p;
  }
}
