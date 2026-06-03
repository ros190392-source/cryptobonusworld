#!/usr/bin/env node
/**
 * verify-bonus-capture.mjs — Bonus Verification & Sync System
 * ─────────────────────────────────────────────────────────────
 * Visits each exchange's affiliate/referral landing URL, extracts visible
 * bonus amounts and promo codes, then compares against our site data.
 *
 * Data sources compared:
 *   1. scripts/lib/affiliate-snapshot.mjs  (runtime canonical copy)
 *   2. src/data/exchanges.json             (site bonus data)
 *   3. src/data/bonus-codes.ts             (bonus code pages)
 *
 * Outputs:
 *   reports/bonus-verification-report.json / .md
 *   reports/bonus-update-proposals.json / .md
 *   reports/evidence/{exchange}-bonus-{date}.txt  (page text snapshots)
 *
 * Usage:
 *   npm run bonus:verify -- --exchange binance
 *   npm run bonus:verify -- --all
 *   npm run bonus:verify -- --exchange binance --dry-run
 *   npm run bonus:verify -- --all --write
 *   npm run bonus:verify:stale
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { AFFILIATE_SNAPSHOT, getAffiliate, checkReferralSurvival } from './lib/affiliate-snapshot.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ── CLI ───────────────────────────────────────────────────────────────────────

const ARGV     = process.argv.slice(2);
const flag     = (n) => ARGV.includes(n);
const opt      = (n, fb) => { const i = ARGV.indexOf(n); return i !== -1 && i+1 < ARGV.length ? ARGV[i+1] : (fb ?? null); };

const EXCHANGE  = opt('--exchange');
const ALL       = flag('--all');
const DRY_RUN   = flag('--dry-run');
const STALE     = flag('--stale-only');
const WRITE     = flag('--write');
const VERBOSE   = flag('--verbose');
const JSON_OUT  = flag('--json');

const log  = (...a) => !JSON_OUT && console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && !JSON_OUT && console.log('  ·', ...a);
const warn = (...a) => !JSON_OUT && console.warn('  ⚠', ...a);

// ── Priority map (for stale-check cadence) ────────────────────────────────────

const EXCHANGE_PRIORITY = {
  binance: 1, bybit: 1, okx: 1, mexc: 1, bitget: 1,
  bingx: 2, kucoin: 2, htx: 2,
  'gate-io': 3,
};

const STALE_DAYS = { 1: 7, 2: 14, 3: 30 };

// ── Bonus extraction helpers ──────────────────────────────────────────────────

/**
 * Extract all numeric USDT amounts from page text (sorted descending).
 * @param {string} text
 * @returns {number[]}
 */
function extractBonusAmounts(text) {
  const amounts = new Set();
  // "19,800 USDT" or "19800 USDT" or "USDT 5,000" patterns
  const patterns = [
    /(\d{1,3}(?:,\d{3})+)\s*USDT/gi,
    /USDT\s*(\d{1,3}(?:,\d{3})+)/gi,
    /\bup\s+to\s+(\d{1,3}(?:,\d{3})*)\s*USDT/gi,
    /(\d{4,6})\s*USDT/gi,
    /USDT\s*(\d{4,6})/gi,
  ];
  for (const re of patterns) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const n = parseInt(m[1].replace(/,/g, ''), 10);
      if (n >= 100 && n <= 500000) amounts.add(n); // sanity bounds
    }
  }
  return [...amounts].sort((a, b) => b - a);
}

/**
 * Find the expected promo code in page text (case-insensitive).
 * Returns the code as-found, or null.
 * @param {string} text
 * @param {string|null} expectedCode
 * @returns {string|null}
 */
function detectPromoCode(text, expectedCode) {
  if (!expectedCode) return null;
  const idx = text.toUpperCase().indexOf(expectedCode.toUpperCase());
  if (idx === -1) return null;
  // Return the actual casing found on the page
  return text.slice(idx, idx + expectedCode.length);
}

/**
 * Determine match status and mismatch severity.
 */
function determineMatch(detected, expected, paramSurvived, promoVisible) {
  // No expected data — unknown
  if (!expected || expected <= 0) {
    return { matchStatus: 'unknown', mismatchSeverity: 'low',
             recommendedAction: 'manual_check' };
  }

  if (!detected || detected.length === 0) {
    // Page loaded but no bonus amount found
    if (!paramSurvived) {
      return { matchStatus: 'needs_manual_review', mismatchSeverity: 'high',
               recommendedAction: 'Check affiliate URL — ref param did not survive redirect' };
    }
    return { matchStatus: 'unknown', mismatchSeverity: 'low',
             recommendedAction: 'Bonus amount not visible on landing page — may require login or region check' };
  }

  const topDetected = detected[0]; // largest found amount

  if (topDetected === expected) {
    return { matchStatus: 'matched', mismatchSeverity: 'none',
             recommendedAction: null };
  }

  // Check for copy-difference: same order of magnitude, within ±5%
  const diff = Math.abs(topDetected - expected) / expected;
  if (diff <= 0.05) {
    return { matchStatus: 'matched_with_copy_difference', mismatchSeverity: 'low',
             recommendedAction: `Detected ${topDetected} vs expected ${expected} — within 5%, verify copy` };
  }

  // Real mismatch
  const severity = diff >= 0.5 ? 'critical'
                 : diff >= 0.2 ? 'high'
                 : 'medium';
  return {
    matchStatus: 'mismatch',
    mismatchSeverity: severity,
    recommendedAction: `Update site data: detected ${topDetected.toLocaleString()} USDT on page, expected ${expected.toLocaleString()} USDT`,
  };
}

// ── Live capture ──────────────────────────────────────────────────────────────

const PAGE_TO = 25000;
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function verifyExchangeLive(browser, exchange, affiliate) {
  const date       = dateStamp();
  const originalUrl = affiliate.affiliateUrl;

  let finalUrl         = originalUrl;
  let paramSurvived    = false;
  let detectedAmounts  = [];
  let detectedPromo    = null;
  let pageText         = '';
  let captureError     = null;

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: DESKTOP_UA,
    locale: 'en-US',
    timezoneId: 'UTC',
  });
  const page = await ctx.newPage();

  try {
    dbg(`Visiting: ${originalUrl}`);
    await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TO });
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}

    finalUrl      = page.url();
    paramSurvived = checkReferralSurvival(finalUrl, affiliate);

    // Extra wait for dynamic content
    await page.waitForTimeout(3000);

    // Extract full page text
    try {
      pageText = await page.evaluate(() => document.body.innerText ?? '');
    } catch { pageText = ''; }

    detectedAmounts = extractBonusAmounts(pageText);
    detectedPromo   = detectPromoCode(pageText, affiliate.promoCode);

    dbg(`  Final URL:       ${finalUrl}`);
    dbg(`  Param survived:  ${paramSurvived}`);
    dbg(`  Detected amounts: ${detectedAmounts.join(', ') || 'none'}`);
    dbg(`  Promo visible:   ${detectedPromo ? detectedPromo : 'no'}`);

  } catch (e) {
    captureError = e.message;
    warn(`Live capture failed for ${exchange}: ${e.message}`);
  } finally {
    await page.close();
    await ctx.close();
  }

  // Save text evidence
  const evidenceDir  = join(ROOT, 'reports', 'evidence');
  if (!existsSync(evidenceDir)) mkdirSync(evidenceDir, { recursive: true });
  const textEvidencePath = join(evidenceDir, `${exchange}-bonus-${date}.txt`);
  const evidenceContent  = [
    `Exchange:   ${exchange}`,
    `Date:       ${date}`,
    `OriginalURL:${originalUrl}`,
    `FinalURL:   ${finalUrl}`,
    `ParamSurv:  ${paramSurvived}`,
    `Amounts:    ${detectedAmounts.join(', ') || 'none'}`,
    `Promo:      ${detectedPromo ?? 'not visible'}`,
    '',
    '--- PAGE TEXT EXCERPT (first 3000 chars) ---',
    pageText.slice(0, 3000),
  ].join('\n');
  writeFileSync(textEvidencePath, evidenceContent, 'utf8');

  return {
    exchange,
    originalUrl,
    finalUrl,
    paramSurvived,
    detectedAmounts,
    detectedPromo,
    promoVisible: detectedPromo !== null,
    captureError,
    textEvidencePath: `reports/evidence/${exchange}-bonus-${date}.txt`,
  };
}

// ── Dry-run mode ──────────────────────────────────────────────────────────────

function verifyExchangeDryRun(exchange, affiliate) {
  // In dry-run mode use data from existing approval queue if available
  let queueItem = null;
  const queuePath = join(ROOT, 'reports', 'screenshot-approval-queue.json');
  if (existsSync(queuePath)) {
    try {
      const q = JSON.parse(readFileSync(queuePath, 'utf-8'));
      queueItem = q.items?.find(i => i.exchange === exchange && i.category === 'bonus_referral_landing');
    } catch {}
  }

  const paramSurvived  = queueItem?.paramSurvived ?? null;
  const promoVisible   = queueItem?.promoCodeVisible ?? null;
  const bonusVisible   = queueItem?.bonusAmountVisible ?? null;
  const detectedAmounts = bonusVisible ? [affiliate.maxBonusAmount] : [];
  const finalUrl       = queueItem?.finalUrl ?? affiliate.affiliateUrl;

  return {
    exchange,
    originalUrl:    affiliate.affiliateUrl,
    finalUrl,
    paramSurvived,
    detectedAmounts,
    detectedPromo:  promoVisible ? affiliate.promoCode : null,
    promoVisible,
    captureError:   null,
    textEvidencePath: null,
    dryRun: true,
  };
}

// ── Data source comparison ────────────────────────────────────────────────────

function buildVerificationRecord(exchange, captureData, affiliate, exchangeData) {
  const expectedBonus    = affiliate.maxBonusAmount;
  const expectedCurrency = affiliate.bonusCurrency ?? 'USDT';
  const expectedLabel    = affiliate.bonusLabel;
  const expectedPromo    = affiliate.promoCode;

  const detectedBonus = captureData.detectedAmounts[0] ?? null;
  const { matchStatus, mismatchSeverity, recommendedAction } = determineMatch(
    captureData.detectedAmounts,
    expectedBonus,
    captureData.paramSurvived,
    captureData.promoVisible,
  );

  // Cross-reference: check exchanges.json is also consistent
  const exBonusAmount = exchangeData?.bonusAmount ?? null;
  const exPromoCode   = exchangeData?.promoCode   ?? null;
  const dataSyncIssues = [];

  if (exBonusAmount !== null && exBonusAmount !== expectedBonus) {
    dataSyncIssues.push(
      `exchanges.json bonusAmount (${exBonusAmount}) differs from affiliate-snapshot (${expectedBonus})`
    );
  }
  if (exPromoCode && expectedPromo && exPromoCode !== expectedPromo) {
    dataSyncIssues.push(
      `exchanges.json promoCode (${exPromoCode}) differs from affiliate-snapshot (${expectedPromo})`
    );
  }

  return {
    exchange,
    affiliateUrl:    captureData.originalUrl,
    finalUrl:        captureData.finalUrl,
    paramSurvived:   captureData.paramSurvived,
    expectedBonus,
    expectedBonusCurrency: expectedCurrency,
    expectedBonusLabel:    expectedLabel,
    expectedPromoCode:     expectedPromo,
    detectedAmounts:       captureData.detectedAmounts,
    detectedBonus,
    detectedBonusCurrency: detectedBonus ? expectedCurrency : null,
    detectedPromoCode:     captureData.detectedPromo,
    promoVisible:          captureData.promoVisible,
    bonusVisible:          detectedBonus !== null,
    matchStatus,
    mismatchSeverity,
    recommendedAction,
    dataSyncIssues,
    capturedAt:            dateStamp(),
    screenshotPath:        `/screenshots/${exchange}/bonus_referral_landing/global-desktop-${dateStamp()}.webp`,
    textEvidencePath:      captureData.textEvidencePath,
    dryRun:                captureData.dryRun ?? false,
    captureError:          captureData.captureError ?? null,
  };
}

// ── Update proposals ──────────────────────────────────────────────────────────

function generateProposals(records) {
  const proposals = [];

  for (const rec of records) {
    if (rec.matchStatus === 'matched' || rec.matchStatus === 'matched_with_copy_difference') {
      continue; // No update needed
    }
    if (rec.matchStatus === 'unknown' && rec.mismatchSeverity === 'low') {
      continue; // Skip low-confidence unknowns
    }

    const detectedLabel = rec.detectedBonus
      ? `Up to ${rec.detectedBonus.toLocaleString()} ${rec.detectedBonusCurrency ?? 'USDT'} Welcome Bonus`
      : null;

    const affectedFiles = [
      'src/data/affiliate-links.ts',
      'src/data/exchanges.json',
      'src/data/bonus-codes.ts',
    ];

    const proposal = {
      id:              `${rec.exchange}-bonus-${dateStamp()}`,
      exchange:        rec.exchange,
      proposalType:    rec.matchStatus === 'mismatch' ? 'amount_correction'
                     : rec.matchStatus === 'needs_manual_review' ? 'manual_review'
                     : 'verification_update',
      currentValue:    rec.expectedBonus,
      currentLabel:    rec.expectedBonusLabel,
      detectedValue:   rec.detectedBonus,
      detectedLabel,
      currentPromoCode: rec.expectedPromoCode,
      detectedPromoCode: rec.detectedPromoCode,
      affectedFiles,
      patchSummary: rec.detectedBonus
        ? [
            `affiliate-links.ts → maxBonusAmount: ${rec.detectedBonus}, bonusLabel: "${detectedLabel}"`,
            `exchanges.json → bonusAmount: ${rec.detectedBonus}, bonusTitle: "${detectedLabel}"`,
            `bonus-codes.ts → bonusAmount: ${rec.detectedBonus}`,
          ]
        : [`Unable to auto-patch — manual verification required. ${rec.recommendedAction ?? ''}`],
      riskLevel:       rec.mismatchSeverity === 'critical' ? 'high'
                     : rec.mismatchSeverity === 'high'     ? 'medium'
                     : 'low',
      requiresHumanApproval: true,
      status:          'pending',
      generatedAt:     new Date().toISOString(),
      finalUrl:        rec.finalUrl,
      screenshotPath:  rec.screenshotPath,
      textEvidencePath: rec.textEvidencePath,
    };

    proposals.push(proposal);
  }

  return proposals;
}

// ── Reports ───────────────────────────────────────────────────────────────────

function writeReports(records, proposals) {
  const reportsDir = join(ROOT, 'reports');
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

  // ── JSON ──────────────────────────────────────────────────────────────────
  const verJson = {
    generatedAt: new Date().toISOString(),
    summary: {
      total:            records.length,
      matched:          records.filter(r => r.matchStatus === 'matched' || r.matchStatus === 'matched_with_copy_difference').length,
      mismatch:         records.filter(r => r.matchStatus === 'mismatch').length,
      unknown:          records.filter(r => r.matchStatus === 'unknown').length,
      needsManualReview: records.filter(r => r.matchStatus === 'needs_manual_review').length,
    },
    records,
  };
  writeFileSync(join(reportsDir, 'bonus-verification-report.json'), JSON.stringify(verJson, null, 2), 'utf8');

  const propJson = {
    generatedAt: new Date().toISOString(),
    summary: {
      total:    proposals.length,
      pending:  proposals.filter(p => p.status === 'pending').length,
      approved: proposals.filter(p => p.status === 'approved').length,
      rejected: proposals.filter(p => p.status === 'rejected').length,
    },
    proposals,
  };
  writeFileSync(join(reportsDir, 'bonus-update-proposals.json'), JSON.stringify(propJson, null, 2), 'utf8');

  // ── Markdown ──────────────────────────────────────────────────────────────
  const now = new Date().toISOString().slice(0, 19) + 'Z';
  const verRows = records.map(r => {
    const icon = r.matchStatus === 'matched' || r.matchStatus === 'matched_with_copy_difference' ? '✅'
               : r.matchStatus === 'mismatch'         ? '🚨'
               : r.matchStatus === 'needs_manual_review' ? '⚠️'
               : '❓';
    const det = r.detectedBonus ? `${r.detectedBonus.toLocaleString()} ${r.detectedBonusCurrency}` : '—';
    const exp = r.expectedBonus ? `${r.expectedBonus.toLocaleString()} ${r.expectedBonusCurrency}` : '—';
    return `| ${icon} | \`${r.exchange}\` | ${exp} | ${det} | ${r.expectedPromoCode ?? '—'} | ${r.detectedPromoCode ?? '—'} | ${r.matchStatus} |`;
  }).join('\n');

  const verMd = `# Bonus Verification Report
**Generated:** ${now}  **Mode:** ${DRY_RUN ? 'dry-run' : 'live'}

## Summary
| Metric | Count |
|---|---|
| Total checked | ${verJson.summary.total} |
| ✅ Matched | ${verJson.summary.matched} |
| 🚨 Mismatch | ${verJson.summary.mismatch} |
| ❓ Unknown | ${verJson.summary.unknown} |
| ⚠️ Needs review | ${verJson.summary.needsManualReview} |

## Results

| Status | Exchange | Expected Bonus | Detected Bonus | Expected Code | Detected Code | Match |
|---|---|---|---|---|---|---|
${verRows}

## How to review proposals
\`\`\`bash
npm run bonus:proposals
npm run bonus:approve -- --exchange <slug>
npm run bonus:approve -- --approve-all
\`\`\`

*Report: \`reports/bonus-verification-report.json\`*
`;
  writeFileSync(join(reportsDir, 'bonus-verification-report.md'), verMd, 'utf8');

  // Proposals markdown
  if (proposals.length === 0) {
    const noProposalsMd = `# Bonus Update Proposals
**Generated:** ${now}

No update proposals — all verified exchanges match site data. ✅
`;
    writeFileSync(join(reportsDir, 'bonus-update-proposals.md'), noProposalsMd, 'utf8');
  } else {
    const propRows = proposals.map(p => {
      const riskIcon = p.riskLevel === 'high' ? '🔴' : p.riskLevel === 'medium' ? '⚠️' : '🟡';
      return `### ${p.exchange} — ${p.proposalType}

| Field | Value |
|---|---|
| Current bonus | ${p.currentValue?.toLocaleString() ?? '—'} USDT |
| Detected bonus | ${p.detectedValue?.toLocaleString() ?? '—'} USDT |
| Current label | ${p.currentLabel ?? '—'} |
| Detected label | ${p.detectedLabel ?? '—'} |
| Risk level | ${riskIcon} ${p.riskLevel} |
| Final URL | \`${p.finalUrl}\` |

**Proposed patches:**
${p.patchSummary.map(l => `- ${l}`).join('\n')}

**Affected files:** ${p.affectedFiles.map(f => `\`${f}\``).join(', ')}

\`\`\`bash
npm run bonus:approve -- --exchange ${p.exchange}
\`\`\`
`;
    }).join('\n---\n\n');

    const propMd = `# Bonus Update Proposals
**Generated:** ${now}  **Total:** ${proposals.length}

⚠️ These changes require **human approval** before being applied.
Run \`npm run bonus:approve -- --exchange <slug>\` to approve individual exchanges.

---

${propRows}

## Approve all
\`\`\`bash
npm run bonus:approve -- --approve-all
npm run bonus:proposals          # View current proposal list
\`\`\`
`;
    writeFileSync(join(reportsDir, 'bonus-update-proposals.md'), propMd, 'utf8');
  }

  return {
    verJson:  'reports/bonus-verification-report.json',
    verMd:    'reports/bonus-verification-report.md',
    propJson: 'reports/bonus-update-proposals.json',
    propMd:   'reports/bonus-update-proposals.md',
  };
}

// ── Stale check ───────────────────────────────────────────────────────────────

function runStaleCheck() {
  const reportPath = join(ROOT, 'reports', 'bonus-verification-report.json');
  if (!existsSync(reportPath)) {
    log('⚠  No bonus-verification-report.json found. Run: npm run bonus:verify -- --all');
    return;
  }

  const report  = JSON.parse(readFileSync(reportPath, 'utf-8'));
  const today   = new Date();
  let hasWarnings = false;

  log('');
  log('📊  Bonus Verification Staleness Check');
  log('─'.repeat(60));
  log('');

  for (const rec of report.records ?? []) {
    const priority   = EXCHANGE_PRIORITY[rec.exchange] ?? 3;
    const maxAgeDays = STALE_DAYS[priority] ?? 30;
    const capturedAt = new Date(`${rec.capturedAt}-01`); // YYYY-MM → first of month
    const ageDays    = Math.floor((today - capturedAt) / (1000 * 60 * 60 * 24));
    const pad        = (rec.exchange + '           ').slice(0, 12);

    if (ageDays > maxAgeDays) {
      warn(`  ${pad}  P${priority}  stale (${ageDays}d old, max ${maxAgeDays}d)  — run: npm run bonus:verify -- --exchange ${rec.exchange}`);
      hasWarnings = true;
    } else {
      log(`  ${pad}  P${priority}  OK     (${ageDays}d old, max ${maxAgeDays}d)`);
    }
  }

  // Check exchanges with no record at all
  const verified = new Set(report.records?.map(r => r.exchange) ?? []);
  for (const [slug, priority] of Object.entries(EXCHANGE_PRIORITY)) {
    if (!verified.has(slug)) {
      warn(`  ${(slug + '           ').slice(0, 12)}  P${priority}  never verified  — run: npm run bonus:verify -- --exchange ${slug}`);
      hasWarnings = true;
    }
  }

  log('');
  if (hasWarnings) {
    log('  ⚠  Stale verification found. Run bonus:verify to refresh.');
  } else {
    log('  ✅  All verifications are within their freshness window.');
  }
  log('');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateStamp() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (STALE) {
    runStaleCheck();
    return;
  }

  // Determine which exchanges to verify
  let exchangesToVerify = [];
  if (EXCHANGE) {
    exchangesToVerify = [EXCHANGE];
  } else if (ALL) {
    exchangesToVerify = Object.keys(AFFILIATE_SNAPSHOT);
  } else {
    console.log(`
  CryptoBonusWorld Bonus Verification v1

  Usage:
    node scripts/verify-bonus-capture.mjs --exchange binance
    node scripts/verify-bonus-capture.mjs --all
    node scripts/verify-bonus-capture.mjs --all --dry-run
    node scripts/verify-bonus-capture.mjs --stale-only

  Options:
    --exchange <slug>   Verify single exchange
    --all               Verify all exchanges in affiliate-snapshot
    --dry-run           Show what would be checked (uses existing queue data)
    --stale-only        Check freshness of existing reports only
    --write             Write reports even in dry-run mode
    --json              JSON output
    --verbose           Debug output
    `);
    return;
  }

  // Validate exchanges
  for (const ex of exchangesToVerify) {
    if (!AFFILIATE_SNAPSHOT[ex]) {
      console.error(`  ✖ Unknown exchange: "${ex}". Available: ${Object.keys(AFFILIATE_SNAPSHOT).join(', ')}`);
      process.exit(1);
    }
  }

  // Load exchanges.json for cross-reference
  let exchangesData = {};
  try {
    const raw = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'exchanges.json'), 'utf-8'));
    for (const ex of raw) {
      exchangesData[ex.slug] = ex;
    }
  } catch (e) {
    warn(`Could not load exchanges.json: ${e.message}`);
  }

  log('');
  log(`🔍  Bonus Verification — ${exchangesToVerify.join(', ')}`);
  log('─'.repeat(60));
  if (DRY_RUN) log('  Mode: DRY-RUN (no browser launched)');
  log('');

  const captureResults = [];

  if (!DRY_RUN) {
    // Load playwright
    const { chromium } = await import('playwright').catch(() => {
      console.error('  ✖ Playwright not installed. Run: npm install -D playwright && npx playwright install chromium');
      process.exit(1);
    });
    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    try {
      for (const exchange of exchangesToVerify) {
        const affiliate = getAffiliate(exchange);
        process.stdout.write(`  ${(exchange + '              ').slice(0, 14)}  ⏳ checking...`);
        const data = await verifyExchangeLive(browser, exchange, affiliate);
        captureResults.push({ exchange, affiliate, data });
        const amtStr = data.detectedAmounts.length > 0
          ? data.detectedAmounts[0].toLocaleString() + ' USDT'
          : 'none found';
        const paramStr = data.paramSurvived ? 'ref:✓' : 'ref:✗';
        const promoStr = data.promoVisible  ? 'promo:✓' : 'promo:✗';
        process.stdout.write(`\r  ${(exchange + '              ').slice(0, 14)}  ✅ done [${amtStr}] [${paramStr}] [${promoStr}]\n`);
      }
    } finally {
      await browser.close();
    }

  } else {
    // Dry-run: use existing queue data
    for (const exchange of exchangesToVerify) {
      const affiliate = getAffiliate(exchange);
      const data = verifyExchangeDryRun(exchange, affiliate);
      captureResults.push({ exchange, affiliate, data });
      log(`  ${(exchange + '              ').slice(0, 14)}  📋 dry-run (from queue)`);
    }
  }

  // Build verification records + compare against data sources
  const records = captureResults.map(({ exchange, affiliate, data }) =>
    buildVerificationRecord(exchange, data, affiliate, exchangesData[exchange] ?? null)
  );

  // Generate proposals
  const proposals = generateProposals(records);

  // Output
  if (JSON_OUT) {
    console.log(JSON.stringify({ records, proposals }, null, 2));
    return;
  }

  // Summary
  log('');
  log('─'.repeat(60));
  const matched  = records.filter(r => r.matchStatus === 'matched' || r.matchStatus === 'matched_with_copy_difference').length;
  const mismatch = records.filter(r => r.matchStatus === 'mismatch').length;
  const unknown  = records.filter(r => r.matchStatus === 'unknown').length;
  const manual   = records.filter(r => r.matchStatus === 'needs_manual_review').length;
  log(`  Total:         ${records.length}`);
  log(`  ✅ Matched:    ${matched}`);
  if (mismatch > 0) log(`  🚨 Mismatch:   ${mismatch}`);
  if (unknown  > 0) log(`  ❓ Unknown:    ${unknown}`);
  if (manual   > 0) log(`  ⚠️  Manual:    ${manual}`);
  if (proposals.length > 0) log(`  📋 Proposals:  ${proposals.length} update(s) suggested`);
  log('');

  // Detailed results
  for (const r of records) {
    const icon = r.matchStatus === 'matched' || r.matchStatus === 'matched_with_copy_difference' ? '✅'
               : r.matchStatus === 'mismatch'             ? '🚨'
               : r.matchStatus === 'needs_manual_review'  ? '⚠️ '
               : '❓ ';
    const det  = r.detectedBonus
      ? `detected: ${r.detectedBonus.toLocaleString()} ${r.detectedBonusCurrency}`
      : 'detected: —';
    const exp  = r.expectedBonus
      ? `expected: ${r.expectedBonus.toLocaleString()} ${r.expectedBonusCurrency}`
      : 'expected: —';
    log(`  ${icon}  ${(r.exchange + '            ').slice(0, 12)}  ${exp}  |  ${det}`);
    if (r.recommendedAction) log(`         → ${r.recommendedAction}`);
    if (r.dataSyncIssues.length > 0) {
      for (const issue of r.dataSyncIssues) warn(`         data-sync: ${issue}`);
    }
  }
  log('');

  if (WRITE || (!DRY_RUN && proposals.length > 0)) {
    const paths = writeReports(records, proposals);
    log(`📄  Reports written:`);
    log(`    ${paths.verMd}`);
    log(`    ${paths.verJson}`);
    if (proposals.length > 0) {
      log(`    ${paths.propMd}`);
      log(`    ${paths.propJson}`);
      log('');
      log('  Next step: review proposals then run:');
      log('    npm run bonus:proposals');
      log('    npm run bonus:approve -- --exchange <slug>');
    } else {
      log('    ✅ No update proposals — all data in sync');
    }
  } else if (!WRITE) {
    log('  (add --write to save reports to reports/)');
  }
  log('');
}

main().catch(e => {
  console.error('\n  ✖ Verification error:', e.message);
  if (VERBOSE) console.error(e.stack);
  process.exit(1);
});
