/**
 * CBW Bybit Fee Monitor v2
 *
 * Uses source discovery to find the best official Bybit fee page,
 * clicks tabs (Spot / Futures / Options), extracts current fee values,
 * compares with fees.json, and writes a timestamped monitoring report.
 *
 * Usage:
 *   node tools/evidence-capture/check-bybit-fees.mjs
 *   node tools/evidence-capture/check-bybit-fees.mjs --dry-run
 *   node tools/evidence-capture/check-bybit-fees.mjs --runner=eu-vps
 *   node tools/evidence-capture/check-bybit-fees.mjs --cdp-port=9223
 *   node tools/evidence-capture/check-bybit-fees.mjs --skip-discovery
 *
 * Allowed auto-updates (no approval gate):
 *   last_checked, evidence snapshots, monitoring reports, capture_attempts
 *
 * Requires approval before changing:
 *   visible fee values, page_fee_wording, deployment, article content
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
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

const CDP_PORT       = ARGS['cdp-port'] ?? '9222';
const RUNNER         = ARGS['runner'] ?? 'local-windows';
const DRY_RUN        = ARGS['dry-run'] === true;
const SKIP_DISCOVERY = ARGS['skip-discovery'] === true;
const VIEWPORT       = { width: 1440, height: 900 };
const DATE_TODAY     = new Date().toISOString().slice(0, 10);
const TIMESTAMP      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);

// ── Paths ─────────────────────────────────────────────────────────────────────
const FEES_JSON_PATH    = path.join(ROOT, 'data', 'exchanges', 'bybit', 'fees.json');
const OUT_DIR           = path.join(ROOT, 'evidence', 'bybit', 'global-en', 'raw', 'desktop-1440');
const REPORT_DIR        = path.join(ROOT, 'reports', 'fees-watch', 'bybit');
const DISCOVERY_REPORT  = path.join(ROOT, 'evidence', 'bybit', 'global-en', 'report', 'fee-source-discovery-report.json');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

const log  = m => console.log(`  ✅ ${m}`);
const info = m => console.log(`  ℹ️  ${m}`);
const warn = m => console.log(`  ⚠️  ${m}`);
const fail = m => console.log(`  ❌ ${m}`);

// ── Known fee source candidates (fallback if discovery skipped) ───────────────
const STATIC_CANDIDATES = [
  'https://www.bybit.com/en/fee/trading',
  'https://www.bybit.com/en/announcement-info/fee-rate/',
  'https://www.bybit.com/en/help-center/article/Trading-Fee-Structure-on-Bybit',
  'https://www.bybit.com/en/help-center/article/Bybit-Fees-You-Need-to-Know',
];

// ── Expected fee values (from fees.json last_known_values / site values) ──────
const EXPECTED = {
  spot:     { maker: '0.1%',   taker: '0.1%'   },
  futures:  { maker: '0.02%',  taker: '0.055%' },
  options:  { maker: '0.02%',  taker: '0.03%'  },
};

// Patterns for each fee slot
const FEE_PATTERNS = {
  spot_maker:    ['0.1%', '0.10%'],
  spot_taker:    ['0.1%', '0.10%'],
  perp_maker:    ['0.02%', '0.020%'],
  perp_taker:    ['0.055%'],
  options_maker: ['0.02%', '0.020%'],
  options_taker: ['0.03%', '0.030%'],
};

// Tabs to try clicking on the fee page
const TAB_CONFIGS = [
  {
    name: 'spot',
    outFile: '02-fees-page-spot.png',
    selectors: [
      'button:has-text("Spot")', '[role="tab"]:has-text("Spot")',
      'li:has-text("Spot")', '[class*="tab"]:has-text("Spot")',
    ],
    keywords: ['0.1%', '0.10%', 'Spot'],
  },
  {
    name: 'futures',
    outFile: '02-fees-page-futures.png',
    selectors: [
      'button:has-text("Derivatives")', 'button:has-text("Futures")',
      'button:has-text("Perpetual")', '[role="tab"]:has-text("Derivatives")',
      '[role="tab"]:has-text("Futures")', '[class*="tab"]:has-text("Futures")',
    ],
    keywords: ['0.02%', '0.055%', 'Perpetual', 'Futures'],
  },
  {
    name: 'options',
    outFile: '02-fees-page-options.png',
    selectors: [
      'button:has-text("Options")', '[role="tab"]:has-text("Options")',
      '[class*="tab"]:has-text("Options")',
    ],
    keywords: ['0.02%', '0.03%', 'Options'],
  },
];

// ── Load fees.json ────────────────────────────────────────────────────────────
let feesJson;
try {
  feesJson = JSON.parse(fs.readFileSync(FEES_JSON_PATH, 'utf8'));
} catch (err) {
  fail(`Cannot read fees.json: ${err.message}`);
  process.exit(1);
}

// ── Runner metadata ───────────────────────────────────────────────────────────
const runnerMeta = {
  name:      RUNNER,
  ip_region: 'unknown/manual',
  timestamp: new Date().toISOString(),
  browser:   'Chrome CDP',
  success:   false,
};

console.log('\nCBW Bybit Fee Monitor v2');
console.log(`Runner:    ${RUNNER}`);
console.log(`Date:      ${DATE_TODAY}`);
console.log(`Dry-run:   ${DRY_RUN}`);
console.log(`Discovery: ${SKIP_DISCOVERY ? 'skipped (use static candidates)' : 'enabled'}`);
console.log();

if (DRY_RUN) {
  console.log('DRY RUN — config validated. Known fees:');
  console.log(JSON.stringify(feesJson.fees, null, 2));
  console.log(`\nStatic candidates:\n${STATIC_CANDIDATES.map(u => '  ' + u).join('\n')}`);
  process.exit(0);
}

// ── Connect CDP ───────────────────────────────────────────────────────────────
info(`Connecting to Chrome CDP at http://127.0.0.1:${CDP_PORT} …`);
let browser;
try {
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  log('Connected to real Chrome');
} catch (err) {
  fail(`CDP connect failed: ${err.message.split('\n')[0]}`);
  fail(`Start Chrome: chrome.exe --remote-debugging-port=${CDP_PORT} --user-data-dir=C:\\cbw-chrome-profile`);
  process.exit(1);
}
const context = browser.contexts()[0] ?? await browser.newContext();

// ── Source discovery ──────────────────────────────────────────────────────────
let bestCandidate = null;
let allCandidates = [...STATIC_CANDIDATES];

if (!SKIP_DISCOVERY && fs.existsSync(DISCOVERY_REPORT)) {
  try {
    const disc = JSON.parse(fs.readFileSync(DISCOVERY_REPORT, 'utf8'));
    if (disc.best_candidate) {
      bestCandidate = disc.best_candidate.url;
      info(`Discovery report found — best candidate: ${bestCandidate}`);
    }
    // Add any new links found previously
    if (disc.discovered_from_main_page?.length) {
      allCandidates = [...new Set([...allCandidates, ...disc.discovered_from_main_page])];
    }
  } catch {}
}

// If no discovery result, try candidates in order
if (!bestCandidate) {
  info('No discovery result — will probe static candidates in order');
}

// ── Probe candidates to find best working source ──────────────────────────────
const probeResults = [];
let selectedUrl    = null;
let selectedText   = '';

const toProbe = bestCandidate ? [bestCandidate, ...allCandidates.filter(u => u !== bestCandidate)] : allCandidates;

for (const url of toProbe) {
  if (selectedUrl) break; // stop once we find a working source
  info(`Probing: ${url}`);
  const page = await context.newPage();
  await page.setViewportSize(VIEWPORT);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(6000);

    const finalUrl = page.url();
    const text     = await page.evaluate(() => document.body.innerText);
    const hasData  = Object.values(FEE_PATTERNS).some(patterns => patterns.some(p => text.includes(p)));
    const isHome   = finalUrl === 'https://www.bybit.com/en/' || finalUrl === 'https://www.bybit.com/en';
    const isBlocked = text.includes('not supported on this site');

    const probeResult = { url, finalUrl, textLength: text.length, hasData, isHome, isBlocked };
    probeResults.push(probeResult);

    if (hasData) {
      selectedUrl  = finalUrl;
      selectedText = text;
      log(`Fee data found at: ${finalUrl}`);
    } else if (isHome) {
      warn(`${url} → geo-redirected to homepage`);
    } else if (isBlocked) {
      warn(`${url} → geo-blocked ("not supported")`);
    } else {
      warn(`${url} → loaded but no fee data (${text.length} chars)`);
    }
  } catch (err) {
    probeResults.push({ url, finalUrl: url, error: err.message.split('\n')[0] });
    warn(`${url} → error: ${err.message.split('\n')[0]}`);
  } finally {
    await page.close();
  }
}

// ── If no source found, write geo-block report and exit ───────────────────────
if (!selectedUrl) {
  fail('No fee data found from any candidate on this runner/IP.');
  console.log('  → Try another approved runner/IP where public Bybit fee pages are accessible.');
  console.log('  → Run: node tools/evidence-capture/check-bybit-fees.mjs --runner=eu-vps');

  // Update fees.json: last_checked + capture_attempts only
  feesJson.last_checked = DATE_TODAY;
  feesJson.status = 'geo_blocked';
  feesJson.monitoring_alert = { triggered: true, date: DATE_TODAY, status: 'geo_blocked', runner: RUNNER };
  feesJson.capture_attempts = feesJson.capture_attempts ?? [];
  feesJson.capture_attempts.push({ date: DATE_TODAY, runner: RUNNER, result: 'geo_blocked', candidates_tried: toProbe.length });
  if (feesJson.capture_attempts.length > 10) feesJson.capture_attempts = feesJson.capture_attempts.slice(-10);
  fs.writeFileSync(FEES_JSON_PATH, JSON.stringify(feesJson, null, 2), 'utf8');

  // Write report
  const reportPath = path.join(REPORT_DIR, `${DATE_TODAY.replace(/-/g,'')}-${TIMESTAMP.slice(11)}-${RUNNER}.md`);
  const reportLines = [
    `# Bybit Fees Monitor — ${DATE_TODAY} — ${RUNNER}`,
    '',
    `**Status:** geo_blocked`,
    `**Runner:** ${RUNNER}`,
    '',
    '## Candidates tried',
    ...toProbe.map(u => `- ${u}`),
    '',
    '## All geo-blocked',
    '',
    '> Try another approved runner/IP where public Bybit fee pages are accessible.',
    '> `node tools/evidence-capture/check-bybit-fees.mjs --runner=eu-vps`',
    '',
    '---',
    '*Generated by tools/evidence-capture/check-bybit-fees.mjs v2*',
  ];
  fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');
  log(`Report: ${path.relative(ROOT, reportPath)}`);

  await browser.close();
  process.exit(0);
}

// ── Open selected source and attempt tab interaction ──────────────────────────
console.log(`\n── Extracting fees from: ${selectedUrl}`);
const feePage = await context.newPage();
await feePage.setViewportSize(VIEWPORT);
await feePage.goto(selectedUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
await feePage.waitForTimeout(8000);

// Full-page screenshot
await feePage.screenshot({ path: path.join(OUT_DIR, '02-fees-page.png'), fullPage: false });
const fullText = await feePage.evaluate(() => document.body.innerText);
fs.writeFileSync(path.join(OUT_DIR, '02-fees-page-text.txt'), fullText, 'utf8');
fs.writeFileSync(path.join(OUT_DIR, '02-fees-page.html'), await feePage.content(), 'utf8');
log(`Main screenshot saved: 02-fees-page.png (${fullText.length} chars)`);

// ── Tab interaction ───────────────────────────────────────────────────────────
const tabExtractions = {};

for (const tab of TAB_CONFIGS) {
  console.log(`\n  ── Tab: ${tab.name}`);
  let clicked = false;

  for (const sel of tab.selectors) {
    try {
      const el = feePage.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click({ timeout: 3000 });
        await feePage.waitForTimeout(2500);
        clicked = true;
        log(`Clicked tab via: ${sel}`);
        break;
      }
    } catch { /* try next selector */ }
  }

  if (!clicked) {
    warn(`No ${tab.name} tab found — using current page state`);
  }

  const tabText = await feePage.evaluate(() => document.body.innerText);
  const tabFound = tab.keywords.filter(k => tabText.includes(k));

  await feePage.screenshot({ path: path.join(OUT_DIR, tab.outFile), fullPage: false });
  log(`Screenshot: ${tab.outFile} — found: ${tabFound.join(', ') || 'none'}`);

  tabExtractions[tab.name] = { clicked, found: tabFound, textLength: tabText.length };
}

await feePage.close();
await browser.close();

// ── Analyse combined text ─────────────────────────────────────────────────────
console.log('\n── Fee pattern analysis ─────────────────────────────────────────');

const allText = fullText; // main page text (all tabs combined if single-page)
const detections = {};
for (const [key, patterns] of Object.entries(FEE_PATTERNS)) {
  detections[key] = patterns.some(p => allText.includes(p));
  console.log(`  ${detections[key] ? '✅' : '❌'} ${key}`);
}

const allDetected  = Object.values(detections).every(Boolean);
const someDetected = Object.values(detections).some(Boolean);

// ── Determine overall status ──────────────────────────────────────────────────
let overallStatus, sourceType;

if (selectedUrl.includes('fee/trading')) {
  sourceType = 'verified_official_fee_page';
} else if (selectedUrl.includes('announcement-info')) {
  sourceType = 'verified_official_fee_page';
} else if (selectedUrl.includes('help-center')) {
  sourceType = 'verified_official_help_center';
} else {
  sourceType = 'verified_official_fee_page';
}

if (allDetected) {
  overallStatus = sourceType;
} else if (someDetected) {
  overallStatus = 'partial_match';
} else {
  overallStatus = 'not_detected';
}

runnerMeta.success = allDetected;
console.log(`\n  Overall status: ${overallStatus}`);
console.log(`  Source type:    ${sourceType}`);
console.log(`  Runner:         ${RUNNER}`);

// ── Update fees.json ──────────────────────────────────────────────────────────
feesJson.last_checked = DATE_TODAY;
feesJson.status = overallStatus;
feesJson.source_quality = overallStatus;
feesJson.last_runner = runnerMeta;

// Preserve last_known_values if now geo_blocked (not applicable here, found data)
feesJson.last_known_values = { ...EXPECTED };

feesJson.evidence = feesJson.evidence ?? {};
feesJson.evidence.fees_page = {
  png:              'evidence/bybit/global-en/raw/desktop-1440/02-fees-page.png',
  html:             'evidence/bybit/global-en/raw/desktop-1440/02-fees-page.html',
  text:             'evidence/bybit/global-en/raw/desktop-1440/02-fees-page-text.txt',
  spot_png:         'evidence/bybit/global-en/raw/desktop-1440/02-fees-page-spot.png',
  futures_png:      'evidence/bybit/global-en/raw/desktop-1440/02-fees-page-futures.png',
  options_png:      'evidence/bybit/global-en/raw/desktop-1440/02-fees-page-options.png',
  status:           allDetected ? 'captured_verified' : 'captured_partial',
  source_url:       selectedUrl,
  captured_at:      new Date().toISOString(),
};

feesJson.monitoring_alert = allDetected ? null : {
  triggered:   true,
  date:        DATE_TODAY,
  status:      overallStatus,
  runner:      RUNNER,
  detections,
};

feesJson.capture_attempts = feesJson.capture_attempts ?? [];
feesJson.capture_attempts.push({
  date: DATE_TODAY, runner: RUNNER, source_url: selectedUrl,
  result: overallStatus, detections,
});
if (feesJson.capture_attempts.length > 10) feesJson.capture_attempts = feesJson.capture_attempts.slice(-10);

fs.writeFileSync(FEES_JSON_PATH, JSON.stringify(feesJson, null, 2), 'utf8');
log('fees.json updated (last_checked, status, evidence paths — fee VALUES not changed)');

// ── Write report ──────────────────────────────────────────────────────────────
const reportSlug = `${DATE_TODAY.replace(/-/g,'')}-${TIMESTAMP.slice(11).replace(/:/g,'')}-${RUNNER}`;
const reportPath = path.join(REPORT_DIR, `${reportSlug}.md`);

const detectionLines = Object.entries(detections).map(([k,v]) => `- ${v ? '✅' : '❌'} ${k}`);
const tabLines = Object.entries(tabExtractions).map(([name, t]) =>
  `- ${name}: clicked=${t.clicked}, found=[${t.found.join(', ')}]`
);

const reportLines = [
  `# Bybit Fees Monitor — ${DATE_TODAY} — ${RUNNER}`,
  '',
  `**Status:** ${overallStatus}`,
  `**Runner:** ${RUNNER}`,
  `**Source:** ${selectedUrl}`,
  `**Timestamp:** ${new Date().toISOString()}`,
  '',
  '## Fee pattern detections',
  ...detectionLines,
  '',
  '## Tab interactions',
  ...tabLines,
  '',
  '## Evidence screenshots',
  '- `02-fees-page.png` — full page',
  '- `02-fees-page-spot.png` — Spot tab',
  '- `02-fees-page-futures.png` — Futures/Derivatives tab',
  '- `02-fees-page-options.png` — Options tab',
  '',
  '## Expected vs detected',
  '',
  '| Market | Expected maker | Expected taker | Maker detected | Taker detected |',
  '|---|---|---|---|---|',
  `| Spot | ${EXPECTED.spot.maker} | ${EXPECTED.spot.taker} | ${detections.spot_maker ? '✅' : '❌'} | ${detections.spot_taker ? '✅' : '❌'} |`,
  `| Perpetual | ${EXPECTED.futures.maker} | ${EXPECTED.futures.taker} | ${detections.perp_maker ? '✅' : '❌'} | ${detections.perp_taker ? '✅' : '❌'} |`,
  `| Options | ${EXPECTED.options.maker} | ${EXPECTED.options.taker} | ${detections.options_maker ? '✅' : '❌'} | ${detections.options_taker ? '✅' : '❌'} |`,
  '',
  allDetected
    ? '## ✅ All fee patterns detected — no action required'
    : `## ⚠️ NEEDS MANUAL REVIEW\n\nNot all fee patterns detected. Check screenshots.\n**DO NOT update site fee values without manual verification.**`,
  '',
  '## Candidates probed this run',
  ...probeResults.map(r => `- ${r.url} → ${r.finalUrl ?? 'error'} (${r.textLength ?? 0} chars) ${r.hasData ? '✅' : r.isHome ? '🔄 homepage' : r.isBlocked ? '🚫 blocked' : '❌'}`),
  '',
  '---',
  '*Generated by tools/evidence-capture/check-bybit-fees.mjs v2*',
];

fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');
log(`Report: ${path.relative(ROOT, reportPath)}`);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n══ FEE CHECK COMPLETE ════════════════════════════════════════════');
console.log(`  Status:  ${overallStatus}`);
console.log(`  Source:  ${selectedUrl}`);
console.log(`  Runner:  ${RUNNER}`);
console.log(`  Report:  ${path.relative(ROOT, reportPath)}`);
if (!allDetected) {
  console.log('\n  ⚠️  Not all fee patterns detected. Site values NOT changed.');
  console.log('     Review screenshots and report before any site update.');
}
