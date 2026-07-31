/**
 * TrackBy helpers.
 *
 * The `@for` / `*ngFor` `track` expression is a common source of subtle
 * perf regressions: template inline closures allocate on every change
 * detection cycle, and using the item reference or `$index` defeats
 * Angular's DOM-recycling. Prefer these exported constants — they're
 * defined once and safe to reuse across every list in the app.
 *
 *   @for (u of users; track byId(u)) { … }
 *   @for (item of matrix; track byIndex($index)) { … }
 *   @for (post of posts; track byField('slug')(post)) { … }
 */

/** Track by the item's `.id` — matches every entity in this codebase. */
export const byId = (item: { id: string | number }): string | number => item?.id;

/** Track by index — safe when the list is truly index-stable. */
export const byIndex = (index: number): number => index;

/** Higher-order helper for keys other than `id`. */
export const byField =
  <K extends string>(key: K) =>
  <T extends Record<K, string | number>>(item: T): string | number =>
    item?.[key];

/** Track a matrix row by composite key. */
export const byComposite =
  <T>(fn: (item: T) => Array<string | number>) =>
  (item: T): string =>
    fn(item).join('|');
