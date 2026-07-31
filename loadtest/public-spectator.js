import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

/**
 * Public spectator scenario — read-heavy, unauthenticated, cache-friendly.
 *
 * Purpose: model the unauth traffic pattern a live event generates —
 * spectators loading the public event page, checking live scores, and
 * browsing highlights. This exercises the cache + Cache-Control +
 * ETag paths, which should degrade to 304 responses after the first
 * warm-up.
 *
 * Env:
 *   BASE_URL       — API root (usually the nginx/edge, not the backend)
 *   EVENT_ID       — a public event to browse
 *   STREAM_ID      — a public stream session ID (optional)
 */
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const EVENT = __ENV.EVENT_ID || '';
const STREAM = __ENV.STREAM_ID || '';

const errRate = new Rate('errors');
const notModifiedRate = new Rate('not_modified');

export const options = {
  scenarios: {
    spectators: {
      executor: 'ramping-arrival-rate',
      startRate: 20,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    http_req_failed: ['rate<0.005'],
    errors: ['rate<0.01'],
    not_modified: ['rate>0.5'], // after warm-up, > 50 % should be 304s
  },
};

let etags = {};

function getWithEtag(url, tag) {
  const headers = {};
  if (etags[url]) headers['If-None-Match'] = etags[url];
  const res = http.get(url, { headers, tags: { endpoint: tag } });
  if (res.headers.Etag) etags[url] = res.headers.Etag;
  if (res.status === 304) notModifiedRate.add(1);
  else notModifiedRate.add(0);
  return res;
}

export default function () {
  const res1 = getWithEtag(`${BASE_URL}/api/reference-data`, 'reference-data');
  check(res1, { 'reference 200/304': (r) => r.status === 200 || r.status === 304 }) ||
    errRate.add(1);

  if (EVENT) {
    const res2 = getWithEtag(
      `${BASE_URL}/api/public/events/${EVENT}`,
      'public_event',
    );
    check(res2, { 'event 200/304': (r) => r.status === 200 || r.status === 304 }) ||
      errRate.add(1);
  }

  if (STREAM) {
    const res3 = getWithEtag(
      `${BASE_URL}/api/public/streaming/overlay/${STREAM}`,
      'overlay',
    );
    check(res3, { 'overlay 200/304': (r) => r.status === 200 || r.status === 304 }) ||
      errRate.add(1);
  }

  // Spectator dwell time between refreshes
  sleep(2 + Math.random() * 3);
}
