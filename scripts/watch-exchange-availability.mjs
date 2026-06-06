#!/usr/bin/env node
/**
 * watch-exchange-availability.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Daily availability watcher for exchange supported-regions lists.
 *
 * Reads the baseline from:
 *   src/data/exchange-availability/{exchange}.json
 *
 * Fetches the primary source URL defined in the baseline and extracts the
 * current available country/region list. Compares it against the baseline.
 *
 * SAFETY RULES (enforced in code):
 *   - Does NOT update the baseline file automatically.
 *   - Does NOT modify any public page.
 *   - Does NOT call countries "banned" or "prohibited" — only "not listed".
 *   - Does NOT auto-publish changes.
 *   - Any detected change requires manual ROLE 0 review.
 *
 * Usage:
 *   node scripts/watch-exchange-availability.mjs
 *   node scripts/watch-exchange-availability.mjs --exchange binance
 *   node scripts/watch-exchange-availability.mjs --write
 *   node scripts/watch-exchange-availability.mjs --dry-run
 *   node scripts/watch-exchange-availability.mjs --verbose
 *
 * Exit codes:
 *   0 — no change detected; all sources OK
 *   1 — script/runtime error (bad baseline, missing file, etc.)
 *   2 — manual review required: change detected OR source unavailable OR
 *       extraction failed
 *
 * Output (--write):
 *   reports/exchange-availability-watch-YYYY-MM-DD.md
 *   reports/exchange-availability-watch-YYYY-MM-DD.json
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Config ──────────────────────────────────────────────────────────────────

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const ROOT        = path.resolve(__dirname, '..');
const AVAIL_DIR   = path.join(ROOT, 'src', 'data', 'exchange-availability');
const REPORTS_DIR = path.join(ROOT, 'reports');

const args       = process.argv.slice(2);
const EXCHANGE   = args.find((a, i) => args[i - 1] === '--exchange') ?? 'binance';
const WRITE_MODE = args.includes('--write');
const DRY_RUN    = args.includes('--dry-run');
const VERBOSE    = args.includes('--verbose');

const TODAY = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const NOW   = new Date().toISOString();               // full ISO timestamp

// User-Agent to avoid bot-block on support pages
const UA = 'Mozilla/5.0 (compatible; CryptoBonusWorld-AvailabilityWatcher/1.0; +https://cryptobonusworld.com)';

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(...a) { if (!args.includes('--silent')) console.log(...a); }
function verb(...a) { if (VERBOSE) console.log('  [verbose]', ...a); }
function warn(...a) { console.warn('  ⚠️ ', ...a); }
function die(msg, code = 1) { console.error('  ✖ FATAL:', msg); safeExit(code); }

/**
 * safeExit — set exit code and let Node drain before exiting.
 * process.exit() called immediately inside an async context with open
 * undici (fetch) keep-alive connections causes a libuv assertion crash on
 * Windows (Node 21+). Setting process.exitCode and using a brief
 * unref'd timer allows the event loop to clean up first.
 */
function safeExit(code) {
  process.exitCode = code;
  // Give undici 200ms to close keep-alive connections, then force exit.
  const t = setTimeout(() => process.exit(code), 200);
  if (typeof t.unref === 'function') t.unref();
}

function ensureReports() {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function normaliseName(s) {
  return s.trim()
    .replace(/\s+/g, ' ')
    .replace(/’/g, "'") // curly apostrophe → straight
    .replace(/é/g, 'e') // é → e (for Côte d'Ivoire variants)
    .toLowerCase();
}

// ── Baseline loader ───────────────────────────────────────────────────────────

function loadBaseline(exchange) {
  const fp = path.join(AVAIL_DIR, `${exchange}.json`);
  if (!fs.existsSync(fp)) {
    die(`Baseline file not found: ${fp}\nRun SPRINT-05-BINANCE-AVAILABILITY-BASELINE-01 first.`);
  }
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) {
    die(`Cannot parse baseline JSON at ${fp}: ${e.message}`);
  }
}

// ── HTML country extraction ───────────────────────────────────────────────────

/**
 * Extract a list of country/region names from raw HTML.
 *
 * The Binance support-region-list page is a support article with a structured
 * table of country names and "Available" status entries. We try multiple
 * strategies to locate country names in the raw HTML.
 *
 * Returns: { countries: string[], strategy: string } or throws ExtractionError.
 */
class ExtractionError extends Error {}

function extractCountriesFromHtml(html, sourceUrl) {
  verb(`HTML length: ${html.length} bytes`);

  // Strategy 1: Look for table cells/list items adjacent to "Available"
  // Pattern: captures text content between <td> or <li> tags near the word "Available"
  const strategy1Results = extractViaTableCells(html);
  if (strategy1Results.length >= 50) {
    verb(`Strategy 1 (table cells): found ${strategy1Results.length} entries`);
    return { countries: strategy1Results, strategy: 'table_cells' };
  }

  // Strategy 2: Look for JSON embedded in page (Next.js/SSR hydration data)
  const strategy2Results = extractViaEmbeddedJson(html);
  if (strategy2Results.length >= 50) {
    verb(`Strategy 2 (embedded JSON): found ${strategy2Results.length} entries`);
    return { countries: strategy2Results, strategy: 'embedded_json' };
  }

  // Strategy 3: Extract all words/phrases near "Available" in the page text
  const strategy3Results = extractViaAvailableContext(html);
  if (strategy3Results.length >= 50) {
    verb(`Strategy 3 (Available context): found ${strategy3Results.length} entries`);
    return { countries: strategy3Results, strategy: 'available_context' };
  }

  // Strategy 4: Cross-reference with known baseline country name fragments
  // (useful if page structure changes but names are still present)
  const strategy4Results = extractViaTextPresence(html);
  if (strategy4Results.length >= 50) {
    verb(`Strategy 4 (text presence): found ${strategy4Results.length} entries`);
    return { countries: strategy4Results, strategy: 'text_presence' };
  }

  verb(`All strategies failed. S1:${strategy1Results.length} S2:${strategy2Results.length} S3:${strategy3Results.length} S4:${strategy4Results.length}`);
  throw new ExtractionError(`Could not extract country list from ${sourceUrl}. The page may be JavaScript-only rendered (requires Playwright). Strategies tried: table_cells(${strategy1Results.length}), embedded_json(${strategy2Results.length}), available_context(${strategy3Results.length}), text_presence(${strategy4Results.length})`);
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractViaTableCells(html) {
  // Match <td>...</td> blocks that don't contain other block tags (simple cells)
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const results = [];
  let m;
  let prevCell = '';
  while ((m = cellRe.exec(html)) !== null) {
    const text = stripHtml(m[1]).trim();
    if (!text) continue;
    // Country names are typically 2-50 chars, not "Available"/"Unavailable"
    const lc = text.toLowerCase();
    if (lc === 'available' || lc === 'unavailable' || lc === 'status' || lc === 'country' || lc === 'region') {
      prevCell = lc;
      continue;
    }
    // Accept if the cell before this one was "available" or if the next sibling will be
    if (text.length >= 2 && text.length <= 80 && /^[A-ZÀ-ɏ(']/.test(text)) {
      results.push(text);
    }
    prevCell = text;
  }
  return dedupe(results);
}

function extractViaEmbeddedJson(html) {
  // Look for Next.js/Astro JSON islands containing arrays of objects with country/name fields
  const scriptRe = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
  const results = [];
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      extractStringsFromObject(data, results);
    } catch {}
  }
  // Also try __NEXT_DATA__ and similar
  const nextRe = /window\.__(?:NEXT|NUXT|APP)_DATA__\s*=\s*(\{[\s\S]*?\})(?:<\/script>|;)/i;
  const nxt = html.match(nextRe);
  if (nxt) {
    try {
      const data = JSON.parse(nxt[1]);
      extractStringsFromObject(data, results);
    } catch {}
  }
  return dedupe(results.filter(isLikelyCountryName));
}

function extractStringsFromObject(obj, acc, depth = 0) {
  if (depth > 10) return;
  if (typeof obj === 'string' && isLikelyCountryName(obj)) acc.push(obj.trim());
  else if (Array.isArray(obj)) obj.forEach(v => extractStringsFromObject(v, acc, depth + 1));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach(v => extractStringsFromObject(v, acc, depth + 1));
}

function extractViaAvailableContext(html) {
  // Find text spans before/after the word "Available"
  // The page has rows like: CountryName ... Available
  const text = html.replace(/<style[\s\S]*?<\/style>/gi, ' ')
                   .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                   .replace(/<[^>]+>/g, '\n')
                   .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'");
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === 'Available' || line.toLowerCase() === 'available') {
      // The country name is likely 1-3 lines before "Available"
      for (let back = 1; back <= 3; back++) {
        const candidate = lines[i - back];
        if (candidate && isLikelyCountryName(candidate)) {
          results.push(candidate);
          break;
        }
      }
    }
  }
  return dedupe(results);
}

function extractViaTextPresence(html) {
  // Check which entries from a broad list of country names appear as text in the HTML
  // Used as a fallback detection — confirms presence, not structured extraction
  const text = html.replace(/<[^>]+>/g, ' ');
  const SPOT_CHECK = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
    'Bahrain', 'Belgium', 'Brazil', 'Bulgaria', 'Cambodia', 'Canada', 'Chile',
    'Colombia', 'Croatia', 'Czechia', 'Denmark', 'Ecuador', 'Egypt', 'Estonia',
    'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'Hungary', 'Iceland',
    'Indonesia', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan',
    'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lithuania',
    'Luxembourg', 'Malaysia', 'Malta', 'Mexico', 'Mongolia', 'Morocco',
    'Myanmar', 'Namibia', 'Nepal', 'Nigeria', 'Norway', 'Oman', 'Pakistan',
    'Panama', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania',
    'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore', 'Slovakia',
    'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland',
    'Taiwan', 'Thailand', 'Tunisia', 'Turkey', 'Uganda', 'Ukraine',
    'United Arab Emirates', 'United Kingdom', 'Uruguay', 'Uzbekistan',
    'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
  ];
  return SPOT_CHECK.filter(c => text.includes(c));
}

function isLikelyCountryName(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  return (
    t.length >= 2 &&
    t.length <= 100 &&
    /^[A-ZÀ-ɏ(']/.test(t) &&
    !/^\d/.test(t) &&
    !t.includes('<') &&
    !t.includes('{') &&
    !/^(Available|Unavailable|Status|Country|Region|Name|Download|iPhone|App|Binance|Support|Guide|Updated|October|This|information)$/i.test(t)
  );
}

function dedupe(arr) {
  return [...new Set(arr.map(s => s.trim()).filter(Boolean))];
}

// ── Diff logic ────────────────────────────────────────────────────────────────

function diffLists(baseline, current) {
  const baseSet    = new Set(baseline.map(normaliseName));
  const currSet    = new Set(current.map(normaliseName));
  const baseMap    = new Map(baseline.map(c => [normaliseName(c), c]));
  const currMap    = new Map(current.map(c => [normaliseName(c), c]));

  const added   = [...currSet].filter(k => !baseSet.has(k)).map(k => currMap.get(k));
  const removed = [...baseSet].filter(k => !currSet.has(k)).map(k => baseMap.get(k));

  return { added, removed };
}

// ── Severity ──────────────────────────────────────────────────────────────────

function computeSeverity(result) {
  if (result.fetchStatus !== 'ok')        return 'high';
  if (result.extractionStatus !== 'ok')   return 'high';
  if (result.addedToAvailable.length > 0) return 'high';
  if (result.removedFromAvailable.length > 0) return 'high';
  if (result.countChanged)                return 'high';
  if (result.sourceDateChanged)           return 'medium';
  return 'none';
}

// ── Report generation ────────────────────────────────────────────────────────

function buildJsonReport(result, baseline) {
  return {
    exchange: EXCHANGE,
    runDate: TODAY,
    checkedAt: NOW,
    primarySourceUrl: baseline.primarySource?.url ?? result.sourceUrl,
    sourceFetchStatus: result.fetchStatus,
    extractionStatus: result.extractionStatus,
    extractionStrategy: result.extractionStrategy ?? null,
    baselineAvailableCount: baseline.availableCountryCount ?? baseline.availableCountriesFromPrimarySource?.length ?? 0,
    currentAvailableCount: result.currentCount,
    addedToAvailable: result.addedToAvailable,
    removedFromAvailable: result.removedFromAvailable,
    countChanged: result.countChanged,
    sourceDateChanged: result.sourceDateChanged,
    unchanged: result.unchanged,
    severity: result.severity,
    manualReviewRequired: result.severity !== 'none',
    recommendedAction: buildRecommendedAction(result),
    doNotAutopublish: true,
    safetyNote: 'Countries not listed in supported-regions list must NOT be described as banned or prohibited without a current official restricted-countries source and ROLE 0 approval.',
    nextSuggestedTask: result.unchanged
      ? null
      : 'SPRINT-06-BINANCE-AVAILABILITY-BASELINE-REVIEW-01',
  };
}

function buildRecommendedAction(result) {
  if (result.fetchStatus !== 'ok') return 'Source unavailable — verify URL manually and check Binance website status. Do not draw availability conclusions until source is restored.';
  if (result.extractionStatus !== 'ok') return 'Country list extraction failed — page may be JavaScript-only rendered. Consider upgrading to Playwright-based fetch. Manual source check required.';
  if (result.removedFromAvailable.length > 0) return `ROLE 0 review required: ${result.removedFromAvailable.length} country/region(s) removed from supported list — may indicate new restriction. Do not publish claim without official source confirmation.`;
  if (result.addedToAvailable.length > 0) return `ROLE 0 review required: ${result.addedToAvailable.length} country/region(s) added to supported list — may indicate restriction lifted.`;
  if (result.countChanged) return 'Country count changed without clear add/remove — manual diff review recommended.';
  if (result.sourceDateChanged) return 'Source page date changed — review content for wording changes. ROLE 30 review recommended.';
  return 'No action required. Run again tomorrow.';
}

function buildMarkdownReport(result, baseline, jsonReport) {
  const statusIcon = result.unchanged ? '✅' : '⚠️';
  const lines = [
    `# Binance Availability Watch — ${TODAY}`,
    '',
    `**Exchange:** ${EXCHANGE}`,
    `**Run date:** ${TODAY}`,
    `**Checked at:** ${NOW}`,
    `**Status:** ${result.unchanged ? '✅ NO CHANGE' : '⚠️  REVIEW REQUIRED'}`,
    `**Severity:** ${result.severity.toUpperCase()}`,
    '',
    '---',
    '',
    '## Source Status',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Source URL | \`${jsonReport.primarySourceUrl}\` |`,
    `| Fetch status | ${result.fetchStatus === 'ok' ? '✅ OK' : '❌ FAILED'} |`,
    `| Extraction status | ${result.extractionStatus === 'ok' ? '✅ OK' : '❌ ' + result.extractionStatus} |`,
    `| Extraction strategy | ${result.extractionStrategy ?? 'N/A'} |`,
    '',
    '## Counts',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Baseline available count | **${jsonReport.baselineAvailableCount}** |`,
    `| Current available count | **${jsonReport.currentAvailableCount}** |`,
    `| Count changed | ${result.countChanged ? '⚠️ YES' : '✅ No'} |`,
    `| Countries added | ${result.addedToAvailable.length} |`,
    `| Countries removed | ${result.removedFromAvailable.length} |`,
    '',
  ];

  if (result.addedToAvailable.length > 0) {
    lines.push('## Countries Added to Available List');
    lines.push('');
    lines.push('> ⚠️ ROLE 0 review required before making any page claim.');
    lines.push('');
    result.addedToAvailable.forEach(c => lines.push(`- ${c}`));
    lines.push('');
  }

  if (result.removedFromAvailable.length > 0) {
    lines.push('## Countries Removed from Available List');
    lines.push('');
    lines.push('> ⚠️ HIGH SEVERITY — possible new restriction. ROLE 0 review required immediately.');
    lines.push('> Do NOT publish as restricted/banned without a current official Binance prohibited-countries source.');
    lines.push('');
    result.removedFromAvailable.forEach(c => lines.push(`- ${c}`));
    lines.push('');
  }

  lines.push(
    '## Interpretation Warning',
    '',
    '> This watcher uses a **positive-list inversion** approach. The primary source',
    '> shows countries where the Binance App is supported. Countries absent from this',
    '> list must NOT be described as "banned" or "prohibited" without a separate',
    '> official Binance restricted-countries source and explicit ROLE 0 approval.',
    '> Absence may reflect App distribution restrictions, regulatory status, or',
    '> product variants (e.g. Binance.US for the United States).',
    '',
    '## Recommended Action',
    '',
    `> ${jsonReport.recommendedAction}`,
    '',
    '## Owner Decisions Needed',
    '',
  );

  if (result.unchanged) {
    lines.push('None — no change detected. No owner action required today.');
  } else {
    lines.push('| Decision | Details |');
    lines.push('|----------|---------|');
    if (result.removedFromAvailable.length > 0)
      lines.push(`| Country removals: approve content update task? | ${result.removedFromAvailable.join(', ')} — ROLE 0 must review before any page change |`);
    if (result.addedToAvailable.length > 0)
      lines.push(`| Country additions: update availability info? | ${result.addedToAvailable.join(', ')} — confirm before updating page |`);
    if (result.extractionStatus !== 'ok')
      lines.push(`| Extraction failure: upgrade to Playwright-based fetch? | Manual check required |`);
    if (result.fetchStatus !== 'ok')
      lines.push(`| Source unavailable: manual verification needed? | Check ${jsonReport.primarySourceUrl} manually |`);
  }

  lines.push(
    '',
    '## Next Suggested Task',
    '',
    jsonReport.nextSuggestedTask
      ? `**\`${jsonReport.nextSuggestedTask}\`** — Review detected changes and determine required content updates.`
      : 'None — run watcher again tomorrow.',
    '',
    '---',
    '',
    `*Report generated: ${NOW} by scripts/watch-exchange-availability.mjs*`,
    `*Governance: docs/EXCHANGE_AVAILABILITY_AND_RESTRICTED_COUNTRIES_WATCHER.md*`,
  );

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log(`\n  🌍 Exchange Availability Watcher`);
  log(`  Exchange : ${EXCHANGE}`);
  log(`  Date     : ${TODAY}`);
  log(`  Mode     : ${DRY_RUN ? 'dry-run' : WRITE_MODE ? 'write' : 'print-only'}`);
  log('');

  // 1. Load baseline
  const baseline = loadBaseline(EXCHANGE);
  const sourceUrl = baseline.primarySource?.url;
  const baselineList = baseline.availableCountriesFromPrimarySource ?? [];
  const baselineCount = baseline.availableCountryCount ?? baselineList.length;

  if (!sourceUrl) die('Baseline has no primarySource.url — cannot run watcher.');
  if (baselineList.length === 0) die('Baseline availableCountriesFromPrimarySource is empty — cannot diff.');

  log(`  Baseline : ${baselineCount} countries from ${sourceUrl}`);

  const result = {
    sourceUrl,
    fetchStatus: 'ok',
    extractionStatus: 'ok',
    extractionStrategy: null,
    currentCount: 0,
    currentList: [],
    addedToAvailable: [],
    removedFromAvailable: [],
    countChanged: false,
    sourceDateChanged: false,
    unchanged: false,
    severity: 'none',
  };

  if (DRY_RUN) {
    log('  [dry-run] Skipping live fetch. Reporting as no_change.');
    result.currentCount  = baselineCount;
    result.currentList   = baselineList;
    result.unchanged     = true;
    result.severity      = 'none';
    result.extractionStrategy = 'dry_run';
  } else {
    // 2. Fetch primary source
    log(`  Fetching : ${sourceUrl}`);
    let html = '';
    try {
      // Use manual AbortController to avoid Node 21/Windows libuv teardown crash
      // that occurs with AbortSignal.timeout() + process.exit().
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(sourceUrl, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Connection': 'close',   // prevent undici keep-alive pool from holding open handles
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        result.fetchStatus = `http_${res.status}`;
        warn(`Source returned HTTP ${res.status} — marking source_unavailable`);
      } else {
        html = await res.text();
        log(`  Fetched  : ${html.length} bytes — HTTP ${res.status}`);
      }
    } catch (err) {
      result.fetchStatus = 'network_error';
      warn(`Fetch failed: ${err.message}`);
    }

    // 3. Extract countries
    if (result.fetchStatus === 'ok' && html.length > 0) {
      try {
        const { countries, strategy } = extractCountriesFromHtml(html, sourceUrl);
        result.currentList        = countries;
        result.currentCount       = countries.length;
        result.extractionStrategy = strategy;
        log(`  Extracted: ${countries.length} countries via strategy: ${strategy}`);
      } catch (err) {
        result.extractionStatus = 'extraction_failed';
        result.extractionStrategy = null;
        warn(`Extraction failed: ${err.message}`);
        warn('The page may require JavaScript rendering (Playwright). Consider upgrading the watcher in Sprint 06+.');
      }
    }

    // 4. Diff
    if (result.fetchStatus === 'ok' && result.extractionStatus === 'ok' && result.currentCount > 0) {
      const { added, removed } = diffLists(baselineList, result.currentList);
      result.addedToAvailable    = added;
      result.removedFromAvailable = removed;
      result.countChanged        = result.currentCount !== baselineCount;
      result.unchanged           = added.length === 0 && removed.length === 0 && !result.countChanged;

      if (result.unchanged) {
        log(`  Result   : ✅ NO CHANGE — ${result.currentCount} countries match baseline`);
      } else {
        log(`  Result   : ⚠️  CHANGES DETECTED`);
        if (added.length > 0)   log(`             + Added   : ${added.join(', ')}`);
        if (removed.length > 0) log(`             - Removed : ${removed.join(', ')}`);
        if (result.countChanged) log(`             Count: ${baselineCount} → ${result.currentCount}`);
      }
    } else if (!result.unchanged) {
      log(`  Result   : ⚠️  REVIEW REQUIRED (fetch/extraction issue)`);
    }
  }

  // 5. Severity
  result.severity = computeSeverity(result);

  // 6. Build reports
  const jsonReport = buildJsonReport(result, baseline);
  const mdReport   = buildMarkdownReport(result, baseline, jsonReport);

  // 7. Write or print
  if (WRITE_MODE && !DRY_RUN) {
    ensureReports();
    const mdFile   = path.join(REPORTS_DIR, `exchange-availability-watch-${TODAY}.md`);
    const jsonFile = path.join(REPORTS_DIR, `exchange-availability-watch-${TODAY}.json`);
    fs.writeFileSync(mdFile,   mdReport,                 'utf8');
    fs.writeFileSync(jsonFile, JSON.stringify(jsonReport, null, 2), 'utf8');
    log(`\n  📄 Report  : ${mdFile}`);
    log(`  📄 Report  : ${jsonFile}`);
  } else if (!WRITE_MODE) {
    log('\n── JSON Report ──────────────────────────────────────────────────────────────');
    console.log(JSON.stringify(jsonReport, null, 2));
    log('── Markdown Report ──────────────────────────────────────────────────────────');
    console.log(mdReport);
  }

  // 8. Safety assertion — never update baseline
  log('\n  🔒 Baseline NOT modified. src/data/exchange-availability/binance.json is unchanged.');
  log('  🔒 No public pages modified. doNotAutopublish: true.');

  // 9. Exit
  const requiresReview = result.severity !== 'none';
  if (requiresReview) {
    log(`\n  ⚠️  Manual review required. Severity: ${result.severity.toUpperCase()}`);
    log('  → Recommended task: SPRINT-06-BINANCE-AVAILABILITY-BASELINE-REVIEW-01\n');
    safeExit(2);
    return;
  }

  log('\n  ✅ No change detected. Next run tomorrow.\n');
  safeExit(0);
}

main().catch(err => {
  console.error('  ✖ Unhandled error:', err.message);
  safeExit(1);
});
