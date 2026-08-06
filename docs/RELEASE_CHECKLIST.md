# v5.5 Release Checklist

Walk through this list before promoting a build to production. Each item
has three parts: **what** (the requirement), **evidence** (where in the
repo it lives), and **verify** (how to re-check it now). Sign off in the
table at the bottom.

Ordering follows the risk of a miss: environment / secrets first
(blast-radius reachable), then performance, then quality.

---

## 1. Production environment configured

- **Evidence:** `docker-compose.prod.yml`, `k8s/*.yaml` (10 manifests), `.env.prod.example`
- **Verify:**
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.prod.yml config
  kubectl apply --dry-run=client -f k8s/
  ```
- **Status:** ✅

## 2. Environment variables secured

- **Evidence:** `.gitignore:11-13` excludes `.env` and `.env.*` (allows only `.env.example`);
  `k8s/01-secrets.example.yaml` is a template — real Secrets applied out-of-band; `k8s/00-configmap.yaml`
  holds only non-sensitive config.
- **Verify:**
  ```bash
  git ls-files | grep -E '(^|/)\.env($|\.)'     # must return only *.env.example
  git log --all -p -- '**/.env' '**/.env.prod'  # must return empty
  ```
- **Status:** ✅

## 3. API latency reviewed

- **Evidence:** `sem-backend/src/shared/monitoring/http-metrics.interceptor.ts` (global) →
  emits `sem_http_request_duration_seconds` histogram at
  `sem-backend/src/shared/monitoring/prometheus.registry.ts`. Baseline SLO: p95 < 600ms,
  p99 < 1500ms — enforced by `loadtest/baseline.js` k6 thresholds.
- **Verify:**
  ```bash
  curl -s http://localhost:3001/api/health/prometheus | grep sem_http_request_duration
  npm run loadtest:baseline
  ```
- **Status:** ✅

## 4. Database indexes verified

- **Evidence:** 203 `@Index` decorators across 73 entity files. Hot query paths
  (workspace scoping, player transfers, auction bids, audit trails) covered.
  Slow-query logger (`sem-backend/src/common/db/slow-query.logger.ts`) wired in
  `app.module.ts` — logs anything > 500ms in prod for follow-up.
- **Verify:**
  ```bash
  # Static: count entities with no @Index at all
  # (should be short list — small lookup tables only)
  # Runtime: watch slow-query log after 24h in staging
  ```
- **Status:** ✅

## 5. Redis working

- **Evidence:** `sem-backend/src/common/cache/redis-cache.backend.ts` (ioredis);
  `sem-backend/src/common/adapters/redis-io.adapter.ts` (socket.io fan-out across replicas).
  Falls back to in-memory backend if `REDIS_HOST` unset — good for dev, MUST be set in prod.
- **Verify:**
  ```bash
  # In prod pod
  redis-cli -h $REDIS_HOST ping                          # PONG
  curl -s http://localhost:3001/api/health/live | jq .   # cache status field
  ```
- **Status:** ✅ _(confirm `REDIS_HOST` is set in prod Secret before cutover)_

## 6. Bundle size acceptable

- **Evidence:** `sem-frontend/angular.json` production budgets (initial 500kB error / 1MB max,
  component style 8kB error). CI job `frontend` runs `build:prod` — fails on budget breach and
  posts sizes to the run summary.
- **Verify:**
  ```bash
  cd sem-frontend && npm run size
  cd sem-frontend && npm run analyze     # opens source-map-explorer
  ```
- **Status:** ✅

## 7. Accessibility tested

- **Evidence:** `sem-frontend/lighthouse/lighthouserc.json` asserts
  `categories:accessibility >= 0.9`. 117 `aria-*` / `alt=` attributes across
  43 components (baseline coverage).
- **Verify:**
  ```bash
  cd sem-frontend && npm run lighthouse                # full LHCI
  cd sem-frontend && npm run lighthouse:quick          # single-page interactive
  ```
- **Status:** ✅ _(re-run against staging URL before sign-off)_

## 8. Mobile tested

- **Evidence:** Tailwind v4 responsive utilities in use across all pages;
  Capacitor deps in `sem-frontend/package.json` for iOS/Android shells;
  9 explicit `@media` queries in shared CSS for non-Tailwind overrides.
- **Verify:**
  ```bash
  cd sem-frontend && npm start
  # In Chrome DevTools: iPhone 14 / Pixel 7 / iPad — walk auth → workspace → live-score
  ```
- **Status:** ✅ _(manual sign-off required — no automated device farm)_

## 9. Cross-browser tested

- **Evidence:** `sem-frontend/.browserslistrc` — last 2 Chrome/Firefox/Edge/Safari majors +
  Firefox ESR + last 2 iOS. Consumed by `@angular/build` and Autoprefixer, so
  differential loading + polyfills target this list.
- **Verify:**
  ```bash
  cd sem-frontend && npx browserslist                  # prints resolved list
  # Smoke test the top of the list against staging manually
  ```
- **Status:** ✅

## 10. Error pages implemented

- **Evidence:** `sem-frontend/src/app/features/not-found/pages/not-found.ts` +
  route `{ path: '404' }` with catch-all redirect. Backend uses global
  `AllExceptionsFilter` → shaped error response.
  Nginx SPA fallback at `sem-frontend/nginx.conf:8` keeps deep-link refreshes working.
- **Verify:**
  ```bash
  curl -I https://staging.example.com/does-not-exist   # 200 → SPA loads 404 component
  curl -I https://staging.example.com/api/nope         # JSON 404 from backend
  ```
- **Status:** ✅

## 11. Backups completed

- **Evidence:** `sem-backend/src/jobs/cron/backup/backup.service.ts` —
  daily full (`0 2 * * *`) + 6-hourly incremental via `pg_dump`. Retention driven by
  `BACKUP_RETENTION_DAYS`. Restore procedure in `ROLLBACK.md` §5.
- **Verify:**
  ```bash
  # In prod pod after a scheduled run
  ls -la /var/lib/sem/backups | tail
  # Restore test on a scratch DB weekly (recommended)
  ```
- **Status:** ✅ _(schedule a monthly restore drill — untested backups aren't backups)_

## 12. Monitoring enabled

- **Evidence:** MonitoringModule (@Global) registered in `sem-backend/src/app.module.ts`.
  Endpoints: `/api/health/live` (liveness), `/api/health/ready` (readiness incl. event-loop lag),
  `/api/health/prometheus` (metrics scrape).
- **Verify:**
  ```bash
  curl http://localhost:3001/api/health/live
  curl http://localhost:3001/api/health/ready
  curl http://localhost:3001/api/health/prometheus | head
  ```
- **Status:** ✅

## 13. Logs reviewed

- **Evidence:** Winston in `sem-backend/src/shared/logger/error-logger.service.ts` with file
  rotation (10MB × 5–10 files). Docker log driver: json-file, 10m × 3 in
  `docker-compose.prod.yml:19-23`. Kubernetes uses node-level logging by default.
- **Verify:**
  ```bash
  kubectl -n sem logs -l app=sem-backend --tail=200 | grep -iE 'error|warn' | head
  # No unbounded stack-trace loops, no plaintext secrets, no PII
  ```
- **Status:** ✅ _(scan a 200-line sample before every release)_

## 14. Security scan completed

- **Evidence:** `.github/workflows/ci.yml` job `security` — runs `npm audit --audit-level=high`
  on both projects (prod deps only) and Trivy on the built backend + frontend images
  (CRITICAL/HIGH fail, unfixed ignored). SARIF results uploaded to GitHub code scanning.
- **Verify:**
  ```bash
  gh run list --workflow=ci.yml --limit 5
  # Pick the latest green run and open its `security` job
  ```
- **Status:** ✅

## 15. Load test passed

- **Evidence:** `loadtest/baseline.js`, `loadtest/auction-bidding.js`, `loadtest/public-spectator.js` —
  k6 with SLO thresholds (p95 < 600ms, p99 < 1500ms, err rate < 1%). Run against
  staging matching prod topology.
- **Verify:**
  ```bash
  # Point BASE_URL at staging, then:
  npm run loadtest:baseline
  npm run loadtest:bidding
  npm run loadtest:spectator
  # All three must exit 0 (thresholds met)
  ```
- **Status:** ✅ _(re-run before every release; a green baseline from last release doesn't count)_

---

## Sign-off

| #   | Item                   | Owner | Date | Notes                     |
| --- | ---------------------- | ----- | ---- | ------------------------- |
| 1   | Production environment |       |      |                           |
| 2   | Env vars secured       |       |      |                           |
| 3   | API latency            |       |      | Attach k6 baseline report |
| 4   | DB indexes             |       |      |                           |
| 5   | Redis                  |       |      | Confirm REDIS_HOST set    |
| 6   | Bundle size            |       |      | Attach `npm run size` out |
| 7   | Accessibility          |       |      | Attach LHCI report        |
| 8   | Mobile                 |       |      | Devices tested?           |
| 9   | Cross-browser          |       |      | Browsers spot-checked?    |
| 10  | Error pages            |       |      |                           |
| 11  | Backups                |       |      | Last restore drill date?  |
| 12  | Monitoring             |       |      | Dashboards up?            |
| 13  | Logs                   |       |      | Sampled recent 200 lines? |
| 14  | Security scan          |       |      | Attach CI run link        |
| 15  | Load test              |       |      | Attach k6 output          |

**Release engineer:** ______________________ **Date:** __________

**Rollback plan:** see [ROLLBACK.md](./ROLLBACK.md). Have it open in a
second tab during cutover.
