#!/usr/bin/env node
/**
 * bonus-screenshot-vision-detect.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Bonus Screenshot Vision Detection — CryptoBonusWorld
 *
 * PURPOSE:
 *   Builds a vision detection queue from available bonus landing screenshots
 *   and generates structured vision analysis prompts for AI-assisted bonus
 *   claim extraction from registration/referral landing page screenshots.
 *
 *   Addresses the core limitation of text-extraction-only verification:
 *   some exchanges (e.g. MEXC) render bonus claims in JS-hydrated SPA panels
 *   that produce HTTP 204 responses and empty DOM text — but ARE visually
 *   present in a full-page screenshot.
 *
 * DEFAULT MODE: DRY RUN
 *   Scans for available screenshots, builds prompt payloads, writes plan files.
 *   No external API calls. No HTTP requests. No production data modified.
 *
 * FUTURE: --vision-live
 *   Will send screenshots to a vision model API (Anthropic Messages API).
 *   NOT YET IMPLEMENTED — requires ANTHROPIC_API_KEY secret configuration.
 *   See docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md §14.11 for roadmap.
 *
 * ─── FLAGS ────────────────────────────────────────────────────────────────────
 *   (none)           Dry-run: generate detection plan only (no API calls)
 *   --json           Write plan to reports/bonus-vision-detection-plan.json
 *   --markdown       Write plan to reports/bonus-vision-detection-plan.md
 *   --verbose        Print extra detail to console
 *   --vision-live    [NOT IMPLEMENTED] Live AI vision analysis via API
 *
 * ─── OUTPUT ───────────────────────────────────────────────────────────────────
 *   reports/bonus-vision-detection-plan.json    (always written)
 *   reports/bonus-vision-detection-plan.md      (always written)
 *
 * ─── ARCHITECTURE ─────────────────────────────────────────────────────────────
 *   See docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md §14 for full design.
 *
 * ─── SAFETY ───────────────────────────────────────────────────────────────────
 *   Dry-run mode (default):
 *   ✅ No HTTP requests
 *   ✅ No external API calls
 *   ✅ No production data modified
 *   ✅ No affiliate URLs accessed
 *   ✅ No screenshots taken (reads existing only)
 *   ✅ No evidence files modified
 *   ✅ No accounts created or accessed
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ─── CLI flags ──────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const WRITE_JSON  = args.includes('--json');
const WRITE_MD    = args.includes('--markdown');
const VERBOSE     = args.includes('--verbose');
const VISION_LIVE = args.includes('--vision-live');

const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);

// ─── Constants ──────────────────────────────────────────────────────────────────
const TODAY_STR   = new Date('2026-06-03').toISOString().split('T')[0];

/** Vision model to use when live analysis is implemented. */
const VISION_MODEL       = 'claude-3-5-sonnet-20241022';
const VISION_MAX_TOKENS  = 512;
const VISION_TEMPERATURE = 0;

/** Exchange priority tiers (matches bonus-landing-verification.mjs). */
const EXCHANGE_PRIORITY = {
  binance:  1, okx:      1, mexc:     1, bitget:   1,
  bybit:    2, bingx:    2, 'gate-io':2, kucoin:   2, htx: 2,
  coinex:   3, phemex:   3, bitunix:  3, lbank:    3, coinbase: 3,
};

/**
 * JSON schema description for what the vision model should return.
 * Used both as documentation in the plan and as the output schema
 * when live API integration is added.
 */
const VISION_OUTPUT_SCHEMA = {
  exchange:               'string — exchange slug',
  pageType:               '"registration_referral_landing" | "bonus_promo" | "homepage" | "blocked" | "unknown"',
  detectedBonus:          'string (as shown on page, e.g. "10,000 USDT") | null',
  detectedAmount:         'number | null',
  detectedCurrency:       '"USDT" | "USD" | "BTC" | "ETH" | "USDC" | null',
  detectedReferralCode:   'string | null',
  visibleClaimText:       'string — exact verbatim bonus claim text visible | null',
  confidenceScore:        'number 0.0–1.0',
  matchStatus:            '"match" | "mismatch" | "not_detected" | "blocked" | "unknown"',
  obstructions:           'string[] — from: notification_permission_popup | google_signin_popup | cookie_banner | captcha | login_gate | age_gate | overlay | other_popup | none',
  cleanReshotRecommended: 'boolean — true if popups/obstructions present',
  manualReviewRequired:   'boolean',
  notes:                  'string | null',
};

// ─── Live mode guard ────────────────────────────────────────────────────────────

if (VISION_LIVE) {
  log('');
  log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('   VISION LIVE MODE — NOT YET IMPLEMENTED');
  log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');
  log('  Live vision analysis requires:');
  log('    1. ANTHROPIC_API_KEY environment variable (or GitHub Actions secret)');
  log('    2. screenshots available in reports/bonus-landing-snapshots/');
  log('    3. Phase 14-C implementation (see architecture doc §14.11)');
  log('');
  log('  Current status: DRY RUN plan generated (no API calls made).');
  log('');
  log('  Implementation roadmap:');
  log('    Phase 14-A: Architecture + skeleton ✅ (T09A.3)');
  log('    Phase 14-B: Improved Playwright capture (networkidle, dismiss popups)');
  log('    Phase 14-C: Anthropic Messages API integration + base64 image upload');
  log('    Phase 14-D: Vision result → review queue integration');
  log('    Phase 14-E: CI GitHub Actions workflow (weekly vision sweep)');
  log('');
  log('  Continuing with dry-run plan generation...');
  log('');
}

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
        result[f.replace('.json', '')] = JSON.parse(
          fs.readFileSync(path.join(dir, f), 'utf8')
        );
      } catch { /* skip malformed */ }
    }
  } catch (e) {
    console.error(`FATAL: Cannot read evidence directory — ${e.message}`);
    process.exit(2);
  }
  return result;
}

/**
 * Load existing snapshot JSONs from reports/bonus-landing-snapshots/.
 * Returns a map of slug → most recent snapshot record.
 */
function loadExistingSnapshots() {
  const snapshotBase = path.join(ROOT, 'reports', 'bonus-landing-snapshots');
  const bySlug = {};

  if (!fs.existsSync(snapshotBase)) return bySlug;

  const dateDirs = fs.readdirSync(snapshotBase)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse(); // Most recent first

  for (const dateDir of dateDirs) {
    const dirPath = path.join(snapshotBase, dateDir);
    try {
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('-global.json'));
      for (const f of files) {
        const slug = f.replace('-global.json', '');
        if (!bySlug[slug]) {
          try {
            bySlug[slug] = {
              ...JSON.parse(fs.readFileSync(path.join(dirPath, f), 'utf8')),
              _snapshotDate: dateDir,
              _snapshotFile: `reports/bonus-landing-snapshots/${dateDir}/${f}`,
            };
          } catch { /* skip malformed */ }
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  return bySlug;
}

/**
 * Load the MEXC manual evidence JSON if it exists.
 * Returns the parsed record, or null if the file is not present.
 *
 * Expected file: reports/manual-evidence/mexc-owner-bonus-screenshot.json
 *
 * When screenshotFile is set AND the referenced file exists on disk, the
 * buildMexcManualPlaceholder function will upgrade the entry from
 * 'needs_file_import' → 'available' and populate visionInput.imageSource.
 */
function loadMexcManualEvidence() {
  const jsonPath = path.join(ROOT, 'reports', 'manual-evidence', 'mexc-owner-bonus-screenshot.json');
  if (!fs.existsSync(jsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    console.warn(`  ⚠ Could not parse mexc-owner-bonus-screenshot.json: ${e.message}`);
    return null;
  }
}

// ─── Utility ────────────────────────────────────────────────────────────────────

/**
 * Extract a referral/promo code from an affiliate URL.
 * Handles common URL parameter patterns across exchanges.
 */
function extractReferralCode(affiliateUrl) {
  if (!affiliateUrl || affiliateUrl === '#') return null;
  try {
    const url = new URL(affiliateUrl);
    // Common referral code URL parameters (checked in priority order)
    const codeParams = ['shareCode', 'ref', 'referral', 'invite', 'referralCode', 'code', 'aff', 'partner'];
    for (const param of codeParams) {
      const val = url.searchParams.get(param);
      if (val) return val;
    }
    // Path-based codes: /b/CODENAME, /join/CODENAME, /ref/CODENAME
    const pathMatch = url.pathname.match(/\/(?:b|join|ref|invite|partner)\/([A-Z0-9_-]+)/i);
    if (pathMatch) return pathMatch[1];
  } catch { /* invalid URL — not fatal */ }
  return null;
}

/**
 * Scan all known screenshot locations for a given exchange slug.
 * Returns array of found screenshot entries.
 */
function findExistingScreenshots(slug) {
  const found = [];

  // 1. Automated run screenshots: reports/bonus-landing-snapshots/YYYY-MM-DD/{slug}-screenshot.webp
  const snapshotBase = path.join(ROOT, 'reports', 'bonus-landing-snapshots');
  if (fs.existsSync(snapshotBase)) {
    const dateDirs = fs.readdirSync(snapshotBase)
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort()
      .reverse();
    for (const dateDir of dateDirs) {
      const screenshotAbs = path.join(snapshotBase, dateDir, `${slug}-screenshot.webp`);
      if (fs.existsSync(screenshotAbs)) {
        found.push({
          screenshotPath:    `reports/bonus-landing-snapshots/${dateDir}/${slug}-screenshot.webp`,
          screenshotAbsPath: screenshotAbs,
          screenshotType:    'automated_playwright_capture',
          capturedDate:      dateDir,
        });
        break; // Take only the most recent automated capture
      }
    }
  }

  // 2. Public harvest screenshots: public/screenshots/{slug}/bonus_referral_landing/
  const bonusLandingDir = path.join(ROOT, 'public', 'screenshots', slug, 'bonus_referral_landing');
  if (fs.existsSync(bonusLandingDir)) {
    const files = fs.readdirSync(bonusLandingDir)
      .filter(f => /\.(webp|png|jpg|jpeg)$/i.test(f))
      .sort()
      .reverse();
    for (const f of files) {
      found.push({
        screenshotPath:    `/screenshots/${slug}/bonus_referral_landing/${f}`,
        screenshotAbsPath: path.join(bonusLandingDir, f),
        screenshotType:    'harvest_screenshot',
        capturedDate:      null,
      });
      break; // Most recent only
    }
  }

  // 3. Public registration screenshots: public/screenshots/{slug}/registration/
  const regDir = path.join(ROOT, 'public', 'screenshots', slug, 'registration');
  if (fs.existsSync(regDir)) {
    const files = fs.readdirSync(regDir)
      .filter(f => /\.(webp|png|jpg|jpeg)$/i.test(f))
      .sort()
      .reverse();
    for (const f of files) {
      found.push({
        screenshotPath:    `/screenshots/${slug}/registration/${f}`,
        screenshotAbsPath: path.join(regDir, f),
        screenshotType:    'registration_screenshot',
        capturedDate:      null,
      });
      break; // Most recent only
    }
  }

  return found;
}

/**
 * Build the vision analysis prompt for a given exchange and expected bonus data.
 */
function buildVisionPrompt(slug, name, expectedBonus, expectedReferralCode) {
  const bonusStr = expectedBonus?.amount != null
    ? `${Number(expectedBonus.amount).toLocaleString()} ${expectedBonus.currency ?? 'USDT'}`
    : 'unknown';
  const codeStr  = expectedReferralCode ?? 'unknown';

  return `You are analyzing a screenshot of a cryptocurrency exchange registration or referral landing page for ${name} (exchange slug: ${slug}).

Your task is to extract ONLY what is VISIBLE in the screenshot. Do not infer, estimate, or guess values not shown.

Context:
- Exchange: ${name} (${slug})
- Expected referral / invite code: ${codeStr}
- Expected bonus amount: ${bonusStr}

Instructions:
1. Identify the page type: registration/invite page, bonus promotion page, homepage, blocked/CAPTCHA page, or unknown.
2. Find and extract the primary bonus claim (amount + currency) if visible. Look for text like "up to X USDT", "claim X USDT", "Sign Up to Claim X USDT", "bonus of X", "X USDT bonus".
3. Find and extract any visible referral / promo / invite code shown on the page (e.g. in a pre-filled input field, confirmation banner, or right-hand panel).
4. Quote the exact visible bonus claim text verbatim — copy the exact words as shown.
5. Note any popups, overlays, or banners that partially obstruct the main page content.
6. Assign a confidence score (0.0–1.0) reflecting how clearly you can read the bonus information. Use 0.9+ only if the text is unambiguous and clearly readable.
7. Set matchStatus:
   - "match"        if detected amount matches expected within 10%
   - "mismatch"     if detected amount clearly differs from expected
   - "not_detected" if no bonus amount is visible in the screenshot
   - "blocked"      if the page is a CAPTCHA, geo-block, or login gate
   - "unknown"      if page type is unclear

Respond with ONLY this JSON object — no markdown fences, no explanation, no extra text:
{
  "exchange": "${slug}",
  "pageType": "<registration_referral_landing|bonus_promo|homepage|blocked|unknown>",
  "detectedBonus": "<e.g. 10,000 USDT> or null",
  "detectedAmount": <number> or null,
  "detectedCurrency": "<USDT|USD|BTC|ETH|USDC> or null",
  "detectedReferralCode": "<referral code as visible> or null",
  "visibleClaimText": "<exact verbatim bonus claim text> or null",
  "confidenceScore": <0.0 to 1.0>,
  "matchStatus": "<match|mismatch|not_detected|blocked|unknown>",
  "obstructions": ["<obstruction types>"],
  "cleanReshotRecommended": <true|false>,
  "manualReviewRequired": <true|false>,
  "notes": "<brief factual notes about the detection>"
}

Valid obstruction types: notification_permission_popup, google_signin_popup, cookie_banner, captcha, login_gate, age_gate, overlay, other_popup, none`;
}

// ─── Build vision queue ─────────────────────────────────────────────────────────

/**
 * Build the full vision detection queue from exchanges, evidence, and existing screenshots.
 * Each entry represents one potential vision analysis job.
 */
function buildVisionQueue(exchanges, evidence, existingSnapshots) {
  const queue = [];

  for (const ex of exchanges) {
    const slug     = ex.slug;
    const ev       = evidence[slug];
    const facts    = ev?.facts ?? [];
    const priority = EXCHANGE_PRIORITY[slug] ?? 3;

    const amountFact = facts.find(f => f.field === 'bonus_amount');
    const currFact   = facts.find(f => f.field === 'bonus_currency');

    const expectedBonus = {
      amount:               amountFact?.currentValue ?? null,
      currency:             currFact?.currentValue ?? 'USDT',
      confidenceScore:      amountFact?.confidenceScore ?? null,
      conflictStatus:       amountFact?.conflictStatus ?? 'unverified',
      manualReviewRequired: amountFact?.manualReviewRequired ?? false,
      lastChecked:          amountFact?.lastChecked ?? null,
    };

    const affiliateUrl    = ex.affiliateLinks?.default ?? ex.affiliateUrl ?? null;
    const referralCode    = extractReferralCode(affiliateUrl);
    const existingShots   = findExistingScreenshots(slug);
    const snapshot        = existingSnapshots[slug] ?? null;

    dbg(`${slug}: screenshots=${existingShots.length}, snapshot=${snapshot ? snapshot._snapshotDate : 'none'}`);

    // Determine analysis reasons
    const reasons = [];
    if (expectedBonus.conflictStatus === 'outdated')   reasons.push('bonus_amount is outdated');
    if (expectedBonus.manualReviewRequired)             reasons.push('manual review required in evidence');
    if ((expectedBonus.confidenceScore ?? 0) < 0.50)   reasons.push('confidence below publish threshold (< 0.50)');
    if (snapshot?.matchStatus === 'not_detected')       reasons.push('text verifier returned not_detected');
    if (snapshot?.matchStatus === 'error')              reasons.push('text verifier returned error (network/protocol)');
    if (existingShots.length === 0)                     reasons.push('no screenshot available — vision capture needed first');

    // Urgency: escalate if verifier failed
    const verifierFailed = snapshot && ['not_detected', 'error', 'blocked'].includes(snapshot.matchStatus);
    const urgency = (priority === 1 && (verifierFailed || expectedBonus.conflictStatus === 'outdated' || expectedBonus.manualReviewRequired))
      ? 'HIGH'
      : (priority <= 2 && (verifierFailed || expectedBonus.conflictStatus === 'outdated'))
        ? 'MEDIUM'
        : 'LOW';

    if (existingShots.length > 0) {
      // Build one entry per screenshot (most recent first)
      for (const ss of existingShots) {
        queue.push({
          exchange:            slug,
          name:                ex.name,
          priority,
          urgency,
          screenshotPath:      ss.screenshotPath,
          screenshotType:      ss.screenshotType,
          capturedDate:        ss.capturedDate ?? null,
          screenshotStatus:    'available',
          source:              ss.screenshotType,
          expectedBonus,
          expectedReferralCode: referralCode,
          affiliateUrl:        affiliateUrl ?? null,
          lastVerifierResult:  snapshot ? {
            matchStatus: snapshot.matchStatus,
            httpStatus:  snapshot.httpStatus,
            capturedAt:  snapshot.capturedAt,
          } : null,
          visionInput: {
            imageSource:    ss.screenshotPath,
            imageFormat:    'webp',
            model:          VISION_MODEL,
            maxTokens:      VISION_MAX_TOKENS,
            temperature:    VISION_TEMPERATURE,
            prompt:         buildVisionPrompt(slug, ex.name, expectedBonus, referralCode),
            outputSchema:   VISION_OUTPUT_SCHEMA,
          },
          reasons,
          notes: existingShots.length > 0
            ? `Screenshot available for vision analysis. ${reasons.join('; ')}`
            : `No screenshot. ${reasons.join('; ')}`,
        });
        break; // One entry per exchange (most recent screenshot only)
      }
    } else {
      // No screenshot available — needs_capture entry
      queue.push({
        exchange:            slug,
        name:                ex.name,
        priority,
        urgency,
        screenshotPath:      null,
        screenshotType:      null,
        capturedDate:        null,
        screenshotStatus:    'needs_capture',
        source:              null,
        expectedBonus,
        expectedReferralCode: referralCode,
        affiliateUrl:        affiliateUrl ?? null,
        lastVerifierResult:  snapshot ? {
          matchStatus: snapshot.matchStatus,
          httpStatus:  snapshot.httpStatus,
          capturedAt:  snapshot.capturedAt,
        } : null,
        visionInput:         null,
        reasons,
        notes: `No screenshot available. Run live capture first (npm run bonus:landing:live:${slug}), then re-run vision analysis.`,
      });
    }
  }

  // Sort: available screenshots first, then by urgency, then priority, then slug
  const urgencyRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  queue.sort((a, b) => {
    const aAvail = a.screenshotStatus === 'available' ? 0 : 1;
    const bAvail = b.screenshotStatus === 'available' ? 0 : 1;
    if (aAvail !== bAvail) return aAvail - bAvail;
    const ua = urgencyRank[a.urgency] ?? 2;
    const ub = urgencyRank[b.urgency] ?? 2;
    if (ua !== ub) return ua - ub;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.exchange.localeCompare(b.exchange);
  });

  return queue;
}

/**
 * Build the MEXC manual screenshot placeholder entry.
 *
 * Reads reports/manual-evidence/mexc-owner-bonus-screenshot.json (if present)
 * to get the canonical manual evidence record. Two states:
 *
 *   screenshotFile is null (or file doesn't exist on disk):
 *     → screenshotStatus: 'needs_file_import'
 *     → visionInput.imageSource: null (API call blocked)
 *     → manualEvidenceMetadata attached to entry
 *
 *   screenshotFile is set AND file exists on disk:
 *     → screenshotStatus: 'available'
 *     → visionInput.imageSource: screenshotFile path
 *     → ready for vision API call
 *
 * @param {object} evidence    - loaded evidence map (keyed by slug)
 * @param {object|null} manualEvidence - loaded mexc-owner-bonus-screenshot.json, or null
 */
function buildMexcManualPlaceholder(evidence, manualEvidence) {
  const ev       = evidence['mexc'];
  const facts    = ev?.facts ?? [];
  const amtFact  = facts.find(f => f.field === 'bonus_amount');
  const currFact = facts.find(f => f.field === 'bonus_currency');

  const expectedBonus = {
    amount:               amtFact?.currentValue ?? 10000,
    currency:             currFact?.currentValue ?? 'USDT',
    confidenceScore:      amtFact?.confidenceScore ?? 0.75,
    conflictStatus:       amtFact?.conflictStatus ?? 'ok',
    manualReviewRequired: amtFact?.manualReviewRequired ?? false,
    lastChecked:          amtFact?.lastChecked ?? '2026-06-03',
  };

  // ── Resolve screenshot file from manual evidence JSON ──────────────────────
  // manualEvidence.screenshotFile is either null or a relative path string.
  // We resolve it relative to ROOT and check disk presence.
  const rawScreenshotFile  = manualEvidence?.screenshotFile ?? null;
  const screenshotAbsPath  = rawScreenshotFile
    ? path.resolve(ROOT, rawScreenshotFile)
    : null;
  const screenshotOnDisk   = screenshotAbsPath ? fs.existsSync(screenshotAbsPath) : false;

  // Determine final status
  const screenshotStatus = screenshotOnDisk ? 'available' : 'needs_file_import';
  const imageSource      = screenshotOnDisk ? rawScreenshotFile : null;

  // ── Build reasons list ────────────────────────────────────────────────────
  const reasons = [
    'Automated text verifier returned not_detected (HTTP 204, generic page title)',
    'Owner browser screenshot confirms "Sign Up to Claim 10,000 USDT" is visible',
  ];
  if (!screenshotOnDisk) {
    reasons.push('Screenshot file not on disk — vision API call blocked until file is imported');
    if (rawScreenshotFile) {
      reasons.push(`screenshotFile path set to "${rawScreenshotFile}" but file not found`);
    } else {
      reasons.push('screenshotFile is null in manual evidence JSON — set path after file import');
    }
  } else {
    reasons.push(`Screenshot file available at: ${rawScreenshotFile}`);
  }
  if (manualEvidence) {
    reasons.push('Manual evidence JSON loaded: reports/manual-evidence/mexc-owner-bonus-screenshot.json');
  } else {
    reasons.push('Manual evidence JSON not found — using hardcoded fallback values');
  }

  // ── Owner observation — prefer manual evidence JSON, fall back to hardcoded ──
  const ownerObservation = {
    visibleText:   manualEvidence?.claimVisible      ?? 'Sign Up to Claim 10,000 USDT',
    referralCode:  manualEvidence?.referralCodeVisible ?? 'mexc-CryptoBonus',
    pageType:      manualEvidence?.pageType           ?? 'registration_referral_landing',
    obstructions:  manualEvidence?.obstructions       ?? ['notification_permission_popup', 'google_signin_popup'],
    verifiedDate:  manualEvidence?.capturedDate       ?? '2026-06-03',
    verifiedBy:    manualEvidence?.capturedBy         ?? 'site_owner',
  };

  // ── Vision input ──────────────────────────────────────────────────────────
  const visionInput = {
    imageSource,                          // null → blocked; path → ready
    imageFormat:   'webp',
    model:         VISION_MODEL,
    maxTokens:     VISION_MAX_TOKENS,
    temperature:   VISION_TEMPERATURE,
    prompt:        buildVisionPrompt(
      'mexc', 'MEXC',
      { amount: 10000, currency: 'USDT' },
      'mexc-CryptoBonus'
    ),
    outputSchema:  VISION_OUTPUT_SCHEMA,
    apiCallBlocked: !screenshotOnDisk,
    apiCallBlockReason: !screenshotOnDisk
      ? (rawScreenshotFile
          ? `screenshotFile path set but file not found on disk: ${rawScreenshotFile}`
          : 'screenshotFile is null — import screenshot and update mexc-owner-bonus-screenshot.json')
      : null,
  };

  const notes = screenshotOnDisk
    ? `Screenshot available at ${rawScreenshotFile}. Ready for vision analysis. Obstructions present: ${ownerObservation.obstructions.join(', ')}.`
    : `Owner-provided screenshot (not in repo) shows: "${ownerObservation.visibleText}" with referral code ${ownerObservation.referralCode}. Two browser-level popups present. Import screenshot file and set screenshotFile in mexc-owner-bonus-screenshot.json to enable vision analysis.`;

  return {
    exchange:             'mexc',
    name:                 'MEXC',
    priority:             1,
    urgency:              'HIGH',
    screenshotPath:       rawScreenshotFile,
    screenshotType:       manualEvidence?.evidenceType ?? 'owner_provided_browser_screenshot',
    capturedDate:         manualEvidence?.capturedDate ?? '2026-06-03',
    screenshotStatus,
    source:               manualEvidence?.source ?? 'owner_provided_browser_screenshot',
    manualEvidenceFile:   'reports/manual-evidence/mexc-owner-bonus-screenshot.json',
    manualEvidenceLoaded: !!manualEvidence,
    ownerObservation,
    expectedBonus,
    expectedReferralCode: 'mexc-CryptoBonus',
    affiliateUrl:         'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus',
    lastVerifierResult: {
      matchStatus: 'not_detected',
      httpStatus:  204,
      capturedAt:  '2026-06-03T15:45:51.009Z',
    },
    visionInput,
    reasons,
    notes,
    nextAction: screenshotOnDisk
      ? 'Run vision analysis: npm run bonus:vision:plan --vision-live (once Phase 14-C is implemented)'
      : 'Import owner screenshot to: reports/manual-evidence/mexc-screenshot-2026-06-03.webp — then set screenshotFile in mexc-owner-bonus-screenshot.json — then re-run: npm run bonus:vision:plan',
    evidenceRecord: 'reports/manual-evidence/mexc-bonus-owner-verification.md',
    limitations:    manualEvidence?.limitations ?? [
      'deposit requirement not confirmed by screenshot',
      'expiry not confirmed by screenshot',
      'eligibility may vary by region',
      'screenshot should be recaptured cleanly later',
    ],
  };
}

// ─── Generate example output ────────────────────────────────────────────────────

/**
 * Build the example vision output JSON that demonstrates what the model
 * would return for the MEXC case (based on the owner observation).
 */
function buildMexcExampleOutput() {
  return {
    exchange:               'mexc',
    pageType:               'registration_referral_landing',
    detectedBonus:          '10,000 USDT',
    detectedAmount:         10000,
    detectedCurrency:       'USDT',
    detectedReferralCode:   'mexc-CryptoBonus',
    visibleClaimText:       'Sign Up to Claim 10,000 USDT',
    confidenceScore:        0.92,
    matchStatus:            'match',
    obstructions:           ['notification_permission_popup', 'google_signin_popup'],
    cleanReshotRecommended: true,
    manualReviewRequired:   false,
    notes:                  'Bonus claim clearly visible in the right-hand registration panel. Two browser-level popups present but do not obscure the bonus text. Recommend clean recapture with popup prevention enabled.',
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────────

log('');
log('══════════════════════════════════════════════════════════════');
log('  Bonus Screenshot Vision Detection — DRY RUN PLAN');
log('══════════════════════════════════════════════════════════════');
log(`  Generated:        ${TODAY_STR}`);
log(`  Mode:             DRY RUN (no API calls)`);
log(`  Vision model:     ${VISION_MODEL}`);
log(`  Implementation:   architecture_only — live API integration pending`);
log('');

// Load all data
const exchanges         = loadExchanges();
const evidence          = loadAllEvidence();
const existingSnapshots = loadExistingSnapshots();
const mexcManualEvidence = loadMexcManualEvidence();

dbg(`Loaded ${exchanges.length} exchanges`);
dbg(`Loaded ${Object.keys(evidence).length} evidence files`);
dbg(`Loaded ${Object.keys(existingSnapshots).length} existing snapshots`);
dbg(`MEXC manual evidence JSON: ${mexcManualEvidence ? 'loaded' : 'not found (using fallback)'}`);
if (mexcManualEvidence) {
  dbg(`  screenshotFile: ${mexcManualEvidence.screenshotFile ?? 'null'}`);
  dbg(`  screenshotStatus: ${mexcManualEvidence.screenshotStatus}`);
}

// Build detection queue
const queue = buildVisionQueue(exchanges, evidence, existingSnapshots);

// Build MEXC manual placeholder (replaces the auto-generated MEXC entry)
// Passes the loaded manual evidence JSON so screenshotFile is resolved dynamically.
const mexcPlaceholder = buildMexcManualPlaceholder(evidence, mexcManualEvidence);

// Replace the auto-generated MEXC entry with the enhanced placeholder
const mexcIdx = queue.findIndex(e => e.exchange === 'mexc');
if (mexcIdx !== -1) {
  queue.splice(mexcIdx, 1, mexcPlaceholder);
} else {
  queue.unshift(mexcPlaceholder);
}

// Re-sort after MEXC replacement (MEXC stays at HIGH urgency)
const urgencyRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
queue.sort((a, b) => {
  const aAvail = a.screenshotStatus === 'available' ? 0 : 1;
  const bAvail = b.screenshotStatus === 'available' ? 0 : 1;
  if (aAvail !== bAvail) return aAvail - bAvail;
  const ua = urgencyRank[a.urgency] ?? 2;
  const ub = urgencyRank[b.urgency] ?? 2;
  if (ua !== ub) return ua - ub;
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.exchange.localeCompare(b.exchange);
});

// Summary stats
const totalEntries       = queue.length;
const screenshotsAvail   = queue.filter(e => e.screenshotStatus === 'available').length;
const needsCapture       = queue.filter(e => e.screenshotStatus === 'needs_capture').length;
const needsFileImport    = queue.filter(e => e.screenshotStatus === 'needs_file_import').length;
const highUrgency        = queue.filter(e => e.urgency === 'HIGH').length;
const medUrgency         = queue.filter(e => e.urgency === 'MEDIUM').length;
const readyForVision     = queue.filter(e => e.screenshotStatus === 'available' && e.visionInput !== null).length;

const mexcEntry       = queue.find(e => e.exchange === 'mexc');
const mexcEvidLoaded  = mexcEntry?.manualEvidenceLoaded ?? false;
const mexcApiBlocked  = mexcEntry?.visionInput?.apiCallBlocked !== false;

log(`  Exchanges in queue:    ${totalEntries}`);
log(`  Screenshots available: ${screenshotsAvail} / ${totalEntries}`);
log(`  Needs capture:         ${needsCapture}`);
log(`  Needs file import:     ${needsFileImport}${needsFileImport > 0 ? ' (MEXC owner screenshot)' : ''}`);
log(`  Ready for vision:      ${readyForVision}`);
log(`  HIGH urgency:          ${highUrgency}`);
log(`  MEDIUM urgency:        ${medUrgency}`);
log(`  MEXC manual evidence:  ${mexcEvidLoaded ? '✅ loaded from JSON' : '⚠️  JSON not found (fallback)'}`);
log(`  MEXC vision API:       ${mexcApiBlocked ? '❌ blocked (no image file)' : '✅ ready'}`);
log('');
log('  Top 5 queue entries:');
for (const entry of queue.slice(0, 5)) {
  const shotStatus = entry.screenshotStatus.padEnd(20);
  const bonus = entry.expectedBonus.amount
    ? `${entry.expectedBonus.amount} ${entry.expectedBonus.currency ?? ''}`
    : '(unknown)';
  log(`    [P${entry.priority} ${entry.urgency.padEnd(6)}] ${entry.exchange.padEnd(10)} ${shotStatus} expected: ${bonus}`);
}
log('');

if (screenshotsAvail === 0) {
  log('  ℹ️  No existing screenshots found in expected locations:');
  log('     reports/bonus-landing-snapshots/YYYY-MM-DD/{slug}-screenshot.webp');
  log('     public/screenshots/{slug}/bonus_referral_landing/');
  log('     public/screenshots/{slug}/registration/');
  log('');
  log('  Next steps to enable vision analysis:');
  log('    1. Run live capture: npm run bonus:landing:live:<slug>');
  log('    2. Or run screenshot harvest: npm run screenshots:harvest:<slug>');
  log('    3. For MEXC: import owner screenshot to repo');
  log('    4. Re-run: npm run bonus:vision:plan');
  log('');
}

log('  ℹ️  DRY RUN — no AI API calls made.');
log('     Live vision analysis: --vision-live flag (not yet implemented).');
log('     See docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md §14');
log('');

// ─── Build report objects ───────────────────────────────────────────────────────

const exampleOutput = buildMexcExampleOutput();

const reportJson = {
  generatedAt:          new Date().toISOString(),
  mode:                 'dry_run',
  visionModel:          VISION_MODEL,
  visionMaxTokens:      VISION_MAX_TOKENS,
  visionTemperature:    VISION_TEMPERATURE,
  implementationStatus: 'architecture_only',
  liveVisionAvailable:  false,
  liveVisionNote:       'Live vision analysis not yet implemented. Requires ANTHROPIC_API_KEY and Phase 14-C implementation. See docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md §14.11.',
  architectureDoc:      'docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md',
  safetyRules: [
    'No HTTP requests in dry-run mode',
    'No external AI API calls in dry-run mode',
    'No production evidence modified',
    'No affiliate URLs accessed',
    'No accounts created or accessed',
    'All vision results require manual review before evidence update',
    'No auto-publishing of detected bonus changes',
  ],
  summary: {
    totalExchanges:      totalEntries,
    screenshotsAvailable: screenshotsAvail,
    needsCapture,
    needsFileImport,
    readyForVision,
    highUrgency,
    medUrgency,
    lowUrgency:          totalEntries - highUrgency - medUrgency,
  },
  mexcManualPlaceholder: mexcPlaceholder,
  mexcExampleOutput:     exampleOutput,
  outputSchema:          VISION_OUTPUT_SCHEMA,
  queue,
};

// ─── Write reports ──────────────────────────────────────────────────────────────

const reportsDir = path.join(ROOT, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

// Always write both files (the plan is small and useful without flags)
const jsonPath = path.join(reportsDir, 'bonus-vision-detection-plan.json');
fs.writeFileSync(jsonPath, JSON.stringify(reportJson, null, 2), 'utf8');
log(`  📄 JSON plan written: ${jsonPath}`);

// ─── Markdown report ─────────────────────────────────────────────────────────────

const mdLines = [];
mdLines.push('# Bonus Screenshot Vision Detection Plan');
mdLines.push(`> CryptoBonusWorld — Generated ${TODAY_STR}  `);
mdLines.push('> Mode: DRY RUN (no AI API calls)  ');
mdLines.push(`> Vision model: \`${VISION_MODEL}\`  `);
mdLines.push('> Status: Architecture only — live API integration pending');
mdLines.push('');
mdLines.push('---');
mdLines.push('');
mdLines.push('## Summary');
mdLines.push('');
mdLines.push('| Metric | Value |');
mdLines.push('|--------|-------|');
mdLines.push(`| Exchanges in queue | ${totalEntries} |`);
mdLines.push(`| Screenshots available | ${screenshotsAvail} / ${totalEntries} |`);
mdLines.push(`| Ready for vision analysis | ${readyForVision} |`);
mdLines.push(`| Needs capture first | ${needsCapture} |`);
mdLines.push(`| Needs file import (MEXC) | ${needsFileImport} |`);
mdLines.push(`| HIGH urgency | ${highUrgency} |`);
mdLines.push(`| MEDIUM urgency | ${medUrgency} |`);
mdLines.push(`| Vision model | \`${VISION_MODEL}\` |`);
mdLines.push(`| Live vision available | ❌ Not yet implemented |`);
mdLines.push('');
mdLines.push('## Why Vision Detection?');
mdLines.push('');
mdLines.push('Text extraction fails for exchanges that:');
mdLines.push('- Render bonus claims in JS-hydrated SPA panels (HTTP 204 initial response)');
mdLines.push('- Show bonus in styled/positioned elements not accessible via DOM text');
mdLines.push('- Have browser-level popups (notification permission, Google sign-in) overlaying the content');
mdLines.push('- Use canvas/SVG to render bonus amounts');
mdLines.push('');
mdLines.push('**MEXC example (2026-06-03):** Text verifier returned `not_detected` (HTTP 204). Owner browser screenshot showed "Sign Up to Claim 10,000 USDT" clearly visible — text verifier was blind to it.');
mdLines.push('');
mdLines.push('---');
mdLines.push('');
mdLines.push('## Safety Rules');
mdLines.push('');
mdLines.push('- ✅ No HTTP requests (dry-run mode)');
mdLines.push('- ✅ No external AI API calls (dry-run mode)');
mdLines.push('- ✅ No production evidence modified');
mdLines.push('- ✅ No affiliate URLs accessed');
mdLines.push('- ✅ No accounts created or accessed');
mdLines.push('- ✅ All vision results require manual review before evidence update');
mdLines.push('- ✅ No auto-publishing of detected bonus changes');
mdLines.push('');
mdLines.push('---');
mdLines.push('');
mdLines.push('## MEXC Manual Screenshot Placeholder');
mdLines.push('');
mdLines.push('> **Source:** Owner browser screenshot (not committed to repo)  ');
mdLines.push('> **Status:** `needs_file_import`  ');
mdLines.push('> **Evidence record:** `reports/manual-evidence/mexc-bonus-owner-verification.md`');
mdLines.push('');
mdLines.push('| Field | Value |');
mdLines.push('|-------|-------|');
mdLines.push('| Exchange | MEXC |');
mdLines.push('| Visible text (owner) | "Sign Up to Claim 10,000 USDT" |');
mdLines.push('| Referral code (owner) | `mexc-CryptoBonus` |');
mdLines.push('| Obstructions | `notification_permission_popup`, `google_signin_popup` |');
mdLines.push('| Text verifier result | `not_detected` (HTTP 204) |');
mdLines.push('| Vision status | ❌ Blocked — screenshot file not in repo |');
mdLines.push('| Next action | Import screenshot file, then re-run `npm run bonus:vision:plan` |');
mdLines.push('');
mdLines.push('**Example vision output** (what the model would return once screenshot is available):');
mdLines.push('```json');
mdLines.push(JSON.stringify(exampleOutput, null, 2));
mdLines.push('```');
mdLines.push('');
mdLines.push('---');
mdLines.push('');
mdLines.push('## Vision Detection Queue');
mdLines.push('');
mdLines.push('| # | Exchange | Priority | Urgency | Screenshot Status | Expected Bonus | Referral Code | Vision Ready |');
mdLines.push('|---|----------|---------|---------|-------------------|---------------|---------------|-------------|');
queue.forEach((e, i) => {
  const bonus = e.expectedBonus?.amount != null
    ? `${e.expectedBonus.amount} ${e.expectedBonus.currency ?? ''}`
    : '—';
  const code  = e.expectedReferralCode ?? '—';
  const statusIcon = {
    available:        '✅',
    needs_capture:    '📷',
    needs_file_import: '📁',
  }[e.screenshotStatus] ?? '?';
  const visionIcon = e.visionInput?.imageSource !== null && e.screenshotStatus === 'available' ? '✅' : '❌';
  mdLines.push(`| ${i + 1} | **${e.exchange}** | P${e.priority} | ${e.urgency} | ${statusIcon} ${e.screenshotStatus} | ${bonus} | \`${code}\` | ${visionIcon} |`);
});
mdLines.push('');
mdLines.push('**Legend:**  ');
mdLines.push('✅ Available · 📷 Needs capture first · 📁 File not in repo · ❌ Vision blocked');
mdLines.push('');
mdLines.push('---');
mdLines.push('');
mdLines.push('## Per-Exchange Detail');
mdLines.push('');

for (const e of queue) {
  const bonusStr = e.expectedBonus?.amount != null
    ? `${e.expectedBonus.amount} ${e.expectedBonus.currency ?? ''}`
    : '—';
  const statusIcon = {
    available:        '✅',
    needs_capture:    '📷',
    needs_file_import: '📁',
  }[e.screenshotStatus] ?? '?';

  mdLines.push(`### ${statusIcon} ${e.name} (\`${e.exchange}\`)`);
  mdLines.push('');
  mdLines.push('| Field | Value |');
  mdLines.push('|-------|-------|');
  mdLines.push(`| Priority | P${e.priority} |`);
  mdLines.push(`| Urgency | **${e.urgency}** |`);
  mdLines.push(`| Screenshot Status | \`${e.screenshotStatus}\` |`);
  mdLines.push(`| Screenshot Path | ${e.screenshotPath ? `\`${e.screenshotPath}\`` : '—'} |`);
  mdLines.push(`| Screenshot Type | ${e.screenshotType ?? '—'} |`);
  mdLines.push(`| Expected Bonus | ${bonusStr} |`);
  mdLines.push(`| Expected Conf | ${e.expectedBonus?.confidenceScore ?? 'n/a'} |`);
  mdLines.push(`| Expected Referral Code | ${e.expectedReferralCode ? `\`${e.expectedReferralCode}\`` : '—'} |`);
  mdLines.push(`| Last Verifier Result | ${e.lastVerifierResult ? `\`${e.lastVerifierResult.matchStatus}\` (${e.lastVerifierResult.capturedAt?.split('T')[0] ?? '?'})` : '—'} |`);

  if (e.screenshotStatus === 'needs_file_import' && e.ownerObservation) {
    mdLines.push(`| Owner Observed Text | "${e.ownerObservation.visibleText}" |`);
    mdLines.push(`| Owner Observed Code | \`${e.ownerObservation.referralCode}\` |`);
    mdLines.push(`| Owner Obstructions | ${e.ownerObservation.obstructions.map(o => `\`${o}\``).join(', ')} |`);
  }

  mdLines.push('');

  if (e.reasons?.length > 0) {
    mdLines.push('**Reasons for vision analysis:**');
    for (const r of e.reasons) {
      mdLines.push(`- ${r}`);
    }
    mdLines.push('');
  }

  if (e.visionInput?.prompt) {
    mdLines.push('<details>');
    mdLines.push(`<summary>Vision prompt (click to expand)</summary>`);
    mdLines.push('');
    mdLines.push('```');
    mdLines.push(e.visionInput.prompt);
    mdLines.push('```');
    mdLines.push('');
    mdLines.push('</details>');
    mdLines.push('');
  }

  if (e.notes) {
    mdLines.push(`> ${e.notes}`);
    mdLines.push('');
  }

  mdLines.push('---');
  mdLines.push('');
}

mdLines.push('## Implementation Roadmap');
mdLines.push('');
mdLines.push('| Phase | Description | Status |');
mdLines.push('|-------|-------------|--------|');
mdLines.push('| 14-A | Architecture doc + dry-run skeleton | ✅ T09A.3 |');
mdLines.push('| 14-B | Improved Playwright capture (networkidle, dismiss popups) | Pending |');
mdLines.push('| 14-C | Anthropic Messages API integration + base64 image upload | Pending — requires `ANTHROPIC_API_KEY` |');
mdLines.push('| 14-D | Vision result → review queue integration | Pending |');
mdLines.push('| 14-E | CI GitHub Actions workflow (weekly vision sweep) | Pending |');
mdLines.push('| 14-F | Multi-region vision (geo-aware detection) | Future |');
mdLines.push('');
mdLines.push('---');
mdLines.push('');
mdLines.push('*Script: `scripts/bonus-screenshot-vision-detect.mjs`  ');
mdLines.push(`*See: [BONUS_LANDING_VERIFICATION_ARCHITECTURE.md §14](../docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md)*`);

const mdPath = path.join(reportsDir, 'bonus-vision-detection-plan.md');
fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf8');
log(`  📄 Markdown plan written: ${mdPath}`);

log('');
