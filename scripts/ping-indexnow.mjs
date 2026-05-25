#!/usr/bin/env node
/**
 * ping-indexnow.mjs — Submit all priority URLs to IndexNow after deploy.
 *
 * Run:
 *   node scripts/ping-indexnow.mjs
 *   node scripts/ping-indexnow.mjs --top-only   (money pages only, faster)
 *   node scripts/ping-indexnow.mjs --dry-run     (print URLs, no API call)
 *
 * Set INDEXNOW_KEY env var to override the default key.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────────────────
const HOST = 'cryptobonusworld.com';
const KEY = process.env.INDEXNOW_KEY ?? 'a1b2c3d4e5f6789012345678901234ab';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const API = 'https://api.indexnow.org/indexnow';

const TOP_ONLY = process.argv.includes('--top-only');
const DRY_RUN = process.argv.includes('--dry-run');

// ── Load data ─────────────────────────────────────────────────────────────────
function loadJson(relPath) {
  return JSON.parse(readFileSync(join(ROOT, relPath), 'utf-8'));
}

const exchanges = loadJson('src/data/exchanges.json');
const comparePairs = loadJson('src/data/compare-pairs.json');
const guides = loadJson('src/data/guides.json');
const categories = loadJson('src/data/categories.json');

// ── Priority exchange slugs ───────────────────────────────────────────────────
const TOP_EXCHANGES = ['bybit', 'okx', 'mexc', 'phemex', 'kucoin', 'binance', 'bitget', 'bingx'];

// ── Build URL list ────────────────────────────────────────────────────────────
function buildUrls() {
  const urls = [
    '/',
    '/bonuses/',
    '/exchanges/',
    '/compare/',
    '/guides/',
    '/categories/',
  ];

  if (TOP_ONLY) {
    // Money pages only
    for (const slug of TOP_EXCHANGES) {
      urls.push(`/exchanges/${slug}/`);
      urls.push(`/bonuses/${slug}-bonus/`);
    }
    // Top compare pairs (both slugs in top list)
    for (const p of comparePairs) {
      const [a, , b] = p.pair.split('-');
      if (TOP_EXCHANGES.includes(a) && TOP_EXCHANGES.includes(b)) {
        urls.push(`/compare/${p.pair}/`);
      }
    }
    return urls;
  }

  // Full list
  for (const ex of exchanges) {
    urls.push(`/exchanges/${ex.slug}/`);
    urls.push(`/bonuses/${ex.slug}-bonus/`);
  }

  for (const p of comparePairs) {
    urls.push(`/compare/${p.pair}/`);
  }

  for (const g of guides) {
    urls.push(`/guides/${g.slug}/`);
  }

  for (const c of categories) {
    urls.push(`/categories/${c.slug}/`);
  }

  return urls;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const paths = buildUrls();
  const urlList = paths.map(p => `https://${HOST}${p}`);

  console.log(`\n🔔 IndexNow Ping`);
  console.log(`   Mode:  ${TOP_ONLY ? 'top-only' : 'full'}`);
  console.log(`   URLs:  ${urlList.length}`);
  console.log(`   Key:   ${KEY}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] URLs that would be submitted:');
    urlList.forEach(u => console.log('  ', u));
    return;
  }

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  console.log('\nSubmitting to IndexNow API...');

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log(`✅ Success — HTTP ${res.status}. ${urlList.length} URLs submitted.`);
    } else {
      const body = await res.text().catch(() => '');
      console.error(`❌ Failed — HTTP ${res.status} ${res.statusText}`);
      if (body) console.error('   Response:', body.slice(0, 300));
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('❌ Network error:', err.message);
    process.exitCode = 1;
  }
}

main();
