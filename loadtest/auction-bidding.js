import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * Auction bidding scenario — high write concurrency, short latencies.
 *
 * Purpose: stress-test the hottest path in the app — the live bidding
 * loop where every team's console races to place bids within a short
 * countdown window. This test simulates 50 VUs (teams) polling live
 * status every second and placing bids every 3-5 seconds.
 *
 * Env:
 *   BASE_URL       — API root
 *   JWT            — bearer token for a workspace member
 *   WORKSPACE_ID   — target workspace UUID
 *   AUCTION_ID     — currently-live auction
 *   TEAM_IDS       — comma-separated team UUIDs to bid from
 *
 * SLOs: sub-300 ms p95 on live-status polls, sub-500 ms p95 on POST /bid.
 */
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const JWT = __ENV.JWT || '';
const WS = __ENV.WORKSPACE_ID || '';
const AUCTION = __ENV.AUCTION_ID || '';
const TEAM_IDS = (__ENV.TEAM_IDS || '').split(',').filter(Boolean);

const bidLatency = new Trend('bid_latency_ms', true);
const pollLatency = new Trend('poll_latency_ms', true);
const errRate = new Rate('errors');

export const options = {
  scenarios: {
    bidders: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
  },
  thresholds: {
    'poll_latency_ms': ['p(95)<300'],
    'bid_latency_ms': ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.05'],
  },
};

const headers = () => ({
  Authorization: `Bearer ${JWT}`,
  'Content-Type': 'application/json',
});

let currentAmount = 0;

export default function () {
  if (!JWT || !WS || !AUCTION) {
    // Fail loudly if the scenario wasn't configured correctly.
    check(null, {
      'JWT/WS/AUCTION provided': () => false,
    });
    errRate.add(1);
    sleep(1);
    return;
  }

  // Poll the live status roughly every second (each VU independently)
  const pollStart = Date.now();
  const pollRes = http.get(
    `${BASE_URL}/api/workspaces/${WS}/auctions/${AUCTION}/live`,
    { headers: headers(), tags: { endpoint: 'poll_live' } },
  );
  pollLatency.add(Date.now() - pollStart);
  const okPoll = check(pollRes, {
    'poll 200': (r) => r.status === 200,
  });
  if (!okPoll) errRate.add(1);

  // Every 3rd iteration, place a bid — approximates a real bidding
  // cadence where teams pause between bumps.
  if (__ITER % 3 === 0 && TEAM_IDS.length > 0) {
    const teamId = TEAM_IDS[__VU % TEAM_IDS.length];
    currentAmount += 5000;
    const bidStart = Date.now();
    const bidRes = http.post(
      `${BASE_URL}/api/workspaces/${WS}/auctions/${AUCTION}/bid`,
      JSON.stringify({ teamId, amount: currentAmount }),
      { headers: headers(), tags: { endpoint: 'place_bid' } },
    );
    bidLatency.add(Date.now() - bidStart);
    // 400 is fine (outbid, budget cap etc.) — only 5xx counts as an error
    check(bidRes, {
      'bid < 500': (r) => r.status < 500,
    }) || errRate.add(1);
  }

  sleep(1);
}
