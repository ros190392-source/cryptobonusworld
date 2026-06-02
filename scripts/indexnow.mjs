#!/usr/bin/env node
/**
 * CryptoBonusWorld — IndexNow Submission
 *
 * Notifies Bing and Yandex when pages are created or updated.
 * Uses the IndexNow protocol: https://www.indexnow.org/
 *
 * Usage:
 *   node scripts/indexnow.mjs                       # submit all site URLs
 *   node scripts/indexnow.mjs --exchange bybit       # submit one exchange + related
 *   node scripts/indexnow.mjs --mode priority        # top-tier pages only
 *   node scripts/indexnow.mjs --mode evidence        # all exchange/evidence pages
 *   node scripts/indexnow.mjs --urls /a/ /b/         # submit specific paths
 *   node scripts/indexnow.mjs --dry-run              # preview, no network calls
 *   node scripts/indexnow.mjs --engines bing         # only Bing (skip Yandex)
 *   node scripts/indexnow.mjs --help
 *
 * Exit codes:
 *   0 — All submissions succeeded (or dry-run)
 *   1 — One or more submissions failed
 *   2 — Fatal error (bad key, bad config)
 */

import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname }   from 'path';
import { fileURLToPath }   from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────────────────

const SITE         = 'https://cryptobonusworld.com';
const INDEXNOW_KEY = 'a1b2c3d4e5f6789012345678901234ab';
const KEY_LOCATION = `${SITE}/${INDEXNOW_KEY}.txt`;
const LOG_DIR      = join(ROOT, 'logs');
const LOG_FILE     = join(LOG_DIR, 'indexnow-submissions.jsonl');

/**
 * IndexNow engines.
 * api.indexnow.org is the unified endpoint — submitting there distributes
 * to Bing, Seznam, Naver, and other participants automatically.
 * Yandex has a direct endpoint that processes independently.
 */
const ALL_ENGINES = [
  { id: 'indexnow', name: 'IndexNow (Bing/Seznam/Naver)', url: 'https://api.indexnow.org/indexnow' },
  { id: 'yandex',   name: 'Yandex',                       url: 'https://yandex.com/indexnow'       },
];

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flags = {
  exchange:   argv.includes('--exchange')  ? (argv[argv.indexOf('--exchange')  + 1] || null) : null,
  mode:       argv.includes('--mode')      ? (argv[argv.indexOf('--mode')      + 1] || 'all') : 'all',
  dryRun:     argv.includes('--dry-run'),
  help:       argv.includes('--help'),
  enginesArg: argv.includes('--engines')   ? (argv[argv.indexOf('--engines')   + 1] || null) : null,
  urls:      (() => {
    const idx = argv.indexOf('--urls');
    if (idx === -1) return [];
    const out = [];
    for (let i = idx + 1; i < argv.length && !argv[i].startsWith('--'); i++) out.push(argv[i]);
    return out;
  })(),
  silent:    argv.includes('--silent'),
};

const ACTIVE_ENGINES = flags.enginesArg
  ? ALL_ENGINES.filter(e => flags.enginesArg.split(',').includes(e.id))
  : ALL_ENGINES;

if (flags.help) {
  console.log(`
IndexNow Submission — CryptoBonusWorld

Usage:
  node scripts/indexnow.mjs [options]

Options:
  --exchange <slug>    Submit one exchange + all related pages
  --mode all           Submit all site pages (default)
  --mode priority      Submit top-tier pages only
  --mode evidence      Submit all exchange/evidence pages
  --urls /a/ /b/       Submit specific paths (space-separated)
  --engines bing       Only submit to specified engine (bing | yandex)
  --dry-run            Preview what would be submitted — no network calls
  --silent             Suppress console output (useful when called from deploy)
  --help               Show this help

Exit codes:
  0 — All submissions succeeded (or dry-run)
  1 — One or more submissions failed
  2 — Fatal config error
`);
  process.exit(0);
}

// ── Load data ─────────────────────────────────────────────────────────────────

function loadJSON(relativePath) {
  try {
    return JSON.parse(readFileSync(join(ROOT, relativePath), 'utf8'));
  } catch (e) {
    console.error(`Failed to load ${relativePath}: ${e.message}`);
    return [];
  }
}

const exchanges   = loadJSON('src/data/exchanges.json');
const categories  = loadJSON('src/data/categories.json');
const countries   = loadJSON('src/data/countries.json');
const comparePairs= loadJSON('src/data/compare-pairs.json');
const guides      = loadJSON('src/data/guides.json');

// Bonus codes slug list (just use exchanges that have bonus codes in bonus-codes.ts)
// We can safely re-derive this from exchange slugs since all have bonus pages
const bonusCodeSlugs = (() => {
  try {
    const raw = readFileSync(join(ROOT, 'src/data/bonus-codes.ts'), 'utf8');
    const matches = [...raw.matchAll(/exchangeSlug:\s*['"]([^'"]+)['"]/g)];
    return matches.map(m => m[1]);
  } catch { return []; }
})();

// ── URL builders ──────────────────────────────────────────────────────────────

function abs(path) {
  return `${SITE}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * All site URLs grouped by tier for selective submission.
 */
function buildUrlSets() {
  // Tier 1 — highest intent, submit most frequently
  const tier1 = [
    '/',
    '/exchanges/',
    '/bonuses/',
    '/bonus-codes/',
    ...exchanges.map(e => `/exchanges/${e.slug}/`),
    ...exchanges.map(e => `/bonuses/${e.slug}-bonus/`),
    ...bonusCodeSlugs.map(s => `/bonus-codes/${s}/`),
  ];

  // Tier 2 — compare pages, guides, categories
  const tier2 = [
    '/compare/',
    '/guides/',
    '/categories/',
    ...comparePairs.map(p => `/compare/${p.pair}/`),
    ...guides.map(g => `/guides/${g.slug}/`),
    ...categories.map(c => `/categories/${c.slug}/`),
  ];

  // Tier 3 — supporting pages
  const tier3 = [
    '/countries/',
    '/coins/',
    '/use-cases/',
    '/reviewers/',
    '/methodology/',
    '/about/',
    ...countries.map(c => `/countries/${c.slug}/`),
  ];

  return { tier1, tier2, tier3 };
}

/**
 * Get URLs for a specific exchange + all related pages.
 */
function buildExchangeUrls(slug) {
  const urls = [
    `/exchanges/${slug}/`,
    `/bonuses/${slug}-bonus/`,
  ];
  if (bonusCodeSlugs.includes(slug)) {
    urls.push(`/bonus-codes/${slug}/`);
  }
  // Compare pages involving this exchange
  const compares = comparePairs
    .filter(p => p.pair.includes(slug))
    .map(p => `/compare/${p.pair}/`);
  return [...urls, ...compares];
}

/**
 * Resolve CLI flags to a URL list.
 */
function resolveUrls() {
  // Explicit URL paths from --urls flag
  if (flags.urls.length > 0) {
    return flags.urls.map(u => u.startsWith('http') ? u : abs(u));
  }

  // Specific exchange
  if (flags.exchange) {
    const ex = exchanges.find(e => e.slug === flags.exchange);
    if (!ex) {
      console.error(`Exchange not found: ${flags.exchange}`);
      console.error(`Available: ${exchanges.map(e => e.slug).join(', ')}`);
      process.exit(2);
    }
    return buildExchangeUrls(flags.exchange).map(abs);
  }

  const { tier1, tier2, tier3 } = buildUrlSets();

  if (flags.mode === 'priority') return tier1.map(abs);
  if (flags.mode === 'evidence') return [...tier1, ...tier2].filter(u =>
    u.includes('/exchanges/') || u.includes('/bonuses/') || u.includes('/compare/')
  ).map(abs);

  // Default: all
  return [...tier1, ...tier2, ...tier3].map(abs);
}

// ── Logging ───────────────────────────────────────────────────────────────────

function ensureLogDir() {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
}

function writeLog(entry) {
  try {
    ensureLogDir();
    appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch (e) {
    if (!flags.silent) console.warn(`⚠ Could not write log: ${e.message}`);
  }
}

// ── Submission ────────────────────────────────────────────────────────────────

/**
 * POST to a single IndexNow engine endpoint.
 * Returns { engine, status, ok, message }.
 */
async function submitToEngine(engine, urlList) {
  const body = {
    host:        'cryptobonusworld.com',
    key:         INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  if (!flags.silent) {
    console.log(`\n  → ${engine.name} (${urlList.length} URLs)`);
  }

  try {
    const res = await fetch(engine.url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body:    JSON.stringify(body),
    });

    let message = res.statusText;
    try {
      const text = await res.text();
      if (text) message = text.slice(0, 200);
    } catch {}

    const result = {
      engine:    engine.id,
      engineUrl: engine.url,
      status:    res.status,
      ok:        res.status === 200 || res.status === 202,
      message:   message || res.statusText,
      urlCount:  urlList.length,
    };

    if (!flags.silent) {
      const icon = result.ok ? '✅' : '❌';
      console.log(`     ${icon}  HTTP ${res.status} — ${message}`);
    }

    return result;
  } catch (e) {
    const result = {
      engine:    engine.id,
      engineUrl: engine.url,
      status:    0,
      ok:        false,
      message:   e.message,
      urlCount:  urlList.length,
    };
    if (!flags.silent) console.log(`     ❌  Network error — ${e.message}`);
    return result;
  }
}

/**
 * Chunk an array into batches of maxSize.
 * IndexNow accepts up to 10,000 URLs per request but we stay under 500 per batch
 * to stay well within any undocumented limits.
 */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Verification ──────────────────────────────────────────────────────────────

async function verifyKeyFile() {
  const localPath = join(ROOT, 'public', `${INDEXNOW_KEY}.txt`);
  const localExists = existsSync(localPath);

  if (!localExists) {
    return { ok: false, message: `Key file not found locally at public/${INDEXNOW_KEY}.txt` };
  }

  const localContent = readFileSync(localPath, 'utf8').trim();
  if (localContent !== INDEXNOW_KEY) {
    return { ok: false, message: `Key file content mismatch: "${localContent}" ≠ "${INDEXNOW_KEY}"` };
  }

  // Attempt to fetch the live key file (non-fatal if offline)
  try {
    const res = await fetch(`${SITE}/${INDEXNOW_KEY}.txt`);
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text !== INDEXNOW_KEY) {
        return { ok: false, message: `Live key file mismatch: "${text}" ≠ "${INDEXNOW_KEY}"` };
      }
      return { ok: true, message: 'Key file accessible and valid on production' };
    }
    return { ok: false, message: `Key file HTTP ${res.status} on production` };
  } catch (e) {
    return { ok: true, message: `Key file valid locally (could not verify live: ${e.message})` };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function submitIndexNow(overrideUrls, opts = {}) {
  const silent  = opts.silent  ?? flags.silent;
  const dryRun  = opts.dryRun  ?? flags.dryRun;
  const engines = opts.engines ?? ACTIVE_ENGINES;

  // When called programmatically (e.g. from deploy.mjs), use the opts.mode
  // override instead of the CLI flags (which would read deploy.mjs's argv).
  const effectiveMode = opts.mode ?? flags.mode;
  const urls = overrideUrls ?? (() => {
    const { tier1, tier2, tier3 } = buildUrlSets();
    if (effectiveMode === 'priority') return tier1.map(abs);
    if (effectiveMode === 'evidence') return [...tier1, ...tier2]
      .filter(u => u.includes('/exchanges/') || u.includes('/bonuses/') || u.includes('/compare/'))
      .map(abs);
    return [...tier1, ...tier2, ...tier3].map(abs);
  })();

  if (!silent) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  CryptoBonusWorld — IndexNow Submit`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Mode:    ${flags.exchange ? `exchange:${flags.exchange}` : flags.mode}`);
    console.log(`  URLs:    ${urls.length}`);
    console.log(`  Engines: ${engines.map(e => e.name).join(', ')}`);
    console.log(`  DryRun:  ${dryRun}`);
    if (dryRun) {
      console.log('\n  Sample URLs:');
      urls.slice(0, 10).forEach(u => console.log(`    ${u}`));
      if (urls.length > 10) console.log(`    … and ${urls.length - 10} more`);
      console.log('\n  ✓ Dry run complete — no submissions made\n');
      return { ok: true, results: [] };
    }
  }

  const batches = chunk(urls, 500);
  const allResults = [];
  let anyFailed = false;

  for (const engine of engines) {
    for (const batch of batches) {
      const result = await submitToEngine(engine, batch);
      const logEntry = {
        ts:       new Date().toISOString(),
        exchange: flags.exchange ?? null,
        mode:     flags.mode,
        ...result,
      };
      writeLog(logEntry);
      allResults.push(logEntry);
      if (!result.ok) anyFailed = true;
    }
  }

  if (!silent) {
    const ok = allResults.filter(r => r.ok).length;
    const fail = allResults.filter(r => !r.ok).length;
    console.log(`\n  Summary: ${ok} succeeded, ${fail} failed`);
    console.log(`  Log: ${LOG_FILE}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  return { ok: !anyFailed, results: allResults };
}

// CLI entry point
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // Verify key file first
  if (!flags.silent) console.log('\n🔑  Verifying IndexNow key file…');
  const keyCheck = await verifyKeyFile();
  if (!flags.silent) {
    console.log(`  ${keyCheck.ok ? '✅' : '⚠️'}  ${keyCheck.message}`);
  }

  const { ok } = await submitIndexNow();
  // Use exitCode instead of process.exit() to avoid Windows libuv handle
  // assertion error when fetch connections are still resolving
  if (!ok) process.exitCode = 1;
}
