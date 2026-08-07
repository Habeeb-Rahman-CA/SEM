# Rollback runbook

When a deploy misbehaves, the goal is to get back to the last known-good
state fast, without making things worse. Below are the standard paths in
increasing order of blast radius. **Prefer the smallest fix that
restores service.**

---

## 1. Container rollback (fastest, non-destructive)

The `deploy.yml` workflow automatically triggers this on healthcheck
failure via `kubectl rollout undo`. For a manual rollback:

```bash
# Roll both services back one revision
kubectl -n sem rollout undo deployment/sem-backend
kubectl -n sem rollout undo deployment/sem-frontend

# Or roll to a specific revision
kubectl -n sem rollout history deployment/sem-backend
kubectl -n sem rollout undo deployment/sem-backend --to-revision=42

# Watch it settle
kubectl -n sem rollout status deployment/sem-backend
```

`kubectl rollout undo` is safe: the old image is still in the registry,
the ReplicaSet stays around, and the new pods drain gracefully thanks
to `terminationGracePeriodSeconds` + `onApplicationShutdown` hooks.

## 2. Feature-flag rollback (if the bad code is behind a flag)

Prefer this over a container rollback when the fix is a one-flag flip
— it takes effect in seconds and only affects the specific feature.
Check the workspace policy toggles at `/system-settings/cache` and any
in-app feature flags before reaching for the deploy machinery.

## 3. Cache invalidation (if the bad behaviour is a stale read)

Sometimes "the deploy broke it" is really "the cache is holding a
value from before the deploy." Before rolling back:

```bash
# Nuke a specific pattern
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "$API/admin/cache/invalidate?pattern=ws:*:dashboard:*"

# Or use the admin UI at /system-settings/cache
```

## 4. Database migration rollback

Every migration in this repo must implement `down()` (enforced by the
`migrations.yml` CI check). Reverting the newest migration:

```bash
cd sem-backend
npm run migration:revert   # reverts the LAST applied migration
```

For older migrations, revert them one by one — TypeORM applies down()
in reverse order of the timestamp.

### When it's safe to revert

- The migration is purely additive (ADD COLUMN with a default, CREATE
  INDEX CONCURRENTLY) — always safe.
- The migration is a two-step rename (add-new-column + write to both)
  — safe to revert if the app was still writing to the old column.

### When it's NOT safe to revert

- The migration was destructive (DROP COLUMN, DROP TABLE): the data is
  gone. **Restore from backup first**, then re-plan the schema change.
- The migration ran a data-backfill that the new app depends on: rolling
  back the schema will leave the new app broken. Roll back the app
  first, verify service, then decide whether to revert the schema.

## 5. Database restore from backup

Last resort, only for data-corruption or destructive-migration
recovery. Backups are produced by `backup.service.ts` on the schedule
configured in `.env`.

```bash
# List available backups
kubectl -n sem exec -it sem-backend-<pod> -- \
  ls -la /var/lib/sem/backups

# Restore a specific dump (drops the current DB!)
kubectl -n sem exec -it sem-postgres-<pod> -- \
  pg_restore -d $DB_DATABASE -c -Fc /path/to/backup.dump
```

Coordinate with the app rollback: **stop the backend first**
(`kubectl scale deployment/sem-backend --replicas=0`), restore, apply
the matching app version, then scale back up.

## 6. Rollback the deploy pipeline itself

If `deploy.yml` produced a bad image and it's already `:latest`:

```bash
# Re-run deploy against a known-good tag
gh workflow run deploy.yml -f environment=production -r v6.0.0
```

The workflow re-tags `latest` on push, so the next automatic rollout
will pick up the good image.

---

## Post-mortem checklist

After the fire is out:

1. Create a Slack / Linear incident ticket with the timeline.
2. Ensure the failed migration / commit has an issue with reproduction
   steps.
3. Add a test that would have caught the regression.
4. If a manual rollback was needed, ask: **which CI check would have
   caught this?** If none, add one.
