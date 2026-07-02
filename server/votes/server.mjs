#!/usr/bin/env node
/**
 * cbw-votes — minimal exchange-code voting API for cryptobonusworld.com
 *
 * Runs as a systemd service on 127.0.0.1:8787 behind nginx
 * (location = /api/exchange-votes → proxy_pass). The static site deploy
 * (scripts/deploy.mjs) never touches this service or its data.
 *
 * Storage: single JSON file (default /var/lib/cbw-votes/votes.json),
 * atomic tmp+rename writes, debounced. Safe because this is a single
 * Node process — all requests are serialized on the event loop.
 *
 * Privacy: votes are keyed by a random client-generated UUID (no personal
 * data). IPs are used only for in-memory rate limiting and never persisted.
 *
 * API:
 *   GET  /api/exchange-votes?exchange=bybit   (header X-CBW-User: <uuid>)
 *   POST /api/exchange-votes  {exchange, type:'rating', rating:1..5}
 *                             {exchange, type:'helpful', helpful:'works'|'didnt_work'}
 *   Both return the aggregate:
 *   { exchange, ratingCount, averageRating, worksCount, didntWorkCount,
 *     userRating, userHelpfulVote }
 */

import http from 'node:http';
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const PORT = Number(process.env.CBW_VOTES_PORT || 8787);
const HOST = '127.0.0.1';
const DATA_FILE = process.env.CBW_VOTES_DATA || '/var/lib/cbw-votes/votes.json';

const SLUGS = new Set(['bybit', 'mexc', 'okx', 'bitget', 'kucoin', 'bingx']);
const USER_KEY_RE = /^[0-9a-fA-F-]{16,64}$/;
const MAX_BODY = 4096;

// Rate limit: per-IP sliding window, in-memory only (never persisted).
const RATE_LIMIT = 30;            // requests
const RATE_WINDOW_MS = 60_000;    // per minute
const rateMap = new Map();
function rateLimited(ip) {
  const now = Date.now();
  let e = rateMap.get(ip);
  if (!e || now > e.resetAt) { e = { count: 0, resetAt: now + RATE_WINDOW_MS }; rateMap.set(ip, e); }
  e.count++;
  if (rateMap.size > 10_000) {           // bound memory
    for (const [k, v] of rateMap) if (now > v.resetAt) rateMap.delete(k);
  }
  return e.count > RATE_LIMIT;
}

// ── Storage ────────────────────────────────────────────────────────────────
// data.votes[slug][type][userKey] = { rating? , helpful?, createdAt, updatedAt }
let data = { votes: {} };
try {
  if (existsSync(DATA_FILE)) data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  if (!data || typeof data !== 'object' || !data.votes) data = { votes: {} };
} catch (e) {
  console.error(`[cbw-votes] could not read ${DATA_FILE}: ${e.message} — starting empty`);
  data = { votes: {} };
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(saveNow, 250);
}
function saveNow() {
  saveTimer = null;
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.error(`[cbw-votes] save failed: ${e.message}`);
  }
}
process.on('SIGTERM', () => { saveNow(); process.exit(0); });
process.on('SIGINT', () => { saveNow(); process.exit(0); });

// ── Aggregates ─────────────────────────────────────────────────────────────
function aggregate(slug, userKey) {
  const bySlug = data.votes[slug] || {};
  const ratings = bySlug.rating || {};
  const helpful = bySlug.helpful || {};
  let ratingCount = 0, ratingSum = 0, worksCount = 0, didntWorkCount = 0;
  for (const v of Object.values(ratings)) { ratingCount++; ratingSum += v.rating; }
  for (const v of Object.values(helpful)) {
    if (v.helpful === 'works') worksCount++;
    else if (v.helpful === 'didnt_work') didntWorkCount++;
  }
  return {
    exchange: slug,
    ratingCount,
    averageRating: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    worksCount,
    didntWorkCount,
    userRating: (userKey && ratings[userKey]) ? ratings[userKey].rating : null,
    userHelpfulVote: (userKey && helpful[userKey]) ? helpful[userKey].helpful : null,
  };
}

function recordVote(slug, type, userKey, value) {
  const now = new Date().toISOString();
  data.votes[slug] = data.votes[slug] || {};
  data.votes[slug][type] = data.votes[slug][type] || {};
  const bucket = data.votes[slug][type];
  const prev = bucket[userKey];
  bucket[userKey] = {
    ...(type === 'rating' ? { rating: value } : { helpful: value }),
    createdAt: prev ? prev.createdAt : now,
    updatedAt: now,
  };
  scheduleSave();
}

// ── HTTP ───────────────────────────────────────────────────────────────────
function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const ip = req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';
  if (rateLimited(String(ip))) return json(res, 429, { error: 'rate_limited' });

  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/api/exchange-votes') return json(res, 404, { error: 'not_found' });

  const headerKey = String(req.headers['x-cbw-user'] || '');
  const userKey = USER_KEY_RE.test(headerKey) ? headerKey.toLowerCase() : null;

  if (req.method === 'GET') {
    const slug = url.searchParams.get('exchange') || '';
    if (!SLUGS.has(slug)) return json(res, 400, { error: 'invalid_exchange' });
    return json(res, 200, aggregate(slug, userKey));
  }

  if (req.method === 'POST') {
    let body = '';
    let overflow = false;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY) { overflow = true; req.destroy(); }
    });
    req.on('end', () => {
      if (overflow) return;
      let parsed;
      try { parsed = JSON.parse(body); } catch { return json(res, 400, { error: 'invalid_json' }); }
      const slug = String(parsed.exchange || '');
      if (!SLUGS.has(slug)) return json(res, 400, { error: 'invalid_exchange' });
      if (!userKey) return json(res, 400, { error: 'missing_user_key' });

      if (parsed.type === 'rating') {
        const r = parsed.rating;
        if (!Number.isInteger(r) || r < 1 || r > 5) return json(res, 400, { error: 'invalid_rating' });
        recordVote(slug, 'rating', userKey, r);
      } else if (parsed.type === 'helpful') {
        const h = parsed.helpful;
        if (h !== 'works' && h !== 'didnt_work') return json(res, 400, { error: 'invalid_helpful' });
        recordVote(slug, 'helpful', userKey, h);
      } else {
        return json(res, 400, { error: 'invalid_type' });
      }
      return json(res, 200, aggregate(slug, userKey));
    });
    return;
  }

  return json(res, 405, { error: 'method_not_allowed' });
});

server.listen(PORT, HOST, () => {
  console.log(`[cbw-votes] listening on http://${HOST}:${PORT} data=${DATA_FILE}`);
});
