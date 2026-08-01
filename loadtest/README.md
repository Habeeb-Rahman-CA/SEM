# Load testing

Scenario scripts for [k6](https://k6.io) — a Go-based load tester that
runs plain JavaScript. Install with `brew install k6` (macOS) /
`choco install k6` (Windows) / `apt-get install k6` (Debian) or grab a
binary from the site.

## Quick start

```bash
# Baseline — a light, sustained load to catch regressions in CI
BASE_URL=http://localhost:3001 \
JWT=eyJ… \
k6 run --vus 20 --duration 2m loadtest/baseline.js

# Auction bidding — high write concurrency + short latencies
BASE_URL=http://localhost:3001 \
JWT=eyJ… \
WORKSPACE_ID=abc \
AUCTION_ID=xyz \
k6 run --vus 50 --duration 5m loadtest/auction-bidding.js

# Public spectator — read-heavy, unauthenticated, cache-friendly
BASE_URL=http://localhost:3001 \
k6 run --vus 200 --duration 10m loadtest/public-spectator.js
```

Each script prints a per-endpoint summary at the end and fails the run
if the SLO thresholds are breached (p95 latency, error rate, throughput
floor).

## What to look for

- **`http_req_duration` p95 / p99** — key latency signals. Compare
  against the previous run's baseline in CI.
- **`http_req_failed` rate** — anything above 1 % under nominal load
  points at contention, timeouts, or a stack error.
- **`iterations`** — proxy for throughput. Compare with the number of
  connections and virtual users to spot backpressure.

## Instrumenting with backend metrics

While a load test runs, scrape the Prometheus endpoint
(`GET /api/health/prometheus`) or open the admin
`/system-settings/cache` dashboard to correlate latency spikes with
event-loop lag, cache hit rate, and DB pool exhaustion.
