import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

/**
 * Baseline scenario — light, sustained mixed read traffic.
 *
 * Purpose: run this on every PR / nightly to catch latency regressions
 * before they hit production. Nothing exotic; just the routes a signed-
 * in user warms up on landing in a workspace.
 *
 * Env:
 *   BASE_URL       — API root (default http://localhost:3001)
 *   JWT            — bearer token for authed endpoints (optional)
 *   WORKSPACE_ID   — target workspace UUID
 */
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const JWT = __ENV.JWT || '';
const WS = __ENV.WORKSPACE_ID || '';

const errRate = new Rate('errors');

export const options = {
  scenarios: {
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m30s', target: 20 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // SLOs — fail the run if these are breached
    http_req_duration: [
      'p(95)<600', // 95 % of requests must complete under 600 ms
      'p(99)<1500',
    ],
    http_req_failed: ['rate<0.01'], // < 1 % errors
    errors: ['rate<0.02'],
  },
};

function authHeaders() {
  return JWT ? { Authorization: `Bearer ${JWT}` } : {};
}

export default function () {
  group('Reference data (cacheable)', () => {
    const res = http.get(`${BASE_URL}/api/reference-data`);
    const ok = check(res, {
      '200 OK': (r) => r.status === 200,
    });
    if (!ok) errRate.add(1);
  });

  if (JWT && WS) {
    group('Workspace bootstrap', () => {
      const res = http.get(`${BASE_URL}/api/workspaces/${WS}/bootstrap`, {
        headers: authHeaders(),
      });
      check(res, {
        '200 OK': (r) => r.status === 200,
      }) || errRate.add(1);
    });

    group('Dashboard summary', () => {
      const res = http.get(`${BASE_URL}/api/workspaces/${WS}/auctions/summary`, {
        headers: authHeaders(),
      });
      check(res, {
        '200 OK': (r) => r.status === 200,
      }) || errRate.add(1);
    });
  }

  sleep(1);
}
