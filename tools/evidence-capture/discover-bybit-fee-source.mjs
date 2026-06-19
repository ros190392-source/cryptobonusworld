/**
 * CBW Bybit Fee Source Discovery
 *
 * Tests official Bybit candidate URLs, scores each on fee-content signals,
 * and outputs a ranked discovery report.
 *
 * Usage:
 *   node tools/evidence-capture/discover-bybit-fee-source.mjs
 *   node tools/evidence-capture/discover-bybit-fee-source.mjs --cdp-port=9222
 *   node tools/evidence-capture/discover-bybit-fee-source.mjs --runner=eu-vps
 *
 * Output:
 *   evidence/bybit/global-en/report/fee-source-discovery-report.json
 *
 * Only bybit.com URLs are tested. No third-party sources.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');

// ── Args ──────────────────────────────────────────────────────────────────────
const ARGS = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k,v] = a.slice(2).split('='); return [k, v ?? true]; })
);
const CDP_PORT = ARGS['cdp-port'] ?? '9222';
const RUNNER   = ARGS['runner'] ?? 'local-windows';
const VIEWPORT = { width: 1440, height: 900 };

// ── Known candidate URLs ──────────────────────────────────────────────────────
// Global preferred (bybit.com/en/) — announcement-info/fee-rate is #1 priority
const GLOBAL_CANDIDATES = [
  'https://www.bybit.com/en/announcement-info/fee-rate',   // #1 priority: official Trading Fees page
  'https://www.bybit.com/en/announcement-info/fee-rate/',  // trailing-slash variant
  'https://www.bybit.com/en/fee/trading',
  'https://www.bybit.com/en/help-center/article/Trading-Fee-Structure',
  'https://www.bybit.com/en/help-center/article/Trading-Fee-Structure-on-Bybit',
  'https://www.bybit.com/en/help-center/article/Bybit-Spot-Fees-Explained',
  'https://www.bybit.com/en/help-center/article/Perpetual-Futures-Contract-Fees-Explained',
  'https://www.bybit.com/en/help-center/article/Bybit-Fees-You-Need-to-Know',
];

// Official regional variants — diagnostic only; not used for global-en verification
const REGIONAL_CANDIDATES = [
  'https://www.bybit.eu/en-EU/announcement-info/fee-rate/',
  'https://www.bybit.kz/en-KAZ/help-center/article/Bybit-Spot-Fees-Explained',
];

const STATIC_CANDIDATES = [...GLOBAL_CANDIDATES, ...REGIONAL_CANDIDATES];

// ── Fee content signals ───────────────────────────────────────────────────────
const SCORE_TERMS = {
  // Strong fee signals (+3 each)
  'maker':       3, 'Maker':       3,
  'taker':       3, 'Taker':       3,
  // Market type signals (+2 each)
  'Spot':        2, 'spot':        2,
  'Perpetual':   2, 'perpetual':   2,
  'Futures':     2, 'futures':     2,
  'Options':     2, 'options':     2,
  // Percentage signals (+4 each — strongest indicator)
  '0.055%':      4,
  '0.02%':       4,
  '0.1%':        4,
  '0.10%':       3,
  '0.020%':      3,
  '0.030%':      3,
};

const NEGATIVE_PATTERNS = [
  { pattern: /^https:\/\/www\.bybit\.com\/en\/?$/, reason: 'redirected_home' },
  { pattern: /not supported on this site/i,        reason: 'geo_blocked' },
  { pattern: /enable javascript/i,                 reason: 'js_required' },
  { pattern: /access denied/i,                     reason: 'blocked' },
  { pattern: /captcha/i,                           reason: 'captcha' },
];

// ── Scoring ───────────────────────────────────────────────────────────────────
function isRegionalUrl(url) {
  return url.includes('bybit.eu') || url.includes('bybit.kz');
}

function scorePage({ text, finalUrl, startUrl }) {
  let score = 0;
  const found = [];
  const missing = [];
  const regional = isRegionalUrl(startUrl) || isRegionalUrl(finalUrl);

  // URL bonus
  if (/fee|trading|fee-rate/.test(finalUrl)) score += 2;
  if (finalUrl.includes('help-center')) score += 1;

  // Domain check — must be bybit.com, bybit.eu, or bybit.kz
  if (!finalUrl.includes('bybit.com') && !finalUrl.includes('bybit.eu') && !finalUrl.includes('bybit.kz')) {
    return { score: -999, found, missing, status: 'wrong_domain', regional };
  }

  // Content signals
  for (const [term, pts] of Object.entries(SCORE_TERMS)) {
    if (text.includes(term)) { score += pts; found.push(term); }
    else missing.push(term);
  }

  // Negative patterns
  for (const { pattern, reason } of NEGATIVE_PATTERNS) {
    if (pattern.test(finalUrl) || pattern.test(text)) {
      score -= 20;
      return { score, found, missing, status: reason, regional };
    }
  }

  // Text length penalty
  if (text.length < 300) score -= 10;
  if (text.length < 800) score -= 5;

  // Determine status
  const hasFeePercent = found.some(t => ['0.055%','0.02%','0.1%','0.10%'].includes(t));
  const hasMakerTaker = found.some(t => ['maker','Maker'].includes(t)) &&
                        found.some(t => ['taker','Taker'].includes(t));

  let status;
  if (hasFeePercent && hasMakerTaker) status = regional ? 'official_regional_reference' : 'candidate_match';
  else if (hasFeePercent || hasMakerTaker) status = regional ? 'official_regional_reference' : 'candidate_partial';
  else if (text.length < 500) status = 'no_fee_data';
  else status = 'no_fee_data';

  return { score, found, missing, status, regional };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const OUT_REPORT = path.join(ROOT, 'evidence', 'bybit', 'global-en', 'report', 'fee-source-discovery-report.json');
fs.mkdirSync(path.dirname(OUT_REPORT), { recursive: true });

const timestamp = new Date().toISOString();
console.log('\nCBW Bybit Fee Source Discovery');
console.log(`Runner:    ${RUNNER}`);
console.log(`Timestamp: ${timestamp}`);
console.log(`CDP:       http://127.0.0.1:${CDP_PORT}`);
console.log();

// Connect CDP
let browser;
try {
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  console.log('  ✅ Connected to Chrome CDP');
} catch (err) {
  console.error(`  ❌ CDP failed: ${err.message.split('\n')[0]}`);
  console.error('     Start Chrome: chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\\cbw-chrome-profile');
  process.exit(1);
}

const context  = browser.contexts()[0] ?? await browser.newContext();

// ── Discover links from main page ─────────────────────────────────────────────
let discoveredLinks = [];
try {
  console.log('  ℹ️  Scanning bybit.com/en/ for fee links …');
  const mainPage = await context.newPage();
  await mainPage.setViewportSize(VIEWPORT);
  await mainPage.goto('https://www.bybit.com/en/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await mainPage.waitForTimeout(3000);

  discoveredLinks = await mainPage.evaluate(() => {
    const FEE_KEYWORDS = ['fee', 'fees', 'fee-rate', 'trading-fee', 'maker', 'taker', 'spot', 'futures', 'perpetual', 'options'];
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => a.href)
      .filter(href => href.startsWith('https://www.bybit.com'))
      .filter(href => FEE_KEYWORDS.some(kw => href.toLowerCase().includes(kw)))
      .filter((href, i, arr) => arr.indexOf(href) === i)
      .slice(0, 10);
  });

  console.log(`  ✅ Found ${discoveredLinks.length} fee-related links from main page`);
  discoveredLinks.forEach(l => console.log(`     ${l}`));
  await mainPage.close();
} catch (err) {
  console.log(`  ⚠️  Main page scan failed: ${err.message.split('\n')[0]}`);
}

// ── Combine and deduplicate candidates ───────────────────────────────────────
const allCandidates = [...new Set([...STATIC_CANDIDATES, ...discoveredLinks])]
  .filter(url => url.startsWith('https://www.bybit.com'));

console.log(`\n  Testing ${allCandidates.length} candidates …\n`);

// ── Test each candidate ───────────────────────────────────────────────────────
const results = [];

for (const url of allCandidates) {
  console.log(`  ── ${url}`);
  const page = await context.newPage();
  await page.setViewportSize(VIEWPORT);
  let result = { url, startUrl: url, finalUrl: url, textLength: 0, found: [], missing: [], score: -999, status: 'error', error: null };

  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(6000);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(2000);

    result.finalUrl   = page.url();
    result.httpStatus = resp?.status() ?? null;
    result.text       = await page.evaluate(() => document.body.innerText);
    result.textLength = result.text.length;

    const scored = scorePage({ text: result.text, finalUrl: result.finalUrl, startUrl: url });
    result.score   = scored.score;
    result.found   = scored.found;
    result.missing = scored.missing;
    result.status  = scored.status;
    result.redirected = result.finalUrl !== url;

    console.log(`     Final URL:  ${result.finalUrl}`);
    console.log(`     Text:       ${result.textLength} chars`);
    console.log(`     Score:      ${result.score}`);
    console.log(`     Status:     ${result.status}`);
    if (result.found.length) console.log(`     Found:      ${result.found.slice(0,8).join(', ')}`);

    delete result.text; // don't store full text in results array
  } catch (err) {
    result.status = 'error';
    result.error  = err.message.split('\n')[0];
    console.log(`     ERROR: ${result.error}`);
  } finally {
    await page.close();
  }

  results.push(result);
}

await browser.close();

// ── Rank and select best ──────────────────────────────────────────────────────
results.sort((a, b) => b.score - a.score);
const globalResults   = results.filter(r => !isRegionalUrl(r.url));
const regionalResults = results.filter(r => isRegionalUrl(r.url));

const bestGlobal   = globalResults[0];
const bestRegional = regionalResults.find(r => r.status === 'official_regional_reference');

const bestIsGlobal   = ['candidate_match', 'candidate_partial'].includes(bestGlobal?.status);
const bestIsRegional = !!bestRegional;
const best = bestGlobal ?? results[0];
const bestIsUsable = bestIsGlobal || bestIsRegional;

console.log('\n══ DISCOVERY RESULT ══════════════════════════════════════════════');
if (bestIsGlobal) {
  console.log(`  ✅ Best GLOBAL candidate: ${bestGlobal.url}`);
  console.log(`     Score: ${bestGlobal.score} | Status: ${bestGlobal.status}`);
  console.log(`     Fee terms found: ${bestGlobal.found.join(', ')}`);
} else if (bestIsRegional) {
  console.log(`  ⚠️  No global source accessible. Best REGIONAL: ${bestRegional.url}`);
  console.log(`     Status: ${bestRegional.status} — diagnostic only, NOT for global-en verification`);
} else {
  console.log('  ❌ No usable fee source found from this runner/IP.');
  console.log(`     Best attempt: ${best?.url} (score: ${best?.score}, status: ${best?.status})`);
  console.log('  → Try another approved runner/IP where public Bybit fee pages are accessible.');
}

// ── Write report ──────────────────────────────────────────────────────────────
const report = {
  generated_at: timestamp,
  runner: RUNNER,
  candidates_tested: allCandidates.length,
  global_candidates_tested: GLOBAL_CANDIDATES.length,
  regional_candidates_tested: REGIONAL_CANDIDATES.length,
  discovered_from_main_page: discoveredLinks,
  best_global_candidate:   bestIsGlobal ? { url: bestGlobal.url, score: bestGlobal.score, status: bestGlobal.status, found: bestGlobal.found } : null,
  best_regional_candidate: bestIsRegional ? { url: bestRegional.url, score: bestRegional.score, status: bestRegional.status, found: bestRegional.found } : null,
  best_candidate: bestIsGlobal
    ? { url: bestGlobal.url, score: bestGlobal.score, status: bestGlobal.status, found: bestGlobal.found }
    : bestIsRegional
      ? { url: bestRegional.url, score: bestRegional.score, status: 'official_regional_reference', found: bestRegional.found }
      : null,
  recommendation: bestIsGlobal
    ? `Use ${bestGlobal.url} as global-en evidence source`
    : bestIsRegional
      ? `Global geo-blocked. Regional reference available at ${bestRegional.url} — diagnostic only, not for global-en verified status`
      : 'All candidates geo-blocked or no fee data. Run from unblocked IP.',
  results: results.map(r => ({
    url:        r.url,
    finalUrl:   r.finalUrl,
    httpStatus: r.httpStatus,
    redirected: r.redirected,
    textLength: r.textLength,
    found:      r.found,
    score:      r.score,
    status:     r.status,
    regional:   isRegionalUrl(r.url),
    error:      r.error ?? undefined,
  })),
};

fs.writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2), 'utf8');
console.log(`\n  Report: ${path.relative(ROOT, OUT_REPORT)}`);
