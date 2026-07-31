import { LessThan, Repository } from 'typeorm';

/**
 * archiveOlderThan: moves rows older than `cutoff` from a hot table into
 * an archive table with the same schema. Runs in fixed-size batches to
 * keep transactions bounded and lock windows small on busy tables.
 *
 * Returns { moved, deleted } so callers can log how much was cleared.
 * If your archive table lives in a separate schema, wire that via a
 * `Repository<Archive>` connected to the appropriate schema.
 *
 * Not a magic bullet — you still need to:
 *   1. Create the archive table with an identical shape to the source
 *      (either a `LIKE` clone or a matching entity).
 *   2. Ensure the source table's PK is preserved so foreign-key
 *      references don't dangle. Alternatively archive dependent rows
 *      first, or set FKs to ON DELETE SET NULL.
 *
 * For log-style tables (attendance, audit, notifications) the pattern
 * is: soft-delete-or-move rows older than 90/180/365 days, then reclaim
 * space via VACUUM.
 */
export async function archiveOlderThan<T extends Record<string, any>>(
  source: Repository<T>,
  archive: Repository<T>,
  timestampColumn: keyof T & string,
  cutoff: Date,
  opts: {
    batchSize?: number;
    /** Extra WHERE clauses to narrow the archive scope. */
    where?: Record<string, any>;
    /** Dry-run — count only, don't actually move. */
    dryRun?: boolean;
    /** Delete from source after successful insert (default true). */
    deleteAfter?: boolean;
  } = {},
): Promise<{ moved: number; deleted: number; batches: number }> {
  const batchSize = opts.batchSize ?? 500;
  const deleteAfter = opts.deleteAfter ?? true;

  let moved = 0;
  let deleted = 0;
  let batches = 0;

  // Loop in fixed batches until nothing older than cutoff remains

  while (true) {
    const batch = await source.find({
      where: {
        ...(opts.where || {}),
        [timestampColumn]: LessThan(cutoff),
      } as any,
      order: { [timestampColumn]: 'ASC' } as any,
      take: batchSize,
    });
    if (batch.length === 0) break;
    batches += 1;

    if (opts.dryRun) {
      moved += batch.length;
      if (batch.length < batchSize) break;
      continue;
    }

    // Insert into archive first — if this fails, source rows stay intact
    await archive.save(batch as any);
    moved += batch.length;

    if (deleteAfter) {
      const ids = batch.map((r) => (r as any).id).filter(Boolean);
      if (ids.length > 0) {
        const result = await source.delete(ids as any);
        deleted += result.affected ?? 0;
      }
    }
    if (batch.length < batchSize) break;
  }

  return { moved, deleted, batches };
}
