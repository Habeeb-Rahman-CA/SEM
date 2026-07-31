/**
 * Type-safe wrapper for the "run these independent I/O calls in parallel"
 * pattern. Behaves like Promise.all but reads more clearly at call sites
 * where the intent is obvious:
 *
 *   const { workspace, members, roles } = await parallel({
 *     workspace: this.workspaceRepo.findOne(...),
 *     members: this.getMembers(...),
 *     roles: this.getRoles(...),
 *   });
 *
 * The keyed form is easier to skim than positional Promise.all when the
 * caller wants named destructuring, and destructures cleanly with
 * TypeScript inference.
 *
 * A separate `parallelSettled` variant returns per-key success/failure
 * envelopes for endpoints where partial success is acceptable (e.g.
 * dashboard tiles fed by independent queries — one query failing
 * shouldn't blank the whole dashboard).
 */
export async function parallel<T extends Record<string, Promise<any>>>(
  tasks: T,
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const keys = Object.keys(tasks) as Array<keyof T>;
  const values = await Promise.all(keys.map((k) => tasks[k]));
  const out: any = {};
  keys.forEach((k, i) => (out[k] = values[i]));
  return out;
}

export interface Settled<T> {
  ok: boolean;
  value?: T;
  error?: unknown;
}

export async function parallelSettled<T extends Record<string, Promise<any>>>(
  tasks: T,
): Promise<{ [K in keyof T]: Settled<Awaited<T[K]>> }> {
  const keys = Object.keys(tasks) as Array<keyof T>;
  const settled = await Promise.allSettled(keys.map((k) => tasks[k]));
  const out: any = {};
  keys.forEach((k, i) => {
    const r = settled[i];
    out[k] =
      r.status === 'fulfilled'
        ? { ok: true, value: r.value }
        : { ok: false, error: r.reason };
  });
  return out;
}
