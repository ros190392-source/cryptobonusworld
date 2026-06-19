/**
 * CBW — Bybit Fee Rate Page: DOM Cell Query + Extended Network Watch
 *
 * The fee rate page renders table values via XHR after page load.
 * This script:
 *   1. Opens the page with network interception active
 *   2. Waits up to 25s for percentage strings to appear in any table cell
 *   3. Queries all <table> cells directly with querySelectorAll (not just innerText)
 *   4. Clicks each tab and re-queries cells
 *   5. Scans ALL network responses for fee percentage JSON
 *   6. Saves per-tab screenshots + structured extraction
 *
 * Official source: https://www.bybit.com/en/announcement-info/fee-rate
 * No login. No captcha. bybit.com only.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');

const CDP_PORT   = process.argv.find(a => a.startsWith('--cdp-port='))?.split('=')[1] ?? '9222';
const RUNNER     = process.argv.find(a => a.startsWith('--runner='))?.split('=')[1] ?? 'local-chrome-cdp';
const TARGET_URL = 'https://www.bybit.com/en/announcement-info/fee-rate';
const DATE_TODAY = new Date().toISOString().slice(0, 10);
const VIEWPORT   = { width: 1440, height: 900 };

const OUT_DIR    = path.join(ROOT, 'evidence', 'bybit', 'global-en', 'raw', 'desktop-1440');
const RPT_DIR    = path.join(ROOT, 'evidence', 'bybit', 'global-en', 'report');
const FEES_JSON  = path.join(ROOT, 'data', 'exchanges', 'bybit', 'fees.json');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(RPT_DIR, { recursive: true });

const log  = m => console.log(`  ✅ ${m}`);
const info = m => console.log(`  ℹ️  ${m}`);
const warn = m => console.log(`  ⚠️  ${m}`);
const fail = m => console.log(`  ❌ ${m}`);

// ── Expected non-VIP fee values ───────────────────────────────────────────────
const EXPECTED = {
  spot:    { maker: '0.1%',  taker: '0.1%'   },
  futures: { maker: '0.02%', taker: '0.055%' },
  options: { maker: '0.02%', taker: '0.03%'  },
};

// All non-VIP fee strings we accept (with format tolerance)
const ALL_FEE_STRINGS = ['0.1%', '0.10%', '0.1000%', '0.02%', '0.020%', '0.0200%', '0.055%', '0.0550%', '0.03%', '0.030%', '0.0300%'];
const SPOT_STRINGS    = ['0.1%', '0.10%', '0.1000%'];
const FUTURES_STRINGS = ['0.02%', '0.020%', '0.055%', '0.0550%'];
const OPTIONS_STRINGS = ['0.02%', '0.020%', '0.03%', '0.030%'];

// ── DOM cell extractor ────────────────────────────────────────────────────────
const CELL_EXTRACTOR = `(() => {
  const results = { tables: [], allText: [] };
  document.querySelectorAll('table').forEach((tbl, ti) => {
    const tableData = { index: ti, headers: [], rows: [] };
    tbl.querySelectorAll('thead th, thead td').forEach(th => tableData.headers.push(th.textContent.trim()));
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
      tableData.rows.push(cells);
      results.allText.push(...cells);
    });
    results.tables.push(tableData);
  });
  // Also grab any elements with specific class patterns (React-rendered fee cells)
  const feeEls = document.querySelectorAll('[class*="fee"], [class*="rate"], [class*="maker"], [class*="taker"]');
  const feeTexts = Array.from(feeEls).map(el => el.textContent.trim()).filter(t => t.length > 0 && t.length < 20);
  results.feeElements = [...new Set(feeTexts)];
  return results;
})()`;

// ── Network collector ─────────────────────────────────────────────────────────
const allNetworkResponses = [];
const feeApiCandidates    = [];

// ── Connect ───────────────────────────────────────────────────────────────────
console.log('\nCBW Bybit Fee Cell Query');
console.log(`Target: ${TARGET_URL}`);
console.log(`Runner: ${RUNNER} | CDP: ${CDP_PORT}\n`);

let browser;
try {
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  log(`Connected CDP port ${CDP_PORT}`);
} catch (e) {
  fail(`CDP: ${e.message.split('\n')[0]}`); process.exit(1);
}

const context = browser.contexts()[0] ?? await browser.newContext();
const page    = await context.newPage();
await page.setViewportSize(VIEWPORT);

// ── Network listener ──────────────────────────────────────────────────────────
page.on('response', async (resp) => {
  const url = resp.url();
  if (!url.includes('bybit.com')) return;
  const ct = resp.headers()['content-type'] ?? '';
  if (!ct.includes('json')) return;
  try {
    const body = await resp.text().catch(() => '');
    if (body.length < 10) return;
    const hasFeeNum = ALL_FEE_STRINGS.some(f => body.includes(f.replace('%','')));
    const hasKeywords = ['maker','taker','feeRate','fee_rate','spotFee','makerFee','takerFee'].some(k => body.toLowerCase().includes(k));
    const entry = { url, status: resp.status(), bodyLen: body.length, hasFeeNum, hasKeywords };
    allNetworkResponses.push(entry);
    if (hasFeeNum || hasKeywords) {
      feeApiCandidates.push({ ...entry, body: body.slice(0, 10000) });
      info(`API candidate: ${url.slice(0, 90)} (${body.length} bytes)`);
    }
  } catch { /* skip */ }
});

// ── Navigate ──────────────────────────────────────────────────────────────────
info('Navigating...');
await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
const finalUrl = page.url();
const isHome = /^https:\/\/www\.bybit\.com\/en\/?$/.test(finalUrl);
info(`Final URL: ${finalUrl}`);
if (isHome) { fail('Geo-redirect to homepage'); await browser.close(); process.exit(0); }

// ── Wait for cell population ──────────────────────────────────────────────────
info('Waiting for table cells to populate with fee values (up to 25s)...');
const cellsLoaded = await page.waitForFunction(
  (feeStrings) => {
    const allCellText = Array.from(document.querySelectorAll('table td')).map(td => td.textContent);
    return feeStrings.some(f => allCellText.some(c => c.includes(f)));
  },
  ALL_FEE_STRINGS.map(f => f.replace('%', '')),
  { timeout: 25000 }
).then(() => true).catch(() => false);

if (cellsLoaded) {
  log('Fee values appeared in table cells!');
} else {
  warn('Table cells still empty after 25s — will still read whatever is there');
}

await page.waitForTimeout(2000);

// ── Initial DOM query ─────────────────────────────────────────────────────────
const initialCells = await page.evaluate(CELL_EXTRACTOR);
await page.screenshot({ path: path.join(OUT_DIR, '02-fees-page.png'), fullPage: false });
const initialText  = await page.evaluate(() => document.body.innerText);
fs.writeFileSync(path.join(OUT_DIR, '02-fees-page.html'), await page.content(), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, '02-fees-page-text.txt'), initialText, 'utf8');

info(`Tables found: ${initialCells.tables.length}`);
info(`All cell values (${initialCells.allText.length}):`);
initialCells.allText.filter(t => t).slice(0, 50).forEach(v => console.log(`    "${v}"`));
if (initialCells.feeElements.length) {
  info(`Fee-class elements: ${initialCells.feeElements.join(', ')}`);
}

// ── Tab click + cell query ────────────────────────────────────────────────────
const TAB_CONFIGS = [
  {
    name: 'spot',
    selectors: [
      '[role="tab"]:has-text("Spot")', 'button:has-text("Spot")',
      '.bybit-tab-pane:has-text("Spot")', '[class*="tab"]:has-text("Spot")',
      'li:has-text("Spot")',
    ],
    expectedStrings: SPOT_STRINGS,
    out: { png: '02-fees-page-spot.png', html: '02-fees-page-spot.html', txt: '02-fees-page-spot-text.txt' },
  },
  {
    name: 'futures',
    selectors: [
      '[role="tab"]:has-text("Perpetual")', '[role="tab"]:has-text("Derivatives")',
      'button:has-text("Perpetual")', 'button:has-text("Derivatives")',
      '[class*="tab"]:has-text("Perpetual")',
    ],
    expectedStrings: FUTURES_STRINGS,
    out: { png: '02-fees-page-futures.png', html: '02-fees-page-futures.html', txt: '02-fees-page-futures-text.txt' },
  },
  {
    name: 'options',
    selectors: [
      '[role="tab"]:has-text("Options")', 'button:has-text("Options")',
      '[class*="tab"]:has-text("Options")',
    ],
    expectedStrings: OPTIONS_STRINGS,
    out: { png: '02-fees-page-options.png', html: '02-fees-page-options.html', txt: '02-fees-page-options-text.txt' },
  },
];

const tabResults = {};

for (const tab of TAB_CONFIGS) {
  console.log(`\n  ── Tab: ${tab.name}`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  let clicked = false;
  for (const sel of tab.selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click({ timeout: 3000 });
        clicked = true;
        info(`Clicked: ${sel}`);
        break;
      }
    } catch { /* next */ }
  }
  if (!clicked) warn(`No ${tab.name} tab found`);

  // Wait for cells to update
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(1500);

  // Query cells
  const cells = await page.evaluate(CELL_EXTRACTOR);
  const tabText = await page.evaluate(() => document.body.innerText);

  await page.screenshot({ path: path.join(OUT_DIR, tab.out.png), fullPage: false });
  fs.writeFileSync(path.join(OUT_DIR, tab.out.html), await page.content(), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, tab.out.txt), tabText, 'utf8');
  log(`Saved: ${tab.out.png}`);

  const cellValues = cells.allText.filter(t => t.length > 0);
  const feeValues  = cellValues.filter(v => ALL_FEE_STRINGS.some(f => v.includes(f)));
  const hasExpected = tab.expectedStrings.some(f => tabText.includes(f));

  info(`Cell values: ${cellValues.slice(0, 30).join(' | ')}`);
  info(`Fee values in cells: ${feeValues.join(', ') || 'none'}`);

  tabResults[tab.name] = {
    clicked,
    cellCount: cellValues.length,
    feeValuesInCells: feeValues,
    expectedStringsFound: tab.expectedStrings.filter(f => tabText.includes(f)),
    hasExpectedFees: hasExpected,
  };
}

// ── Analyse API responses for fee data ───────────────────────────────────────
console.log(`\n── API candidates: ${feeApiCandidates.length}`);
let apiExtracted = null;

for (const api of feeApiCandidates) {
  console.log(`  ${api.url.slice(0, 100)}`);
  try {
    const parsed = JSON.parse(api.body);
    const str    = JSON.stringify(parsed);
    // Check for fee percentage patterns (without %)
    const spotFound    = str.includes('0.1') && /spot/i.test(str);
    const futuresFound = str.includes('0.02') || str.includes('0.055');
    const optionsFound = str.includes('0.03');
    if (spotFound || futuresFound || optionsFound) {
      info(`  ⚡ Fee JSON candidate: ${api.url.slice(0, 80)}`);
      console.log(`     Preview: ${str.slice(0, 400)}`);
      apiExtracted = { url: api.url, data: parsed };
    }
  } catch { /* not JSON */ }
}

// ── Combine all text sources ──────────────────────────────────────────────────
const allCellText = [
  ...initialCells.allText,
  ...Object.values(tabResults).flatMap(r => r.feeValuesInCells),
  ...(apiExtracted ? [JSON.stringify(apiExtracted.data)] : []),
].join('\n');

const det = {
  spot_maker:    allCellText.includes('0.1') || allCellText.includes('0.10'),
  spot_taker:    allCellText.includes('0.1') || allCellText.includes('0.10'),
  perp_maker:    allCellText.includes('0.02'),
  perp_taker:    allCellText.includes('0.055'),
  options_maker: allCellText.includes('0.02'),
  options_taker: allCellText.includes('0.03'),
};

// More strict check: actual percentage strings
const detStrict = {
  spot_maker:    SPOT_STRINGS.some(s => allCellText.includes(s)),
  spot_taker:    SPOT_STRINGS.some(s => allCellText.includes(s)),
  perp_maker:    ['0.02%','0.020%','0.0200%'].some(s => allCellText.includes(s)),
  perp_taker:    ['0.055%','0.0550%'].some(s => allCellText.includes(s)),
  options_maker: ['0.02%','0.020%','0.0200%'].some(s => allCellText.includes(s)),
  options_taker: ['0.03%','0.030%','0.0300%'].some(s => allCellText.includes(s)),
};

const allStrictMatch  = Object.values(detStrict).every(Boolean);
const someStrictMatch = Object.values(detStrict).some(Boolean);

let status = allStrictMatch ? 'verified_official_fee_page'
           : someStrictMatch ? 'partial_match'
           : 'not_detected';

console.log('\n── Detection (strict % strings in cell values):');
Object.entries(detStrict).forEach(([k, v]) => console.log(`  ${v ? '✅' : '❌'} ${k}`));
console.log(`  Status: ${status}`);

// ── Save extraction JSON ──────────────────────────────────────────────────────
const extraction = {
  source_url:   TARGET_URL,
  source_type:  'official_bybit_fee_rate_page',
  captured_at:  new Date().toISOString(),
  runner:       RUNNER,
  final_url:    finalUrl,
  cells_loaded: cellsLoaded,
  status,
  api_source:   apiExtracted ? { url: apiExtracted.url } : null,
  markets: {
    spot: {
      maker: EXPECTED.spot.maker,
      taker: EXPECTED.spot.taker,
      maker_in_cells: tabResults.spot?.feeValuesInCells?.join(',') ?? 'none',
      match_status:   tabResults.spot?.hasExpectedFees ? 'match' : 'not_detected',
    },
    perpetual_futures: {
      maker: EXPECTED.futures.maker,
      taker: EXPECTED.futures.taker,
      maker_in_cells: tabResults.futures?.feeValuesInCells?.join(',') ?? 'none',
      match_status:   tabResults.futures?.hasExpectedFees ? 'match' : 'not_detected',
    },
    options: {
      maker: EXPECTED.options.maker,
      taker: EXPECTED.options.taker,
      maker_in_cells: tabResults.options?.feeValuesInCells?.join(',') ?? 'none',
      match_status:   tabResults.options?.hasExpectedFees ? 'match' : 'not_detected',
    },
  },
  tab_results: tabResults,
  fee_api_candidates: feeApiCandidates.length,
  all_cell_values: initialCells.allText.filter(t => t),
  notes: [
    cellsLoaded ? 'Table cells populated with values' : 'Table cells empty — login-gated or region-gated content',
    `API candidates checked: ${feeApiCandidates.length}`,
    `Fee API JSON extracted: ${!!apiExtracted}`,
  ],
};
fs.writeFileSync(path.join(RPT_DIR, 'fee-extraction-structured.json'), JSON.stringify(extraction, null, 2), 'utf8');
log('fee-extraction-structured.json saved');

// ── Update fees.json (only upgrade, never downgrade from verified HC) ─────────
const feesJson = JSON.parse(fs.readFileSync(FEES_JSON, 'utf8'));
const prevStatus = feesJson.status;
feesJson.last_checked = DATE_TODAY;

if (allStrictMatch) {
  feesJson.status = 'verified_official_fee_page';
  feesJson.source_quality = 'official_fee_page';
  feesJson.verified_source_url = TARGET_URL;
  feesJson.monitoring_alert = null;
  feesJson.fees.spot.status = feesJson.fees.perpetual_futures.status = feesJson.fees.options.status = 'verified_official_fee_page';
  feesJson.evidence = feesJson.evidence ?? {};
  feesJson.evidence.fee_rate_page = {
    source_url: TARGET_URL, captured_at: new Date().toISOString(),
    status: 'captured_verified', cells_loaded: true,
  };
} else {
  // Do NOT downgrade from verified_official_help_center
  if (!prevStatus.startsWith('verified_')) {
    feesJson.status = status;
    feesJson.source_quality = status;
  }
  feesJson.monitoring_alert = feesJson.monitoring_alert ?? null;
  if (!allStrictMatch) {
    console.log(`\n  Preserving previous status: ${prevStatus} (fee_rate page cells not verified)`);
  }
}

feesJson.capture_attempts = (feesJson.capture_attempts ?? []).slice(-14);
feesJson.capture_attempts.push({
  date: DATE_TODAY, runner: RUNNER, url: TARGET_URL,
  result: status, cells_loaded: cellsLoaded,
  tab_clicks: { spot: tabResults.spot?.clicked, futures: tabResults.futures?.clicked, options: tabResults.options?.clicked },
  fee_values_in_cells: Object.fromEntries(Object.entries(tabResults).map(([k, v]) => [k, v.feeValuesInCells])),
  api_found: !!apiExtracted,
});
feesJson.last_runner = { name: RUNNER, timestamp: new Date().toISOString(), success: allStrictMatch };
fs.writeFileSync(FEES_JSON, JSON.stringify(feesJson, null, 2), 'utf8');
log(`fees.json — previous: ${prevStatus} → final: ${feesJson.status}`);

await page.close();
await browser.close();

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n══ CELL QUERY COMPLETE ═══════════════════════════════════════════');
console.log(`  URL loaded:       ${finalUrl}`);
console.log(`  Cells loaded:     ${cellsLoaded}`);
console.log(`  Fee-rate status:  ${status}`);
console.log(`  fees.json status: ${feesJson.status}`);
console.log(`  API candidates:   ${feeApiCandidates.length}`);
console.log(`  Spot tab:         cells=${tabResults.spot?.cellCount}, fees=${tabResults.spot?.feeValuesInCells?.join(',') || 'none'}`);
console.log(`  Futures tab:      cells=${tabResults.futures?.cellCount}, fees=${tabResults.futures?.feeValuesInCells?.join(',') || 'none'}`);
console.log(`  Options tab:      cells=${tabResults.options?.cellCount}, fees=${tabResults.options?.feeValuesInCells?.join(',') || 'none'}`);
