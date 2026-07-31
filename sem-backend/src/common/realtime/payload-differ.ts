/**
 * Shallow-diff helpers used to emit only the fields that actually changed
 * between two snapshots. Cuts payload sizes dramatically on tick-heavy
 * streams (live match: only `homeScore` changed → we send 1 field, not
 * the whole match object).
 *
 * Two shapes are supported:
 *
 *   diffObject(prev, next)      → { changed: {...}, removed: [...] } | null
 *   diffCollection(prev, next)  → { added: [...], updated: [...], removed: [...] } | null
 *
 * Both return `null` when nothing changed, so callers can skip the
 * emission entirely.
 *
 * Not a full JSON-Patch implementation: nested objects are compared by
 * reference / JSON.stringify — good enough for the mostly-flat DTOs the
 * gateways emit. If you need deep RFC-6902 diffs, plug in `fast-json-patch`.
 */

export interface ObjectDiff<T> {
  changed: Partial<T>;
  removed: string[];
}

export function diffObject<T extends Record<string, any>>(
  prev: T | null | undefined,
  next: T | null | undefined,
): ObjectDiff<T> | null {
  if (!prev && !next) return null;
  if (!prev && next) return { changed: { ...next }, removed: [] };
  if (prev && !next) return { changed: {}, removed: Object.keys(prev) };
  const changed: Record<string, any> = {};
  const removed: string[] = [];
  const seen = new Set<string>();
  for (const key of Object.keys(next!)) {
    seen.add(key);
    if (!shallowEqual(prev![key], next![key])) {
      changed[key] = next![key];
    }
  }
  for (const key of Object.keys(prev!)) {
    if (!seen.has(key)) removed.push(key);
  }
  if (Object.keys(changed).length === 0 && removed.length === 0) return null;
  return { changed: changed as Partial<T>, removed };
}

export interface CollectionDiff<T> {
  added: T[];
  updated: T[];
  removed: string[];
}

export function diffCollection<T extends { id: string }>(
  prev: T[],
  next: T[],
): CollectionDiff<T> | null {
  const prevMap = new Map(prev.map((p) => [p.id, p]));
  const nextMap = new Map(next.map((n) => [n.id, n]));
  const added: T[] = [];
  const updated: T[] = [];
  const removed: string[] = [];
  for (const [id, n] of nextMap) {
    const p = prevMap.get(id);
    if (!p) added.push(n);
    else if (!shallowEqual(p, n)) updated.push(n);
  }
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) removed.push(id);
  }
  if (added.length + updated.length + removed.length === 0) return null;
  return { added, updated, removed };
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  // Fall back to JSON equality for nested structures — cheap enough for
  // small DTOs, and avoids the false negatives of pure reference checks
  // when producers rebuild objects each tick.
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
