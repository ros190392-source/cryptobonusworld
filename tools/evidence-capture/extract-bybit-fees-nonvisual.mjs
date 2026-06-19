/**
 * CBW — Non-Visual Bybit Fee Extraction
 *
 * Tries every non-visual method in order:
 *   1. Direct fetch + __NEXT_DATA__ embedded JSON
 *   2. JS chunk discovery and search
 *   3. Public Bybit API endpoint probing
 *   4. CDP network capture (automated, no visual needed)
 *
 * Source: https://www.bybit.com/en/announcement-info/fee-rate (official Bybit only)
 * No login. No captcha. No competitor data. No private endpoints.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');

const CDP_PORT   = process.argv.find(a => a.startsWith('--cdp-port='))?.split('=')[1] ?? '9222';
const TARGET_URL = 'https://www.bybit.com/en/announcement-info/fee-rate';
const DATE_TODAY = new Date().toISOString().slice(0, 10);

const OUT_DIR   = path.join(ROOT, 'evidence', 'bybit', 'global-en', 'raw', 'desktop-1440');
const RPT_DIR   = path.join(ROOT, 'evidence', 'bybit', 'global-en', 'report');
const FEES_JSON = path.join(ROOT, 'data', 'exchanges', 'bybit', 'fees.json');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(RPT_DIR, { recursive: true });

const log  = m => console.log(`  ✅ ${m}`);
const info = m => console.log(`  ℹ️  ${m}`);
const warn = m => console.log(`  ⚠️  ${m}`);
const fail = m => console.log(`  ❌ ${m}`);

const EXPECTED = {
  spot:    { maker: '0.1%',  taker: '0.1%'   },
  futures: { maker: '0.02%', taker: '0.055%' },
  options: { maker: '0.02%', taker: '0.03%'  },
};

// Fee strings in raw form (without %) for broader matching
const FEE_RAW   = ['0.1', '0.02', '0.055', '0.03'];
const FEE_PCT   = ['0.1%', '0.10%', '0.1000%', '0.02%', '0.020%', '0.055%', '0.0550%', '0.03%', '0.030%'];
// Spaced format Bybit uses in DOM: "0.1000 %" / "0.0200 %"
const FEE_SPACED = ['0.1000 %', '0.0200 %', '0.0550 %', '0.0300 %'];

const FEE_KEYWORDS = ['makerFee','takerFee','feeRate','fee_rate','tradingFee','spotFee','derivFee','vipFee','spot_fee'];
const FEE_STRUCT_KEYS = ['maker', 'taker', 'spot', 'perpetual', 'futures', 'options', 'derivatives', 'vip', 'rate'];

// ── Utility: simple HTTPS GET ─────────────────────────────────────────────────
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

function httpsGet(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        ...extraHeaders,
      },
      timeout: 20000,
    };
    const req = https.get(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

// ── Helper: find fee values in text ──────────────────────────────────────────
function detectFees(text) {
  const hasSpot    = FEE_SPACED.some(s => text.includes(s)) || ['0.1%','0.10%','0.1000%'].some(s => text.includes(s));
  const hasFutures = text.includes('0.0200 %') || text.includes('0.0550 %') || (text.includes('0.02%') && text.includes('0.055%'));
  const hasOptions = text.includes('0.0200 %') || text.includes('0.0300 %') || (text.includes('0.02%') && text.includes('0.03%'));
  const hasMakerTaker = /maker/i.test(text) && /taker/i.test(text);
  return { hasSpot, hasFutures, hasOptions, hasMakerTaker, allMatch: hasSpot && hasFutures && hasOptions };
}

const report = {
  generated_at: new Date().toISOString(),
  source_url: TARGET_URL,
  methods_tried: [],
  direct_html: null,
  next_data: null,
  js_discovery: null,
  api_probe: null,
  cdp_network: null,
  extraction: null,
};

// ═══════════════════════════════════════════════════════════════════════════════
// METHOD 1 — Direct HTML fetch
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n══ METHOD 1: Direct HTML fetch ══════════════════════════════════');
report.methods_tried.push('direct_html_fetch');

let htmlBody = '';
let htmlStatus = 0;

try {
  const resp = await httpsGet(TARGET_URL);
  htmlStatus = resp.status;
  htmlBody   = resp.body;
  info(`Status: ${htmlStatus} | Length: ${htmlBody.length} chars`);
  fs.writeFileSync(path.join(OUT_DIR, '02-fees-direct.html'), htmlBody, 'utf8');

  // Extract text-like content
  const textContent = htmlBody
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  fs.writeFileSync(path.join(OUT_DIR, '02-fees-direct-text.txt'), textContent, 'utf8');
  log(`Saved 02-fees-direct.html (${htmlBody.length} chars) + text`);

  // Search for fee keywords in raw HTML
  const feeKwInHtml = FEE_STRUCT_KEYS.filter(k => new RegExp(k, 'i').test(htmlBody));
  const feePctInHtml = FEE_PCT.filter(f => htmlBody.includes(f));
  const feeSpcInHtml = FEE_SPACED.filter(f => htmlBody.includes(f));
  info(`Fee keywords in HTML: ${feeKwInHtml.join(', ') || 'none'}`);
  info(`Fee % strings in HTML: ${feePctInHtml.join(', ') || 'none'}`);
  info(`Fee spaced in HTML: ${feeSpcInHtml.join(', ') || 'none'}`);

  const detected = detectFees(htmlBody);
  report.direct_html = {
    status: htmlStatus, length: htmlBody.length,
    fee_keywords_found: feeKwInHtml,
    fee_pct_found: feePctInHtml,
    fee_spaced_found: feeSpcInHtml,
    all_fees_match: detected.allMatch,
    geo_blocked: htmlStatus === 403 || textContent.includes('geo') || htmlBody.includes('Access Denied'),
  };

  if (detected.allMatch) {
    log('All fee values found in direct HTML!');
  } else {
    warn(`Fee values not in raw HTML (Next.js SSR — data rendered client-side)`);
  }
} catch (e) {
  fail(`Direct fetch failed: ${e.message}`);
  report.direct_html = { error: e.message };
}

// ═══════════════════════════════════════════════════════════════════════════════
// METHOD 2a — Extract __NEXT_DATA__ embedded JSON
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n══ METHOD 2a: __NEXT_DATA__ extraction ══════════════════════════');
report.methods_tried.push('next_data_extraction');

if (htmlBody) {
  const nextDataMatch = htmlBody.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const nextStr  = JSON.stringify(nextData);
      log(`__NEXT_DATA__ found — ${nextStr.length} chars`);
      fs.writeFileSync(path.join(RPT_DIR, 'fee-next-data.json'), JSON.stringify(nextData, null, 2), 'utf8');

      // Search for fee data in Next props
      const feeInNext = FEE_RAW.filter(f => nextStr.includes(f));
      const kwInNext  = FEE_KEYWORDS.filter(k => nextStr.includes(k));
      info(`Fee numbers in __NEXT_DATA__: ${feeInNext.join(', ') || 'none'}`);
      info(`Fee keywords in __NEXT_DATA__: ${kwInNext.join(', ') || 'none'}`);

      const detNext = detectFees(nextStr);
      report.next_data = { found: true, length: nextStr.length, fee_numbers: feeInNext, fee_keywords: kwInNext, all_fees_match: detNext.allMatch };

      if (detNext.allMatch) {
        log('All fee values found in __NEXT_DATA__!');
      } else {
        warn('Fee values not pre-rendered in __NEXT_DATA__ (client-side fetch)');
        // Show what IS in Next data
        const pageProps = nextData?.props?.pageProps;
        if (pageProps) info(`pageProps keys: ${Object.keys(pageProps).join(', ')}`);
      }
    } catch (e) {
      fail(`__NEXT_DATA__ parse error: ${e.message}`);
      report.next_data = { found: true, error: e.message };
    }
  } else {
    warn('No __NEXT_DATA__ script tag found');
    report.next_data = { found: false };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// METHOD 2b — JS chunk discovery
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n══ METHOD 2b: JS chunk discovery ════════════════════════════════');
report.methods_tried.push('js_chunk_discovery');

const jsUrls = [];
if (htmlBody) {
  const scriptMatches = htmlBody.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g);
  for (const m of scriptMatches) {
    const src = m[1];
    const abs = src.startsWith('http') ? src : `https://www.bybit.com${src}`;
    if (abs.includes('bybit.com')) jsUrls.push(abs);
  }
  info(`JS files found: ${jsUrls.length}`);

  // Prioritise announcement-info chunks and data-related files
  const priority = jsUrls.filter(u =>
    u.includes('announcement-info') || u.includes('fee') || u.includes('data') || u.includes('trade')
  );
  const rest = jsUrls.filter(u => !priority.includes(u));
  const toCheck = [...priority, ...rest].slice(0, 20); // cap at 20

  const jsResults = [];
  const apiEndpointsFound = [];

  for (const jsUrl of toCheck) {
    info(`Checking: ${jsUrl.slice(0, 90)}`);
    try {
      const resp = await httpsGet(jsUrl, { 'Accept': 'application/javascript' });
      const body = resp.body;

      // Search for fee keywords
      const kwFound   = FEE_KEYWORDS.filter(k => body.includes(k));
      const feeFound  = FEE_RAW.filter(f => body.includes(f));
      const hasFeeData = kwFound.length > 0 && feeFound.length > 0;

      // Search for API endpoint patterns
      const apiMatches = [...body.matchAll(/['"`](\/[vx][-\d]*\/[^'"`\s]{5,80})['"`]/g)]
        .map(m => m[1])
        .filter(p => /fee|rate|vip|spot|futures|option|trade|announce/i.test(p))
        .slice(0, 10);
      if (apiMatches.length) apiEndpointsFound.push(...apiMatches);

      jsResults.push({
        url: jsUrl.slice(0, 100),
        size: body.length,
        keywords_found: kwFound,
        fee_numbers_found: feeFound,
        api_paths_found: apiMatches,
        has_fee_data: hasFeeData,
      });

      if (hasFeeData) {
        info(`  → Fee data found! Keywords: ${kwFound.join(',')} | Values: ${feeFound.join(',')}`);
        // Show surrounding context for first hit
        FEE_KEYWORDS.forEach(kw => {
          const idx = body.indexOf(kw);
          if (idx >= 0) {
            const ctx = body.slice(Math.max(0, idx - 50), idx + 150).replace(/\s+/g, ' ');
            console.log(`     Context for '${kw}': ${ctx}`);
          }
        });
      }
    } catch (e) {
      jsResults.push({ url: jsUrl.slice(0, 100), error: e.message.slice(0, 60) });
    }
  }

  const uniqueApis = [...new Set(apiEndpointsFound)];
  log(`API paths discovered in JS: ${uniqueApis.length}`);
  uniqueApis.slice(0, 20).forEach(p => console.log(`    ${p}`));

  report.js_discovery = {
    total_js_files: jsUrls.length,
    files_checked: jsResults.length,
    api_paths_found: uniqueApis,
    results: jsResults,
  };
  fs.writeFileSync(path.join(RPT_DIR, 'fee-js-discovery-report.json'), JSON.stringify(report.js_discovery, null, 2), 'utf8');
  log('fee-js-discovery-report.json saved');
}

// ═══════════════════════════════════════════════════════════════════════════════
// METHOD 3 — Public API probing
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n══ METHOD 3: Public API probing ═════════════════════════════════');
report.methods_tried.push('api_probe');

// Known public Bybit API endpoints (no auth required)
const PUBLIC_APIS = [
  // V5 public instrument info / fee endpoints
  'https://api.bybit.com/v5/market/fee-rate?symbol=BTCUSDT&category=spot',
  'https://api.bybit.com/v5/market/fee-rate?category=spot',
  'https://api.bybit.com/v5/market/instruments-info?category=spot&symbol=BTCUSDT',
  // Announcement API (feeds the fee page)
  'https://api2.bybit.com/v3/public/fee-rate',
  'https://api.bybit.com/v3/public/fee-rate',
  'https://www.bybit.com/x-api/s1/announcement/api/fee-rate',
  // VIP fee structure (may be public)
  'https://www.bybit.com/x-api/s1/loyalty-program/get-vip-fee-config',
  'https://www.bybit.com/x-api/s1/loyalty-program/get-fee-config',
  // From JS discovery (announcement-info specific)
  'https://www.bybit.com/x-api/s1/announcement/fee-rate',
  'https://api.bybit.com/v5/account/fee-rate?symbol=BTCUSDT&category=spot&baseCoin=',
];

// Also probe any fee-related paths found in JS discovery
const jsApiPaths = report.js_discovery?.api_paths?.filter(p => /fee|rate/i.test(p)) ?? [];
for (const p of jsApiPaths.slice(0, 5)) {
  PUBLIC_APIS.push(`https://www.bybit.com${p}`);
}

const apiResults = [];
let bestApiResponse = null;

for (const apiUrl of PUBLIC_APIS) {
  try {
    info(`Probing: ${apiUrl.slice(0, 90)}`);
    const resp = await httpsGet(apiUrl, {
      'Accept': 'application/json',
      'Referer': 'https://www.bybit.com/en/announcement-info/fee-rate',
      'Origin': 'https://www.bybit.com',
    });

    const isJson = resp.headers['content-type']?.includes('json');
    const body   = resp.body.slice(0, 3000);
    let parsed   = null;
    let feeFound = false;

    try {
      parsed = JSON.parse(resp.body);
      const str = JSON.stringify(parsed);
      feeFound = FEE_RAW.some(f => str.includes(f)) && FEE_STRUCT_KEYS.some(k => new RegExp(k, 'i').test(str));
    } catch { /* not JSON */ }

    const result = {
      url: apiUrl.slice(0, 100),
      status: resp.status,
      is_json: isJson,
      body_length: resp.body.length,
      fee_found: feeFound,
      preview: body.slice(0, 300),
    };
    apiResults.push(result);

    if (resp.status === 200 && feeFound && parsed) {
      log(`Fee data found in API! ${apiUrl}`);
      console.log(`  Preview: ${JSON.stringify(parsed).slice(0, 400)}`);
      bestApiResponse = { url: apiUrl, data: parsed };
      fs.writeFileSync(path.join(OUT_DIR, '02-fees-api-response.json'), JSON.stringify(parsed, null, 2), 'utf8');
    } else {
      console.log(`  ${resp.status} | ${resp.body.length} chars | JSON: ${isJson} | fee: ${feeFound}`);
    }
  } catch (e) {
    apiResults.push({ url: apiUrl.slice(0, 100), error: e.message.slice(0, 60) });
    console.log(`  ERROR: ${e.message.slice(0, 60)}`);
  }
}

report.api_probe = { endpoints_tested: apiResults.length, fee_found: !!bestApiResponse, results: apiResults };
if (bestApiResponse) {
  log(`API fee data saved: 02-fees-api-response.json`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// METHOD 4 — CDP network capture (automated, no visual needed)
// ═══════════════════════════════════════════════════════════════════════════════
let cdpUsed = false;
const allFeeData = {
  html: detectFees(htmlBody).allMatch,
  api: !!bestApiResponse,
};

if (!allFeeData.html && !allFeeData.api) {
  console.log('\n══ METHOD 4: CDP network capture ════════════════════════════════');
  report.methods_tried.push('cdp_network_capture');

  try {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
    log('Connected to Chrome CDP');
    const context = browser.contexts()[0] ?? await browser.newContext();
    const page    = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    const cdpResponses = [];

    page.on('response', async (resp) => {
      const url = resp.url();
      if (!url.includes('bybit.com')) return;
      const ct = resp.headers()['content-type'] ?? '';
      if (!ct.includes('json')) return;
      try {
        const body = await resp.text().catch(() => '');
        if (body.length < 10 || body.length > 500000) return;
        const hasFee = FEE_STRUCT_KEYS.some(k => body.toLowerCase().includes(k));
        const hasNum = FEE_RAW.some(f => body.includes(f));
        if (hasFee && hasNum) {
          cdpResponses.push({ url, status: resp.status(), length: body.length, preview: body.slice(0, 500) });
          info(`CDP API: ${url.slice(0, 90)}`);
        }
      } catch { /* skip */ }
    });

    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);

    const cdpReport = {
      fee_responses_captured: cdpResponses.length,
      responses: cdpResponses,
    };
    fs.writeFileSync(path.join(RPT_DIR, 'fee-network-report.json'), JSON.stringify(cdpReport, null, 2), 'utf8');
    log(`CDP: ${cdpResponses.length} fee-related JSON responses`);

    // Check if any CDP response has our fee values
    for (const r of cdpResponses) {
      try {
        const parsed = JSON.parse(r.preview);
        const str = JSON.stringify(parsed);
        if (FEE_SPACED.some(f => str.includes(f.replace(' ', ''))) || detectFees(str).allMatch) {
          bestApiResponse = { url: r.url, data: parsed, via: 'cdp' };
          log(`Fee data found via CDP network: ${r.url}`);
        }
      } catch { /* skip */ }
    }

    report.cdp_network = cdpReport;
    cdpUsed = true;
    await page.close();
    await browser.close();
  } catch (e) {
    fail(`CDP: ${e.message.split('\n')[0]}`);
    report.cdp_network = { error: e.message.split('\n')[0] };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Determine overall status
// ═══════════════════════════════════════════════════════════════════════════════
const htmlDet = detectFees(htmlBody);
const apiDet  = bestApiResponse ? detectFees(JSON.stringify(bestApiResponse.data)) : { allMatch: false };

// Previous: we know DOM cells gave us the values in the CDP session
// Check if any method confirmed values
const feesConfirmedFrom = [];
if (htmlDet.allMatch) feesConfirmedFrom.push('direct_html');
if (apiDet.allMatch)  feesConfirmedFrom.push('api');
if (report.next_data?.all_fees_match) feesConfirmedFrom.push('next_data');

const overallStatus = feesConfirmedFrom.length > 0 ? 'verified_official_fee_page' : 'not_detected';

// Build structured extraction
const extraction = {
  source_url: TARGET_URL,
  method: feesConfirmedFrom.join('+') || 'none_successful',
  status: overallStatus,
  captured_at: new Date().toISOString(),
  note: feesConfirmedFrom.length === 0
    ? 'Fee values exist in DOM cells (JS-rendered, confirmed in previous CDP session) but not extractable via static methods. The official fee page requires JS execution to populate table cells — static HTML fetch returns skeleton only.'
    : `Confirmed via: ${feesConfirmedFrom.join(', ')}`,
  markets: {
    spot: {
      maker: EXPECTED.spot.maker, taker: EXPECTED.spot.taker,
      match_status: feesConfirmedFrom.length > 0 ? 'match' : 'not_detected_via_static',
      confirmed_source: feesConfirmedFrom.length > 0 ? feesConfirmedFrom[0] : 'cdp_dom_cells_only',
    },
    perpetual_futures: {
      maker: EXPECTED.futures.maker, taker: EXPECTED.futures.taker,
      match_status: feesConfirmedFrom.length > 0 ? 'match' : 'not_detected_via_static',
    },
    options: {
      maker: EXPECTED.options.maker, taker: EXPECTED.options.taker,
      match_status: feesConfirmedFrom.length > 0 ? 'match' : 'not_detected_via_static',
    },
  },
};
fs.writeFileSync(path.join(RPT_DIR, 'fee-extraction-structured.json'), JSON.stringify(extraction, null, 2), 'utf8');
log('fee-extraction-structured.json saved');

// Save full investigation report
fs.writeFileSync(path.join(RPT_DIR, 'fee-nonvisual-report.json'), JSON.stringify(report, null, 2), 'utf8');
log('fee-nonvisual-report.json saved');

// ═══════════════════════════════════════════════════════════════════════════════
// Update fees.json — only update if new static confirmation found
// ═══════════════════════════════════════════════════════════════════════════════
const feesJson = JSON.parse(fs.readFileSync(FEES_JSON, 'utf8'));
feesJson.last_checked = DATE_TODAY;
feesJson.capture_attempts = (feesJson.capture_attempts ?? []).slice(-14);
feesJson.capture_attempts.push({
  date: DATE_TODAY, method: 'non_visual_extraction',
  methods_tried: report.methods_tried,
  direct_html_result: overallStatus,
  api_found: !!bestApiResponse,
  cdp_used: cdpUsed,
});
// Only upgrade status if we got new confirmation — do not downgrade from verified_official_fee_page
if (feesJson.status !== 'verified_official_fee_page' && overallStatus === 'verified_official_fee_page') {
  feesJson.status = 'verified_official_fee_page';
  feesJson.source_quality = 'official_fee_page';
  feesJson.monitoring_alert = null;
} else {
  info(`fees.json status kept: ${feesJson.status}`);
}
fs.writeFileSync(FEES_JSON, JSON.stringify(feesJson, null, 2), 'utf8');
log(`fees.json: ${feesJson.status}`);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ NON-VISUAL EXTRACTION COMPLETE ═══════════════════════════════');
console.log(`  Methods tried:  ${report.methods_tried.join(', ')}`);
console.log(`  Direct HTML:    ${htmlBody.length} chars | fees in raw HTML: ${htmlDet.allMatch}`);
console.log(`  __NEXT_DATA__:  ${report.next_data?.found ? 'found' : 'not found'} | fees: ${report.next_data?.all_fees_match ?? false}`);
console.log(`  JS files:       ${report.js_discovery?.files_checked ?? 0} checked | API paths: ${report.js_discovery?.api_paths_found?.length ?? 0}`);
console.log(`  API probed:     ${report.api_probe?.endpoints_tested ?? 0} endpoints | fee found: ${report.api_probe?.fee_found ?? false}`);
console.log(`  CDP network:    ${cdpUsed ? (report.cdp_network?.fee_responses_captured ?? 0) + ' fee responses' : 'not needed / unavailable'}`);
console.log(`  Overall:        ${overallStatus}`);
console.log(`  fees.json:      ${feesJson.status}`);
