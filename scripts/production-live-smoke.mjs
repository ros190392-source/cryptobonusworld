#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const BASE_URL = new URL(process.env.CBW_PRODUCTION_BASE_URL || 'https://cryptobonusworld.com');
const exchanges = JSON.parse(readFileSync(resolve(ROOT, 'src/data/exchanges.json'), 'utf8'));

if (!Array.isArray(exchanges)) throw new Error('src/data/exchanges.json must be an array');

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

// Detect the forbidden public STATUS LABEL, not explanatory prose that merely
// contains the same words. This intentionally blocks standalone UI such as
// <span>✓ Verified offer</span> while allowing text like "Verified offers..."
// or "affiliate status never creates a verified offer".
const VERIFIED_OFFER_UI_LABEL = />\s*(?:✓\s*)?verified\s+offer\s*</i;
const hasUnsupportedVerifiedOfferLabel = (html) => VERIFIED_OFFER_UI_LABEL.test(String(html));

const detectorCases = [
  ['<span class="badge">✓ Verified offer</span>', true, 'checkmarked verified-offer badge'],
  ['<span>Verified offer</span>', true, 'plain verified-offer badge'],
  ['<p>Verified offers, research records and profiles remain separate.</p>', false, 'plural explanatory copy'],
  ['<p>Affiliate status never creates a verified offer or improves its position.</p>', false, 'negative explanatory copy'],
];
for (const [html, expected, label] of detectorCases) {
  assert(
    hasUnsupportedVerifiedOfferLabel(html) === expected,
    `verified-offer detector self-test failed: ${label}`,
  );
}

const decodeHtmlUrl = (text) => String(text).replaceAll('&amp;', '&');
const meaningfulHttpUrl = (value) => {
  if (typeof value !== 'string' || value.trim() === '' || value.trim() === '#') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};
const exactDefaultLink = (exchange) => {
  const candidate = exchange?.affiliateLinks?.default || exchange?.affiliateUrl || '';
  return meaningfulHttpUrl(candidate) ? candidate : null;
};
const exactPromoCode = (exchange) => {
  const code = typeof exchange?.promoCode === 'string' ? exchange.promoCode : '';
  return code.trim() ? code : null;
};

const SMOKE_BASE = `${String(process.env.GITHUB_SHA || 'manual').slice(0, 12)}-${Date.now()}`;
let requestSequence = 0;

function cacheBustedUrl(input) {
  const url = new URL(input);
  requestSequence += 1;
  url.searchParams.set('__cbw_smoke', `${SMOKE_BASE}-${requestSequence}`);
  return url;
}

function cacheMetadata(response) {
  return [
    ['cf-cache-status', response.headers.get('cf-cache-status')],
    ['age', response.headers.get('age')],
    ['x-cache', response.headers.get('x-cache')],
    ['cache-control', response.headers.get('cache-control')],
  ]
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}=${value}`)
    .join(', ') || 'no-cache-metadata';
}

async function requestWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const requestUrl = cacheBustedUrl(url);
      const response = await fetch(requestUrl, {
        redirect: options.redirect || 'follow',
        headers: {
          'user-agent': 'CBW-Production-Live-Smoke/1.3',
          accept: 'text/html,application/xhtml+xml',
          'cache-control': 'no-cache, no-store, max-age=0',
          pragma: 'no-cache',
        },
      });
      if (response.status >= 500 && attempt < 5) {
        await sleep(attempt * 1500);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 5) await sleep(attempt * 1500);
    }
  }
  throw lastError || new Error(`request failed: ${url}`);
}

async function getHtml(pathname) {
  const url = new URL(pathname, BASE_URL);
  let unsupportedLabelSeen = false;
  let lastMeta = 'no-cache-metadata';

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await requestWithRetry(url);
    assert(response.status >= 200 && response.status < 300, `${pathname}: expected 2xx, got ${response.status}`);
    const html = await response.text();
    assert(html.length > 100, `${pathname}: unexpectedly short HTML response`);

    if (!hasUnsupportedVerifiedOfferLabel(html)) return html;

    unsupportedLabelSeen = true;
    lastMeta = cacheMetadata(response);
    if (attempt < 5) {
      console.warn(`${pathname}: unsupported Verified-offer UI label seen on live attempt ${attempt}/5 (${lastMeta}); retrying with a fresh cache-buster`);
      await sleep(attempt * 2000);
      continue;
    }
  }

  assert(!unsupportedLabelSeen, `${pathname}: unsupported "Verified offer" UI label leaked to production after cache-busted retries (${lastMeta})`);
  throw new Error(`${pathname}: live HTML verification failed`);
}

function withoutInjectedSmokeParam(url) {
  const normalized = new URL(url);
  normalized.searchParams.delete('__cbw_smoke');
  return normalized;
}

async function verifyGoRoute(slug, expectedDestination) {
  let current = new URL(`/go/${slug}/`, BASE_URL);
  for (let hop = 0; hop < 3; hop += 1) {
    const response = await requestWithRetry(current, { redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      assert(location, `/go/${slug}/: ${response.status} response missing Location`);
      const target = new URL(location, current);
      if (target.origin === BASE_URL.origin) {
        current = target;
        continue;
      }
      const normalizedTarget = withoutInjectedSmokeParam(target);
      assert(
        normalizedTarget.toString() === new URL(expectedDestination).toString(),
        `/go/${slug}/: external Location does not equal exact owner-confirmed destination`,
      );
      return;
    }

    assert(response.status >= 200 && response.status < 300, `/go/${slug}/: expected 2xx/3xx, got ${response.status}`);
    const body = decodeHtmlUrl(await response.text());
    assert(
      body.includes(expectedDestination),
      `/go/${slug}/: rendered route does not contain exact owner-confirmed destination`,
    );
    assert(!hasUnsupportedVerifiedOfferLabel(body), `/go/${slug}/: unsupported "Verified offer" UI label leaked`);
    return;
  }
  throw new Error(`/go/${slug}/: exceeded internal redirect limit`);
}

console.log(`CBW live smoke: ${BASE_URL.origin}`);

const homepageHtml = await getHtml('/');
const promoHtml = await getHtml('/promo-codes/');
await getHtml('/exchanges/');

for (const slug of ['bybit', 'mexc', 'okx', 'coinex']) {
  const exchange = exchanges.find((item) => item?.slug === slug);
  if (exchange) await getHtml(`/${slug}/`);
}

for (const slug of ['bybit', 'mexc', 'bitget', 'coinex']) {
  const exchange = exchanges.find((item) => item?.slug === slug);
  const code = exchange ? exactPromoCode(exchange) : null;
  if (!code) continue;
  assert(
    promoHtml.includes(code),
    `/promo-codes/: exact-case owner-confirmed promo code missing for ${slug}: ${code}`,
  );
}

assert(!hasUnsupportedVerifiedOfferLabel(homepageHtml), '/: unsupported "Verified offer" UI label leaked');

const commercialCandidates = exchanges
  .map((exchange) => ({
    slug: exchange?.slug,
    destination: exactDefaultLink(exchange),
  }))
  .filter((item) => typeof item.slug === 'string' && item.slug && item.destination);

assert(commercialCandidates.length > 0, 'No current commercial candidates discovered from exchanges.json');

for (const candidate of commercialCandidates) {
  await verifyGoRoute(candidate.slug, candidate.destination);
}

console.log(`CBW LIVE SMOKE PASS — pages=7, goRoutes=${commercialCandidates.length}`);
