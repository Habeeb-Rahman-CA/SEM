import { In, Repository } from 'typeorm';

/**
 * batchLoadByIds: fetches a related entity for many parents in ONE query,
 * indexed by a foreign-key column on the child. This is the standard fix
 * for the N+1 pattern:
 *
 *   Before:  for (const player of players) {
 *              player.contract = await contractRepo.findOne({ where: { playerId: player.id } });
 *            }
 *   After:   const contractsByPlayerId = await batchLoadByIds(
 *              contractRepo, 'playerId', players.map(p => p.id));
 *            for (const player of players) {
 *              player.contract = contractsByPlayerId.get(player.id) ?? null;
 *            }
 *
 * `first: true` returns Map<id, entity> (one-to-one style); default returns
 * Map<id, entity[]> for one-to-many relations.
 */
export async function batchLoadByIds<
  T extends Record<string, any>,
  K extends keyof T & string,
>(
  repo: Repository<T>,
  fkColumn: K,
  ids: readonly string[],
  opts: {
    where?: Record<string, any>;
    relations?: string[];
    order?: Record<string, 'ASC' | 'DESC'>;
    first?: false;
  },
): Promise<Map<string, T[]>>;
export async function batchLoadByIds<
  T extends Record<string, any>,
  K extends keyof T & string,
>(
  repo: Repository<T>,
  fkColumn: K,
  ids: readonly string[],
  opts: {
    where?: Record<string, any>;
    relations?: string[];
    order?: Record<string, 'ASC' | 'DESC'>;
    first: true;
  },
): Promise<Map<string, T>>;
export async function batchLoadByIds<
  T extends Record<string, any>,
  K extends keyof T & string,
>(
  repo: Repository<T>,
  fkColumn: K,
  ids: readonly string[],
  opts: {
    where?: Record<string, any>;
    relations?: string[];
    order?: Record<string, 'ASC' | 'DESC'>;
    first?: boolean;
  } = {},
): Promise<Map<string, T | T[]>> {
  const uniq = Array.from(new Set(ids)).filter(Boolean);
  if (uniq.length === 0) return new Map();

  const rows = await repo.find({
    where: { ...(opts.where || {}), [fkColumn]: In(uniq) } as any,
    relations: opts.relations as any,
    order: opts.order as any,
  });

  const out = new Map<string, T | T[]>();
  if (opts.first) {
    for (const row of rows) {
      const key = String(row[fkColumn]);
      if (!out.has(key)) out.set(key, row);
    }
  } else {
    for (const row of rows) {
      const key = String(row[fkColumn]);
      const bucket = (out.get(key) as T[]) ?? [];
      bucket.push(row);
      out.set(key, bucket);
    }
  }
  return out;
}

/**
 * pluckIds — small helper that keeps callers from writing
 * `arr.map(x => x.id).filter(Boolean)` inline everywhere.
 */
export function pluckIds<T extends { id: string }>(
  items: T[] | null | undefined,
): string[] {
  return (items ?? []).map((i) => i.id).filter((v): v is string => !!v);
}

/**
 * chunkedIn — Postgres has a hard limit on parameters per query
 * (typically 65,535). For very large `IN (…)` sets, chunk into safe
 * batches and merge. Rarely needed but painful when hit in production.
 */
export async function loadInChunks<T>(
  ids: readonly string[],
  chunkSize: number,
  loader: (batch: string[]) => Promise<T[]>,
): Promise<T[]> {
  const uniq = Array.from(new Set(ids)).filter(Boolean);
  if (uniq.length === 0) return [];
  if (uniq.length <= chunkSize) return loader(uniq);
  const out: T[] = [];
  for (let i = 0; i < uniq.length; i += chunkSize) {
    const batch = uniq.slice(i, i + chunkSize);
    const rows = await loader(batch);
    out.push(...rows);
  }
  return out;
}

/**
 * pickFields — build a TypeORM `select` object from a compact list of
 * dot-paths (`['id', 'user.username']`) so callers don't have to write
 * the deeply nested boolean shape by hand for every projection.
 */
export function pickFields(paths: string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const p of paths) {
    const parts = p.split('.');
    let cursor = out;
    for (let i = 0; i < parts.length; i += 1) {
      const key = parts[i];
      if (i === parts.length - 1) {
        cursor[key] = true;
      } else {
        cursor[key] = cursor[key] ?? {};
        cursor = cursor[key];
      }
    }
  }
  return out;
}
