#!/usr/bin/env node
/**
 * bonus-landing-verification.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Bonus Landing Verification — CryptoBonusWorld
 *
 * PURPOSE:
 *   Verifies the bonus claims shown on live affiliate referral/landing pages
 *   reached through /go/{exchange}/ links, comparing detected values against
 *   the expected evidence data.
 *
 * DEFAULT MODE: DRY RUN
 *   By default, NO live pages are visited. The script generates a structured
 *   verification plan from existing local data (exchanges.json + evidence).
 *
 * ─── FLAGS ────────────────────────────────────────────────────────────────────
 *   (none)           Dry-run: generate verification plan only (no HTTP requests)
 *   --json           Write plan to reports/bonus-landing-verification-plan.json
 *   --markdown       Write plan to reports/bonus-landing-verification-plan.md
 *   --live           Enable live capture (Playwright required). NOT DEFAULT.
 *   --confirm-live   Required with --live. Explicit confirmation of live intent.
 *   --exchange <slug> Required with --live. Target one specific exchange only.
 *   --limit <n>      Required with --live. Must be 1. Safety cap on exchanges.
 *   --verbose        Print extra detail to console
 *
 * ─── LIVE MODE GUARD (all four required) ──────────────────────────────────────
 *   --live            confirms live intent
 *   --confirm-live    double-confirmation (protects against accidental --live)
 *   --exchange <slug> single exchange target (no bulk runs via CLI)
 *   --limit 1         explicit cap (must be exactly 1)
 *
 * ─── OUTPUT ───────────────────────────────────────────────────────────────────
 *   reports/bonus-landing-verification-plan.json       (dry-run)
 *   reports/bonus-landing-verification-plan.md         (dry-run)
 *   reports/bonus-landing-snapshots/latest.json        (live)
 *   reports/bonus-landing-snapshots/YYYY-MM-DD/{slug}-global.json  (live)
 *   reports/bonus-landing-verification-live-report.md  (live)
 *
 * ─── ARCHITECTURE ─────────────────────────────────────────────────────────────
 *   See docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md for full design.
 *
 * ─── SCHEDULE (when --live is wired to CI) ────────────────────────────────────
 *   Every 3 days via GitHub Actions cron: '0 8 * /3 * *' (every 3rd day)
 *   Stagger: 90s between exchanges (~21 min total for all 14)
 */

import fs            from 'node:fs';
import path          from 'node:path';
import crypto        from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ─── CLI flags ─────────────────────────────────────────────────────────────────
const args         = process.argv.slice(2);
const LIVE         = args.includes('--live');
const CONFIRM_LIVE = args.includes('--confirm-live');
const WRITE_JSON   = args.includes('--json');
const WRITE_MD     = args.includes('--markdown');
const VERBOSE      = args.includes('--verbose');

const filterIdx    = args.indexOf('--exchange');
const FILTER_SLUG  = filterIdx !== -1 ? args[filterIdx + 1] : null;

const limitIdx     = args.indexOf('--limit');
const LIMIT_RAW    = limitIdx !== -1 ? args[limitIdx + 1] : null;
const LIMIT_N      = LIMIT_RAW !== null ? parseInt(LIMIT_RAW, 10) : null;

// Console helpers
const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);
const err  = (...a) => console.error('  ✖', ...a);

// ─── Constants ──────────────────────────────────────────────────────────────────
const SITE_BASE      = 'https://cryptobonusworld.com';
const CADENCE_DAYS   = 3;
const STAGGER_SECS   = 90;
const TODAY          = new Date('2026-06-03');
const TODAY_STR      = TODAY.toISOString().split('T')[0];

const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const VIEWPORT   = { width: 1440, height: 900 };

// Exchange priority tiers
const EXCHANGE_PRIORITY = {
  binance:  1, okx:      1, mexc:     1, bitget:   1,
  bybit:    2, bingx:    2, 'gate-io':2, kucoin:   2, htx: 2,
  coinex:   3, phemex:   3, bitunix:  3, lbank:    3, coinbase: 3,
};

// Detection patterns applied to live page text
const DETECTION_PATTERNS = [
  {
    name: 'up_to_amount',
    regex: /up\s+to\s+[\$]?([\d,]+(?:\.\d+)?)\s*(USDT|USD|BTC|ETH|USDC)?/i,
    description: 'e.g. "up to 30,000 USDT"',
  },
  {
    name: 'amount_bonus',
    regex: /([\d,]+(?:\.\d+)?)\s*(USDT|USD|BTC|ETH|USDC)\s+(?:welcome\s+)?bonus/i,
    description: 'e.g. "19800 USDT bonus"',
  },
  {
    name: 'welcome_bonus',
    regex: /welcome\s+bonus\s+(?:up\s+to\s+)?([\d,]+(?:\.\d+)?)/i,
    description: 'e.g. "welcome bonus up to 5000"',
  },
  {
    name: 'abbreviated_amount',
    regex: /([\d,]+)K\s*(USDT|USD)?/i,
    description: 'e.g. "30K USDT"',
  },
  {
    name: 'presence_only',
    regex: /(deposit\s+bonus|trading\s+rewards|welcome\s+gift|sign[-\s]?up\s+bonus)/i,
    description: 'Presence detection (no amount extracted)',
  },
];

// ─── Load source data ───────────────────────────────────────────────────────────

function loadExchanges() {
  const p = path.join(ROOT, 'src', 'data', 'exchanges.json');
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`FATAL: Cannot read exchanges.json — ${e.message}`);
    process.exit(2);
  }
}

function loadAllEvidence() {
  const dir = path.join(ROOT, 'src', 'data', 'evidence');
  const result = {};
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
    for (const f of files) {
      try {
        result[f.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      } catch { /* skip malformed */ }
    }
  } catch (e) {
    console.error(`FATAL: Cannot read evidence directory — ${e.message}`);
    process.exit(2);
  }
  return result;
}

// ─── Build verification plan ────────────────────────────────────────────────────

function buildPlan(exchanges, evidence) {
  const plan = [];

  for (const ex of exchanges) {
    const slug     = ex.slug;
    if (FILTER_SLUG && slug !== FILTER_SLUG) continue;

    const ev       = evidence[slug];
    const facts    = ev?.facts ?? [];
    const priority = EXCHANGE_PRIORITY[slug] ?? 3;

    const bonusFacts = facts.filter(f => /bonus/i.test(f.field));
    const amountFact = facts.find(f => f.field === 'bonus_amount');
    const currFact   = facts.find(f => f.field === 'bonus_currency');
    const expiryFact = facts.find(f => f.field === 'bonus_expiry_days');
    const reqDepFact = facts.find(f => f.field === 'bonus_requires_deposit');

    const bonusScores  = bonusFacts.map(f => f.confidenceScore ?? 0);
    const bonusAvgConf = bonusScores.length > 0
      ? Math.round(bonusScores.reduce((a, b) => a + b, 0) / bonusScores.length * 100) / 100
      : 0;
    const hasOutdated   = bonusFacts.some(f => f.conflictStatus === 'outdated');
    const hasManual     = bonusFacts.some(f => f.manualReviewRequired === true);
    const hasUnverified = bonusFacts.some(f => f.conflictStatus === 'unverified');

    const affiliateUrl = ex.affiliateLinks?.default ?? ex.affiliateUrl ?? null;
    const goUrl        = `${SITE_BASE}/go/${slug}/`;
    const captureUrl   = affiliateUrl && affiliateUrl !== '#' ? affiliateUrl : null;

    const reasons = [];
    if (amountFact?.conflictStatus === 'outdated') reasons.push('bonus_amount is outdated');
    if (amountFact?.manualReviewRequired)          reasons.push('bonus_amount requires manual review');
    if (hasUnverified)                             reasons.push(`${bonusFacts.filter(f => f.conflictStatus === 'unverified').length} bonus fact(s) unverified`);
    if (bonusAvgConf < 0.30)                       reasons.push(`very low bonus confidence (${bonusAvgConf})`);
    if (bonusAvgConf < 0.50)                       reasons.push(`bonus confidence below publish threshold (${bonusAvgConf} < 0.50)`);

    const isPublishSafe = bonusAvgConf >= 0.50 && !hasManual && amountFact?.conflictStatus !== 'outdated';
    const cadenceDays   = priority === 3 ? CADENCE_DAYS * 2 : CADENCE_DAYS;
    const nextRun       = new Date(TODAY);
    nextRun.setDate(nextRun.getDate() + cadenceDays);

    plan.push({
      exchange:     slug,
      name:         ex.name,
      priority,
      goUrl,
      affiliateUrl: affiliateUrl ?? null,
      captureUrl,
      expectedBonus: {
        amount:              amountFact?.currentValue ?? null,
        currency:            currFact?.currentValue ?? null,
        unit:                amountFact?.unit ?? null,
        expiryDays:          expiryFact?.currentValue ?? null,
        requiresDeposit:     reqDepFact?.currentValue ?? null,
        confidenceScore:     amountFact?.confidenceScore ?? null,
        conflictStatus:      amountFact?.conflictStatus ?? 'unverified',
        lastChecked:         amountFact?.lastChecked ?? null,
        manualReviewRequired: amountFact?.manualReviewRequired ?? false,
      },
      bonusSummary: {
        factCount:    bonusFacts.length,
        avgConfidence: bonusAvgConf,
        hasOutdated,
        hasManual,
        hasUnverified,
        isPublishSafe,
      },
      verificationPlan: {
        cadenceDays,
        nextScheduledRun: nextRun.toISOString().split('T')[0],
        reasons,
        urgency: priority === 1 && (hasOutdated || hasManual) ? 'HIGH' :
                 priority <= 2 && hasOutdated ? 'MEDIUM' : 'LOW',
      },
      liveMode: {
        status:            LIVE ? 'pending' : 'not_run',
        playwrightReady:   true,
        detectionPatterns: DETECTION_PATTERNS.map(p => p.name),
        outputPath:        `/screenshots/${slug}/bonus_referral_landing/global-desktop-${TODAY_STR.slice(0, 7)}.webp`,
        snapshotPath:      `reports/bonus-landing-snapshots/${TODAY_STR}/${slug}-global.json`,
      },
      notes: reasons.length === 0
        ? 'No immediate issues detected in evidence data.'
        : reasons.join('; '),
    });
  }

  const urgencyRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  plan.sort((a, b) => {
    const ua = urgencyRank[a.verificationPlan.urgency] ?? 2;
    const ub = urgencyRank[b.verificationPlan.urgency] ?? 2;
    if (ua !== ub) return ua - ub;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.exchange.localeCompare(b.exchange);
  });

  for (let i = 0; i < plan.length; i++) {
    plan[i].liveMode.staggerOffsetSeconds = i * STAGGER_SECS;
    plan[i].liveMode.estimatedStartTime   = `T+${i * STAGGER_SECS}s`;
  }

  return plan;
}

// ─── Bonus detection ────────────────────────────────────────────────────────────

/**
 * Attempt to detect a bonus amount from page text.
 * Returns { amount, currency, rawText, patternUsed, matchStatus, manualReviewRequired }.
 */
function detectBonus(pageText, expected) {
  const text = pageText ?? '';

  // Check for access-blocked / captcha pages
  const blockPatterns = [/captcha/i, /challenge/i, /access\s+denied/i, /cloudflare/i, /just\s+a\s+moment/i, /verify\s+you\s+are\s+human/i];
  if (blockPatterns.some(p => p.test(text))) {
    return {
      amount:               null,
      currency:             null,
      rawText:              text.slice(0, 200),
      patternUsed:          null,
      matchStatus:          'blocked',
      manualReviewRequired: true,
      notes:                'Page appears to be a CAPTCHA/challenge page.',
    };
  }

  // Try each detection pattern in order
  for (const dp of DETECTION_PATTERNS) {
    const m = text.match(dp.regex);
    if (!m) continue;

    // presence_only pattern — no amount extracted
    if (dp.name === 'presence_only') {
      return {
        amount:               null,
        currency:             null,
        rawText:              m[0],
        patternUsed:          dp.name,
        matchStatus:          'needs_review',
        manualReviewRequired: true,
        notes:                'Bonus presence detected but no amount could be extracted.',
      };
    }

    // Extract amount (remove commas, parse)
    const rawAmount  = m[1]?.replace(/,/g, '') ?? null;
    const parsedAmt  = rawAmount !== null ? parseFloat(rawAmount) : null;
    let   currency   = m[2]?.toUpperCase() ?? null;

    // abbreviated_amount: multiply K values
    let finalAmount = parsedAmt;
    if (dp.name === 'abbreviated_amount' && finalAmount !== null) {
      finalAmount = finalAmount * 1000;
    }

    // Currency fallback: use expected currency if not captured
    if (!currency && expected?.currency) currency = expected.currency;

    // Compare against expected
    const expAmt = expected?.amount !== null && expected?.amount !== undefined
      ? parseFloat(expected.amount)
      : null;
    const expCur = expected?.currency ?? null;

    let matchStatus;
    if (finalAmount === null) {
      matchStatus = 'not_detected';
    } else if (expAmt === null) {
      // No expected value to compare against
      matchStatus = 'needs_review';
    } else {
      // Allow ±5% tolerance for rounding / display differences
      const tolerance = expAmt * 0.05;
      const amtMatch  = Math.abs(finalAmount - expAmt) <= tolerance;
      const curMatch  = !currency || !expCur || currency === expCur;
      matchStatus = (amtMatch && curMatch) ? 'match' : 'mismatch';
    }

    return {
      amount:               finalAmount,
      currency:             currency ?? null,
      rawText:              m[0],
      patternUsed:          dp.name,
      matchStatus,
      manualReviewRequired: matchStatus !== 'match',
      notes:                null,
    };
  }

  // Nothing matched
  return {
    amount:               null,
    currency:             null,
    rawText:              null,
    patternUsed:          null,
    matchStatus:          'not_detected',
    manualReviewRequired: true,
    notes:                'No bonus amount or presence detected on page.',
  };
}

// ─── Live verification (single exchange) ────────────────────────────────────────

async function runLiveVerification(planEntry) {
  const slug         = planEntry.exchange;
  const captureUrl   = planEntry.captureUrl;
  const expectedBonus = planEntry.expectedBonus;

  log('');
  log(`  ┌─ Live verification: ${slug.toUpperCase()} ─────────────────────────`);
  log(`  │  Capture URL:  ${captureUrl}`);
  log(`  │  Expected:     ${expectedBonus.amount ?? 'unknown'} ${expectedBonus.currency ?? ''}`);
  log(`  │  Confidence:   ${expectedBonus.confidenceScore ?? 'n/a'}`);
  log(`  └─────────────────────────────────────────────────────────`);
  log('');

  if (!captureUrl) {
    err(`No capture URL for ${slug} — skipping live check`);
    return buildErrorSnapshot(slug, planEntry, 'No affiliate URL available for live capture.');
  }

  // Snapshot paths
  const runDate      = TODAY_STR;
  const snapshotDir  = path.join(ROOT, 'reports', 'bonus-landing-snapshots', runDate);
  const screenshotDir = path.join(ROOT, 'reports', 'bonus-landing-snapshots', runDate);
  const snapshotPath = path.join(snapshotDir, `${slug}-global.json`);
  const screenshotPath = path.join(screenshotDir, `${slug}-screenshot.webp`);

  // Ensure directories exist
  fs.mkdirSync(snapshotDir, { recursive: true });

  let browser, context, page;
  const redirectChain = [];
  let   httpStatus    = null;
  let   finalUrl      = captureUrl;
  let   pageTitle     = null;
  let   visibleText   = '';
  let   screenshotSaved = false;
  let   captureError  = null;
  let   playwrightVer = 'unknown';

  try {
    const pw = await import('playwright');
    // Detect playwright version from package.json
    try {
      const pkgPath = path.join(ROOT, 'node_modules', 'playwright', 'package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      playwrightVer = pkgJson.version ?? 'unknown';
    } catch { /* non-fatal */ }

    dbg(`Playwright version: ${playwrightVer}`);
    dbg('Launching Chromium (headless)…');

    browser = await pw.chromium.launch({ headless: true });
    context = await browser.newContext({
      userAgent: UA_DESKTOP,
      viewport:  VIEWPORT,
      locale:    'en-US',
      timezoneId: 'America/New_York',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });
    page = await context.newPage();

    // Track redirects
    page.on('response', resp => {
      const status = resp.status();
      const url    = resp.url();
      if (status >= 300 && status < 400) {
        redirectChain.push({ from: url, status });
      }
      if (url === captureUrl || redirectChain.length === 0) {
        httpStatus = status;
      }
    });

    dbg(`Navigating to: ${captureUrl}`);
    const response = await page.goto(captureUrl, {
      timeout:    30000,
      waitUntil: 'domcontentloaded',
    });

    if (response) {
      httpStatus = response.status();
      finalUrl   = page.url();
    }

    // Extra wait for JS-rendered content
    try {
      await page.waitForTimeout(3000);
    } catch { /* timeout is fine */ }

    pageTitle = await page.title().catch(() => null);
    dbg(`Page title: ${pageTitle}`);
    dbg(`Final URL:  ${finalUrl}`);
    dbg(`HTTP status: ${httpStatus}`);

    // Extract visible text: headings + bonus-related elements
    visibleText = await page.evaluate(() => {
      const selectors = [
        'h1', 'h2', 'h3', 'h4',
        '[class*="bonus"]', '[class*="reward"]', '[class*="welcome"]',
        '[class*="promo"]', '[class*="offer"]', '[class*="gift"]',
        '[class*="hero"]', '[class*="banner"]', '[class*="promotion"]',
        'title',
      ];
      const texts = [];
      for (const sel of selectors) {
        try {
          document.querySelectorAll(sel).forEach(el => {
            const t = (el.innerText || el.textContent || '').trim();
            if (t) texts.push(t);
          });
        } catch { /* selector may fail */ }
      }
      // Also get all text for pattern fallback
      const bodyText = (document.body?.innerText || '').slice(0, 5000);
      texts.push(bodyText);
      return texts.join('\n');
    }).catch(() => '');

    dbg(`Visible text length: ${visibleText.length} chars`);
    dbg(`Text sample: ${visibleText.slice(0, 150).replace(/\n/g, ' ')}`);

    // Take screenshot
    try {
      await page.screenshot({
        path:     screenshotPath,
        type:     'webp',
        fullPage: false,  // viewport-only (safe — no hidden personal data)
      });
      screenshotSaved = true;
      dbg(`Screenshot saved: ${screenshotPath}`);
    } catch (screenshotErr) {
      dbg(`Screenshot failed: ${screenshotErr.message}`);
    }

  } catch (e) {
    captureError = e.message ?? String(e);
    err(`Playwright error for ${slug}: ${captureError}`);
  } finally {
    try { await page?.close(); }    catch { /* ignore */ }
    try { await context?.close(); } catch { /* ignore */ }
    try { await browser?.close(); } catch { /* ignore */ }
  }

  // Detect bonus from text
  const detectedBonus = detectBonus(visibleText, expectedBonus);

  // Generate content hash for change detection
  const visibleTextHash = visibleText
    ? crypto.createHash('sha256').update(visibleText).digest('hex').slice(0, 16)
    : null;

  // Build snapshot
  const snapshot = {
    exchange:       slug,
    region:         'GLOBAL',
    runId:          `${TODAY_STR}-${slug}-live`,
    sourceGoUrl:    planEntry.goUrl,
    affiliateUrl:   captureUrl,
    finalUrl,
    redirectChain,
    httpStatus,
    expectedBonus: {
      amount:               expectedBonus.amount,
      currency:             expectedBonus.currency,
      confidence:           expectedBonus.confidenceScore,
      conflictStatus:       expectedBonus.conflictStatus,
      lastChecked:          expectedBonus.lastChecked,
      manualReviewRequired: expectedBonus.manualReviewRequired,
    },
    detectedBonus: {
      amount:      detectedBonus.amount,
      currency:    detectedBonus.currency,
      rawText:     detectedBonus.rawText,
      pattern:     detectedBonus.patternUsed,
    },
    matchStatus:          captureError ? 'error' : detectedBonus.matchStatus,
    confidenceScore:      captureError ? 0 : (detectedBonus.matchStatus === 'match' ? 0.85 : 0.1),
    manualReviewRequired: captureError ? true : detectedBonus.manualReviewRequired,
    capturedAt:           new Date().toISOString(),
    screenshotPath:       screenshotSaved
      ? `reports/bonus-landing-snapshots/${runDate}/${slug}-screenshot.webp`
      : null,
    screenshotHash:       null,  // populated if screenshot is hashed separately
    pageTitle,
    visibleTextHash,
    geo:                  'GLOBAL',
    userAgentProfile:     'Chrome/125-Windows-Desktop',
    playwrightVersion:    playwrightVer,
    captureError:         captureError ?? null,
    detectionNotes:       detectedBonus.notes ?? null,
  };

  // Log result
  const statusIcon = { match: '✅', mismatch: '⚠️', not_detected: '❓', blocked: '🚫', error: '❌', needs_review: '🔍' };
  log(`  ${statusIcon[snapshot.matchStatus] ?? '?'} ${slug.toUpperCase()} — matchStatus: ${snapshot.matchStatus}`);
  if (detectedBonus.amount !== null) {
    log(`     Detected:  ${detectedBonus.amount} ${detectedBonus.currency ?? ''} (pattern: ${detectedBonus.patternUsed})`);
  } else {
    log(`     Detected:  (none)`);
  }
  log(`     Expected:  ${expectedBonus.amount ?? 'unknown'} ${expectedBonus.currency ?? ''}`);
  if (snapshot.manualReviewRequired) {
    log(`     ⚠️  manualReviewRequired: true`);
  }
  if (screenshotSaved) {
    log(`     📸 Screenshot: ${snapshot.screenshotPath}`);
  }
  log('');

  // Write per-exchange snapshot JSON
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
  dbg(`Snapshot written: ${snapshotPath}`);

  return snapshot;
}

function buildErrorSnapshot(slug, planEntry, errorMsg) {
  return {
    exchange:             slug,
    region:               'GLOBAL',
    runId:                `${TODAY_STR}-${slug}-live`,
    sourceGoUrl:          planEntry.goUrl,
    affiliateUrl:         planEntry.captureUrl,
    finalUrl:             null,
    redirectChain:        [],
    httpStatus:           null,
    expectedBonus:        planEntry.expectedBonus,
    detectedBonus:        { amount: null, currency: null, rawText: null, pattern: null },
    matchStatus:          'error',
    confidenceScore:      0,
    manualReviewRequired: true,
    capturedAt:           new Date().toISOString(),
    screenshotPath:       null,
    screenshotHash:       null,
    pageTitle:            null,
    visibleTextHash:      null,
    geo:                  'GLOBAL',
    userAgentProfile:     'Chrome/125-Windows-Desktop',
    playwrightVersion:    'unknown',
    captureError:         errorMsg,
    detectionNotes:       null,
  };
}

// ─── Write live report (markdown) ───────────────────────────────────────────────

function writeLiveReport(snapshots) {
  const reportsDir = path.join(ROOT, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const lines = [];
  lines.push('# Bonus Landing Verification — Live Report');
  lines.push('');
  lines.push(`> Generated: ${new Date().toISOString()}  `);
  lines.push(`> Mode: LIVE (Playwright)  `);
  lines.push(`> Date: ${TODAY_STR}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Summary');
  lines.push('');

  const total      = snapshots.length;
  const matched    = snapshots.filter(s => s.matchStatus === 'match').length;
  const mismatched = snapshots.filter(s => s.matchStatus === 'mismatch').length;
  const notDet     = snapshots.filter(s => s.matchStatus === 'not_detected').length;
  const blocked    = snapshots.filter(s => s.matchStatus === 'blocked').length;
  const errors     = snapshots.filter(s => s.matchStatus === 'error').length;
  const needsRev   = snapshots.filter(s => s.manualReviewRequired).length;

  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Total verified | ${total} |`);
  lines.push(`| ✅ Match | ${matched} |`);
  lines.push(`| ⚠️ Mismatch | ${mismatched} |`);
  lines.push(`| ❓ Not detected | ${notDet} |`);
  lines.push(`| 🚫 Blocked/CAPTCHA | ${blocked} |`);
  lines.push(`| ❌ Error | ${errors} |`);
  lines.push(`| Manual review required | ${needsRev} |`);
  lines.push('');
  lines.push('> ⚠️ All mismatches require manual review before updating live data.');
  lines.push('> No changes have been made to production data automatically.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Results');
  lines.push('');

  for (const s of snapshots) {
    const icon = { match: '✅', mismatch: '⚠️', not_detected: '❓', blocked: '🚫', error: '❌', needs_review: '🔍' }[s.matchStatus] ?? '?';
    lines.push(`### ${icon} ${s.exchange.toUpperCase()}`);
    lines.push('');
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| Match Status | **${s.matchStatus}** |`);
    lines.push(`| Expected | ${s.expectedBonus.amount ?? '—'} ${s.expectedBonus.currency ?? ''} |`);
    lines.push(`| Detected | ${s.detectedBonus.amount ?? '—'} ${s.detectedBonus.currency ?? ''} |`);
    lines.push(`| Pattern Used | \`${s.detectedBonus.pattern ?? 'none'}\` |`);
    lines.push(`| Raw Text | ${s.detectedBonus.rawText ? `\`${s.detectedBonus.rawText.slice(0, 80)}\`` : '—'} |`);
    lines.push(`| Final URL | ${s.finalUrl ? `\`${s.finalUrl.slice(0, 80)}\`` : '—'} |`);
    lines.push(`| HTTP Status | ${s.httpStatus ?? '—'} |`);
    lines.push(`| Page Title | ${s.pageTitle ?? '—'} |`);
    lines.push(`| Text Hash | \`${s.visibleTextHash ?? 'n/a'}\` |`);
    lines.push(`| Screenshot | ${s.screenshotPath ?? '—'} |`);
    lines.push(`| Manual Review | ${s.manualReviewRequired ? '⚠️ **Yes**' : '✅ No'} |`);
    lines.push(`| Captured At | ${s.capturedAt} |`);
    if (s.captureError) {
      lines.push(`| Error | \`${s.captureError.slice(0, 120)}\` |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Safety Notes');
  lines.push('');
  lines.push('- ✅ No logins performed');
  lines.push('- ✅ No forms submitted');
  lines.push('- ✅ No CAPTCHAs bypassed');
  lines.push('- ✅ Only public landing pages visited');
  lines.push('- ✅ No production data modified');
  lines.push('- ✅ All mismatches flagged for manual review');
  lines.push('');
  lines.push(`*See: [BONUS_LANDING_VERIFICATION_ARCHITECTURE.md](../docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md)*`);

  const mdPath = path.join(reportsDir, 'bonus-landing-verification-live-report.md');
  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
  return mdPath;
}

// ─── Main ───────────────────────────────────────────────────────────────────────

const exchanges = loadExchanges();
const evidence  = loadAllEvidence();
const plan      = buildPlan(exchanges, evidence);

const totalExchanges = plan.length;
const highUrgency    = plan.filter(e => e.verificationPlan.urgency === 'HIGH').length;
const medUrgency     = plan.filter(e => e.verificationPlan.urgency === 'MEDIUM').length;
const publishSafe    = plan.filter(e => e.bonusSummary.isPublishSafe).length;
const hasAffiliate   = plan.filter(e => !!e.captureUrl).length;

// ─── Live mode guard ─────────────────────────────────────────────────────────────
if (LIVE) {
  log('');
  log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('   LIVE MODE GUARD — checking all required flags');
  log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');

  const guardErrors = [];

  if (!CONFIRM_LIVE) {
    guardErrors.push('Missing --confirm-live  (required alongside --live to prevent accidents)');
  }
  if (!FILTER_SLUG) {
    guardErrors.push('Missing --exchange <slug>  (live mode must target exactly one exchange)');
  }
  if (LIMIT_N === null) {
    guardErrors.push('Missing --limit 1  (explicit cap is required in live mode)');
  } else if (LIMIT_N !== 1) {
    guardErrors.push(`--limit must be exactly 1, got: ${LIMIT_N}  (only single-exchange live runs allowed via CLI)`);
  }

  // Validate slug exists in plan
  if (FILTER_SLUG && !plan.find(e => e.exchange === FILTER_SLUG)) {
    guardErrors.push(`Unknown exchange slug: "${FILTER_SLUG}"  (not found in exchanges.json)`);
  }

  // Validate captureUrl exists
  const targetEntry = plan.find(e => e.exchange === FILTER_SLUG);
  if (targetEntry && !targetEntry.captureUrl) {
    guardErrors.push(`No affiliate/capture URL for "${FILTER_SLUG}" — cannot run live check`);
  }

  if (guardErrors.length > 0) {
    log('  ❌ LIVE MODE REJECTED — guard check failed:');
    log('');
    for (const e of guardErrors) {
      log(`     ✖  ${e}`);
    }
    log('');
    log('  Required flags for live mode:');
    log('     --live                   (you have this)');
    log('     --confirm-live           (explicit double-confirmation)');
    log('     --exchange <slug>        (target one exchange only)');
    log('     --limit 1                (cap — must be exactly 1)');
    log('');
    log('  Example:');
    log('     node scripts/bonus-landing-verification.mjs --live --confirm-live --exchange bybit --limit 1');
    log('');
    log('  Aborting. No pages visited.');
    log('');
    process.exit(1);
  }

  log(`  ✅ Guard passed. Running live verification for: ${FILTER_SLUG}`);
  log('');

  // Run live verification
  const entry     = plan.find(e => e.exchange === FILTER_SLUG);
  const snapshots = [await runLiveVerification(entry)];

  // Write latest.json (always overwritten)
  const reportsDir  = path.join(ROOT, 'reports');
  const snapshotsDir = path.join(reportsDir, 'bonus-landing-snapshots');
  fs.mkdirSync(snapshotsDir, { recursive: true });

  const latestPath = path.join(snapshotsDir, 'latest.json');
  const latestData = {
    generatedAt: new Date().toISOString(),
    mode:        'live',
    runDate:     TODAY_STR,
    exchange:    FILTER_SLUG,
    snapshots,
  };
  fs.writeFileSync(latestPath, JSON.stringify(latestData, null, 2), 'utf8');
  log(`  📄 latest.json written: ${latestPath}`);

  // Write live markdown report
  const mdPath = writeLiveReport(snapshots);
  log(`  📄 Live report written: ${mdPath}`);

  log('');
  log('  ═══════════════════════════════════════════════════════');
  log(`   LIVE VERIFICATION COMPLETE — ${FILTER_SLUG.toUpperCase()}`);
  const s = snapshots[0];
  log(`   Match status:  ${s.matchStatus}`);
  log(`   Manual review: ${s.manualReviewRequired ? 'REQUIRED' : 'not required'}`);
  log(`   Screenshot:    ${s.screenshotPath ?? 'not saved'}`);
  log('');
  log('  ⚠️  REMINDER: No production data has been modified.');
  log('     Review the snapshot + screenshot before updating evidence.');
  log('  ═══════════════════════════════════════════════════════');
  log('');

  process.exit(0);
}

// ─── Dry-run plan ────────────────────────────────────────────────────────────────

log('');
log('══════════════════════════════════════════════════════');
log('  Bonus Landing Verification — DRY RUN PLAN');
log('══════════════════════════════════════════════════════');
log(`  Generated:       ${TODAY_STR}`);
log(`  Mode:            DRY RUN (no HTTP requests)`);
log(`  Exchanges:       ${totalExchanges}`);
log(`  Cadence:         Every ${CADENCE_DAYS} days (P1/P2) / ${CADENCE_DAYS * 2} days (P3)`);
log(`  Stagger:         ${STAGGER_SECS}s between exchanges`);
log(`  Total live time: ~${Math.ceil(totalExchanges * STAGGER_SECS / 60)} min if run at once`);
log('');
log('  Priority breakdown:');
log(`    HIGH urgency:   ${highUrgency} exchange(s)`);
log(`    MEDIUM urgency: ${medUrgency} exchange(s)`);
log(`    LOW urgency:    ${totalExchanges - highUrgency - medUrgency} exchange(s)`);
log(`    Publish-safe:   ${publishSafe}/${totalExchanges} bonus claims`);
log(`    Has captureUrl: ${hasAffiliate}/${totalExchanges}`);
log('');
log('  Top 5 by urgency:');
for (const entry of plan.slice(0, 5)) {
  const bonus = entry.expectedBonus.amount
    ? `${entry.expectedBonus.amount} ${entry.expectedBonus.currency ?? ''}`
    : '(no amount)';
  log(`    [P${entry.priority} ${entry.verificationPlan.urgency}] ${entry.exchange.padEnd(10)} expected: ${bonus.padEnd(18)} conf: ${entry.expectedBonus.confidenceScore ?? 'n/a'}`);
}
log('');

if (VERBOSE) {
  log('  Detection patterns:');
  for (const p of DETECTION_PATTERNS) {
    log(`    ${p.name.padEnd(22)} → ${p.description}`);
  }
  log('');
}

log('  ℹ️  DRY RUN — no pages visited.');
log('');
log('  To run live verification for one exchange:');
log('    node scripts/bonus-landing-verification.mjs \\');
log('      --live --confirm-live --exchange bybit --limit 1');
log('');
log('  See: docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md');
log('');

// ─── Build report objects ───────────────────────────────────────────────────────
const reportJson = {
  generatedAt: new Date().toISOString(),
  mode:        'dry_run',
  cadence: {
    p1p2DaysBetweenRuns: CADENCE_DAYS,
    p3DaysBetweenRuns:   CADENCE_DAYS * 2,
    staggerSeconds:      STAGGER_SECS,
    ciCronSchedule:      `0 8 */${CADENCE_DAYS} * *`,
    totalEstimatedLiveMinutes: Math.ceil(totalExchanges * STAGGER_SECS / 60),
  },
  summary: {
    totalExchanges,
    highUrgency,
    medUrgency,
    lowUrgency:          totalExchanges - highUrgency - medUrgency,
    publishSafeCount:    publishSafe,
    hasCaptureUrl:       hasAffiliate,
    notPublishSafeCount: totalExchanges - publishSafe,
  },
  detectionPatterns:  DETECTION_PATTERNS.map(({ name, description }) => ({ name, description })),
  architectureDoc:    'docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md',
  proposedWorkflow:   '.github/workflows/bonus-landing-verification.yml (not yet created)',
  plan,
};

// ─── Write dry-run reports ───────────────────────────────────────────────────────
const reportsDir = path.join(ROOT, 'reports');

if (WRITE_JSON || WRITE_MD) {
  try {
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  } catch (e) {
    console.error(`FATAL: Cannot create reports directory — ${e.message}`);
    process.exit(2);
  }
}

if (WRITE_JSON) {
  const jsonPath = path.join(reportsDir, 'bonus-landing-verification-plan.json');
  fs.writeFileSync(jsonPath, JSON.stringify(reportJson, null, 2), 'utf8');
  log(`  JSON plan written: ${jsonPath}`);
}

if (WRITE_MD) {
  const lines = [];
  lines.push('# Bonus Landing Verification Plan');
  lines.push(`> CryptoBonusWorld — Dry-Run Plan Generated ${TODAY_STR}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total exchanges | ${totalExchanges} |`);
  lines.push(`| HIGH urgency | ${highUrgency} |`);
  lines.push(`| MEDIUM urgency | ${medUrgency} |`);
  lines.push(`| Publish-safe bonus claims | ${publishSafe}/${totalExchanges} |`);
  lines.push(`| Has capture URL | ${hasAffiliate}/${totalExchanges} |`);
  lines.push(`| Cadence (P1/P2) | Every ${CADENCE_DAYS} days |`);
  lines.push(`| Cadence (P3) | Every ${CADENCE_DAYS * 2} days |`);
  lines.push(`| Stagger between exchanges | ${STAGGER_SECS}s |`);
  lines.push(`| Est. live capture time | ~${Math.ceil(totalExchanges * STAGGER_SECS / 60)} min |`);
  lines.push(`| CI cron schedule | \`0 8 */${CADENCE_DAYS} * *\` |`);
  lines.push(`| Architecture doc | [BONUS_LANDING_VERIFICATION_ARCHITECTURE.md](../docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md) |`);
  lines.push('');
  lines.push('## Mode: DRY RUN');
  lines.push('');
  lines.push('> No live pages were visited. This plan is generated from local evidence data.');
  lines.push('> Pass all four flags to enable live capture:');
  lines.push('> `--live --confirm-live --exchange <slug> --limit 1`');
  lines.push('');
  lines.push('## Detection Patterns');
  lines.push('');
  lines.push('| Pattern Name | Description |');
  lines.push('|-------------|-------------|');
  for (const p of DETECTION_PATTERNS) {
    lines.push(`| \`${p.name}\` | ${p.description} |`);
  }
  lines.push('');
  lines.push('## Verification Queue (sorted by urgency)');
  lines.push('');
  lines.push('| # | Exchange | Priority | Urgency | Expected Bonus | Conf | Status | Next Run |');
  lines.push('|---|----------|---------|---------|---------------|------|--------|----------|');
  plan.forEach((e, i) => {
    const bonus = e.expectedBonus.amount
      ? `${e.expectedBonus.amount} ${e.expectedBonus.currency ?? ''}`
      : '—';
    const conf = e.expectedBonus.confidenceScore?.toFixed(2) ?? 'n/a';
    const safe = e.bonusSummary.isPublishSafe ? '✅' : '⚠️';
    lines.push(`| ${i + 1} | **${e.exchange}** | P${e.priority} | ${e.verificationPlan.urgency} | ${bonus} | ${conf} | ${safe} | ${e.verificationPlan.nextScheduledRun} |`);
  });
  lines.push('');
  lines.push('## Per-Exchange Detail');
  lines.push('');
  for (const e of plan) {
    lines.push(`### ${e.name} (\`${e.exchange}\`)`);
    lines.push('');
    lines.push('| Field | Value |');
    lines.push('|-------|-------|');
    lines.push(`| Priority | P${e.priority} |`);
    lines.push(`| Urgency | **${e.verificationPlan.urgency}** |`);
    lines.push(`| Go URL | \`${e.goUrl}\` |`);
    lines.push(`| Affiliate URL | \`${e.affiliateUrl ?? '—'}\` |`);
    lines.push(`| Expected Bonus | ${e.expectedBonus.amount ?? '—'} ${e.expectedBonus.currency ?? ''} |`);
    lines.push(`| Confidence | ${e.expectedBonus.confidenceScore ?? 'n/a'} |`);
    lines.push(`| Conflict Status | ${e.expectedBonus.conflictStatus} |`);
    lines.push(`| Manual Review | ${e.expectedBonus.manualReviewRequired ? '⚠️ Yes' : '✅ No'} |`);
    lines.push(`| Publish-Safe | ${e.bonusSummary.isPublishSafe ? '✅ Yes' : '⚠️ No'} |`);
    lines.push(`| Cadence | Every ${e.verificationPlan.cadenceDays} days |`);
    lines.push(`| Next Scheduled Run | ${e.verificationPlan.nextScheduledRun} |`);
    lines.push(`| Stagger Offset | ${e.liveMode.estimatedStartTime} from run start |`);
    lines.push('');
    if (e.verificationPlan.reasons.length > 0) {
      lines.push('**Reasons for verification:**');
      for (const r of e.verificationPlan.reasons) {
        lines.push(`- ${r}`);
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  const mdContent = lines.join('\n');
  const mdPath    = path.join(reportsDir, 'bonus-landing-verification-plan.md');
  fs.writeFileSync(mdPath, mdContent, 'utf8');
  log(`  Markdown plan written: ${mdPath}`);
}

log('');
