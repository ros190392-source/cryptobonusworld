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

async function requestWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: options.redirect || 'follow',
        headers: {
          'user-agent': 'CBW-Production-Live-Smoke/1.0',
          accept: 'text/html,application/xhtml+xml',
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
  const response = await requestWithRetry(url);
  assert(response.status >= 200 && response.status < 300, `${pathname}: expected 2xx, got ${response.status}`);
  const html = await response.text();
  assert(html.length > 100, `${pathname}: unexpectedly short HTML response`);
  assert(!/verified offer/i.test(html), `${pathname}: unsupported "Verified offer" label leaked to production`);
  return html;
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
      assert(
        target.toString() === new URL(expectedDestination).toString(),
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
    assert(!/verified offer/i.test(body), `/go/${slug}/: unsupported "Verified offer" label leaked`);
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

assert(!/verified offer/i.test(homepageHtml), '/: unsupported "Verified offer" label leaked');

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
