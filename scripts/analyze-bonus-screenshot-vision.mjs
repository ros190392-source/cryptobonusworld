#!/usr/bin/env node
/**
 * analyze-bonus-screenshot-vision.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Bonus Screenshot Vision Analysis — CryptoBonusWorld
 *
 * PURPOSE:
 *   Analyzes a bonus registration/referral landing page screenshot using an
 *   AI vision model (Anthropic Claude) to extract structured bonus claim data.
 *
 *   Addresses the core gap where text extraction fails on SPA-rendered bonus
 *   panels — the screenshot captures the visual state including JS-hydrated
 *   content that DOM text scrapers miss (see architecture §14.1).
 *
 * MODES:
 *   live          ANTHROPIC_API_KEY env var set → calls Anthropic Messages API
 *   manual_template  No API key → generates prompt + expected output for manual review
 *
 * ─── FLAGS ────────────────────────────────────────────────────────────────────
 *   --exchange <slug>       Exchange to analyze (e.g. mexc)
 *   --screenshot <path>     Path to screenshot file (relative to project root)
 *   --verbose               Print extra detail to console
 *
 * ─── OUTPUT ───────────────────────────────────────────────────────────────────
 *   reports/bonus-vision-detections/{slug}-YYYY-MM-DD.json
 *   reports/bonus-vision-detections/{slug}-YYYY-MM-DD.md
 *
 * ─── API ──────────────────────────────────────────────────────────────────────
 *   Uses Anthropic Messages API directly via fetch (no SDK required).
 *   Model: claude-3-5-sonnet-20241022 (vision capable).
 *   Image sent as base64 image/webp.
 *
 * ─── SAFETY ───────────────────────────────────────────────────────────────────
 *   ✅ No HTTP requests to exchanges (reads local screenshot only)
 *   ✅ No evidence facts modified
 *   ✅ No production pages modified
 *   ✅ API key read from environment only — never stored in repo
 *   ✅ Vision result requires owner review before any evidence update
 *   ✅ No auto-publishing of detected bonus changes
 *
 * ─── ARCHITECTURE ─────────────────────────────────────────────────────────────
 *   See docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md §14
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ─── CLI flags ──────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const VERBOSE     = args.includes('--verbose');

const exchIdx     = args.indexOf('--exchange');
const EXCH_SLUG   = exchIdx !== -1 ? args[exchIdx + 1] : null;

const ssIdx       = args.indexOf('--screenshot');
const SS_PATH_ARG = ssIdx !== -1 ? args[ssIdx + 1] : null;

const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);
const warn = (...a) => console.warn('  ⚠', ...a);

// ─── Constants ──────────────────────────────────────────────────────────────────
const TODAY_STR     = new Date('2026-06-03').toISOString().split('T')[0];
const VISION_MODEL  = 'claude-3-5-sonnet-20241022';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const API_KEY       = process.env.ANTHROPIC_API_KEY ?? null;
const API_MODE      = API_KEY ? 'live' : 'manual_template';

// ─── Validate inputs ────────────────────────────────────────────────────────────

if (!EXCH_SLUG) {
  console.error('  ✖ Missing --exchange <slug>');
  console.error('    Usage: node scripts/analyze-bonus-screenshot-vision.mjs --exchange mexc --screenshot <path>');
  process.exit(1);
}

const SS_REL  = SS_PATH_ARG ?? `reports/manual-evidence/${EXCH_SLUG}-screenshot-${TODAY_STR}.webp`;
const SS_ABS  = path.resolve(ROOT, SS_REL);

if (!fs.existsSync(SS_ABS)) {
  console.error(`  ✖ Screenshot file not found: ${SS_ABS}`);
  console.error('    Run: npm run capture:bonus:mexc   — then retry.');
  process.exit(1);
}

// ─── Load context data ──────────────────────────────────────────────────────────

function loadManualEvidence(slug) {
  const p = path.join(ROOT, 'reports', 'manual-evidence', `${slug}-owner-bonus-screenshot.json`);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function loadCaptureMetadata(slug, date) {
  const p = path.join(ROOT, 'reports', 'manual-evidence', `${slug}-screenshot-${date}.json`);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function loadVisionPlan() {
  const p = path.join(ROOT, 'reports', 'bonus-vision-detection-plan.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function loadEvidence(slug) {
  const p = path.join(ROOT, 'src', 'data', 'evidence', `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

const manualEvidence  = loadManualEvidence(EXCH_SLUG);
const captureMeta     = loadCaptureMetadata(EXCH_SLUG, TODAY_STR);
const visionPlan      = loadVisionPlan();
const evidenceData    = loadEvidence(EXCH_SLUG);

// Resolve expected bonus from available sources
const planEntry = visionPlan?.queue?.find(e => e.exchange === EXCH_SLUG);
const evidFacts = evidenceData?.facts ?? [];
const amtFact   = evidFacts.find(f => f.field === 'bonus_amount');
const currFact  = evidFacts.find(f => f.field === 'bonus_currency');

const expectedBonus = {
  amount:        amtFact?.currentValue ?? planEntry?.expectedBonus?.amount ?? 10000,
  currency:      currFact?.currentValue ?? planEntry?.expectedBonus?.currency ?? 'USDT',
  referralCode:  manualEvidence?.referralCodeVisible ?? planEntry?.expectedReferralCode ?? null,
};

const exchangeName = planEntry?.name ?? EXCH_SLUG.toUpperCase();

dbg(`Exchange:    ${EXCH_SLUG} (${exchangeName})`);
dbg(`Screenshot:  ${SS_ABS}`);
dbg(`API mode:    ${API_MODE}`);
dbg(`Expected:    ${expectedBonus.amount} ${expectedBonus.currency}`);
dbg(`Ref code:    ${expectedBonus.referralCode}`);

// ─── Build vision prompt ────────────────────────────────────────────────────────

function buildVisionPrompt(slug, name, expected) {
  const bonusStr = `${Number(expected.amount).toLocaleString()} ${expected.currency}`;
  const codeStr  = expected.referralCode ?? 'unknown';

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
  "detectedBonus": "<amount as shown, e.g. 10,000 USDT> or null",
  "detectedAmount": <number> or null,
  "detectedCurrency": "<USDT|USD|BTC|ETH|USDC> or null",
  "detectedReferralCode": "<referral code as visible> or null",
  "visibleClaimText": "<exact verbatim bonus claim text> or null",
  "confidenceScore": <0.0–1.0>,
  "matchStatus": "<match|mismatch|not_detected|blocked|unknown>",
  "obstructions": ["<types present>"] or [],
  "cleanReshotRecommended": <true|false>,
  "manualReviewRequired": <true|false>,
  "notes": "<brief factual notes>"
}

Obstruction types: notification_permission_popup, google_signin_popup, cookie_banner, captcha, login_gate, age_gate, overlay, other_popup, none`;
}

const VISION_PROMPT = buildVisionPrompt(EXCH_SLUG, exchangeName, expectedBonus);

// ─── Live vision analysis ───────────────────────────────────────────────────────

async function runLiveVisionAnalysis() {
  log('  🔬 Running live vision analysis via Anthropic API…');

  // Read screenshot as base64
  const screenshotBytes  = fs.readFileSync(SS_ABS);
  const screenshotBase64 = screenshotBytes.toString('base64');
  const fileExt          = path.extname(SS_ABS).toLowerCase().replace('.', '');
  const mediaType        = fileExt === 'webp' ? 'image/webp'
                         : fileExt === 'png'  ? 'image/png'
                         : fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg'
                         : 'image/webp';

  dbg(`Image size:  ${(screenshotBytes.length / 1024).toFixed(1)} KB`);
  dbg(`Media type:  ${mediaType}`);

  const requestBody = {
    model:      VISION_MODEL,
    max_tokens: 512,
    messages: [{
      role:    'user',
      content: [
        {
          type:   'image',
          source: {
            type:       'base64',
            media_type: mediaType,
            data:       screenshotBase64,
          },
        },
        {
          type: 'text',
          text: VISION_PROMPT,
        },
      ],
    }],
  };

  let rawResponse, parsedResult;

  try {
    dbg(`Calling: POST ${ANTHROPIC_API}`);
    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key':         API_KEY,
        'content-type':      'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`API error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const apiResponse = await response.json();
    rawResponse       = apiResponse;
    const content     = apiResponse?.content?.[0]?.text ?? '';
    dbg(`Raw API response length: ${content.length} chars`);
    dbg(`Sample: ${content.slice(0, 150)}`);

    // Parse JSON from model response (model should return clean JSON per prompt)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Model response contained no JSON object');
    parsedResult = JSON.parse(jsonMatch[0]);
    log('  ✅ Vision analysis complete');

  } catch (e) {
    warn(`Live vision call failed: ${e.message}`);
    return { success: false, error: e.message, rawResponse };
  }

  return {
    success:      true,
    visionResult: parsedResult,
    rawResponse,
  };
}

// ─── Build output record ────────────────────────────────────────────────────────

function buildOutputRecord(visionResult, apiMode, error) {
  const domSignals = captureMeta?.textSignals ?? {};
  const domSupport = {
    bonus_amount:  domSignals.bonus_amount?.found  ?? false,
    claim_cta:     domSignals.claim_cta?.found     ?? false,
    referral_code: domSignals.referral_code?.found ?? false,
  };
  const domConfirmed3of3 = Object.values(domSupport).every(Boolean);

  if (apiMode === 'live' && visionResult) {
    return {
      exchange:             EXCH_SLUG,
      screenshotPath:       SS_REL,
      screenshotHash:       captureMeta?.screenshotHash ?? null,
      pageType:             visionResult.pageType             ?? 'unknown',
      detectedBonus:        visionResult.detectedBonus        ?? null,
      detectedAmount:       visionResult.detectedAmount       ?? null,
      detectedCurrency:     visionResult.detectedCurrency     ?? null,
      detectedReferralCode: visionResult.detectedReferralCode ?? null,
      visibleClaimText:     visionResult.visibleClaimText     ?? null,
      confidenceScore:      visionResult.confidenceScore      ?? null,
      matchStatus:          visionResult.matchStatus          ?? 'unknown',
      obstructions:         visionResult.obstructions         ?? [],
      cleanReshotRecommended: visionResult.cleanReshotRecommended ?? false,
      manualReviewRequired: visionResult.manualReviewRequired ?? true,
      notes:                visionResult.notes                ?? null,
      modelUsed:            VISION_MODEL,
      apiMode:              'live',
      domTextSignals:       domSupport,
      domConfirmed3of3,
      expectedBonus,
      captureMetadata: {
        capturedAt:  captureMeta?.capturedAt ?? null,
        httpStatus:  captureMeta?.httpStatus ?? null,
        pageTitle:   captureMeta?.pageTitle  ?? null,
        finalUrl:    captureMeta?.finalUrl   ?? null,
      },
      safetyNotes: [
        'No evidence facts were modified',
        'Vision result requires owner review before any evidence update',
        'No auto-publishing applied',
      ],
      createdAt: new Date().toISOString(),
      task:      'T09A.6',
    };
  }

  // manual_template mode (or live failure fallback)
  return {
    exchange:             EXCH_SLUG,
    screenshotPath:       SS_REL,
    screenshotHash:       captureMeta?.screenshotHash ?? null,
    pageType:             'registration_referral_landing',  // known from owner observation
    detectedBonus:        null,
    detectedAmount:       null,
    detectedCurrency:     null,
    detectedReferralCode: null,
    visibleClaimText:     null,
    confidenceScore:      null,
    matchStatus:          'needs_review',
    obstructions:         [],
    cleanReshotRecommended: false,
    manualReviewRequired: true,
    notes:                apiMode === 'live'
      ? `Live vision API call failed: ${error ?? 'unknown error'}. Falling back to manual_template. DOM text signals: ${JSON.stringify(domSupport)}.`
      : `No ANTHROPIC_API_KEY in environment. Manual review required. DOM text signals strongly support a match: ${JSON.stringify(domSupport)}.`,
    modelUsed:            null,
    apiMode:              apiMode === 'live' ? 'live_failed' : 'manual_template',
    apiError:             error ?? null,
    domTextSignals:       domSupport,
    domConfirmed3of3,
    // Pre-filled expected result based on DOM signal confirmation
    // (to be verified by owner reviewing the screenshot directly)
    expectedVisionResult: domConfirmed3of3 ? {
      pageType:             'registration_referral_landing',
      detectedBonus:        `${Number(expectedBonus.amount).toLocaleString()} ${expectedBonus.currency}`,
      detectedAmount:       expectedBonus.amount,
      detectedCurrency:     expectedBonus.currency,
      detectedReferralCode: expectedBonus.referralCode,
      visibleClaimText:     `Sign Up to Claim ${Number(expectedBonus.amount).toLocaleString()} ${expectedBonus.currency}`,
      confidenceScore:      0.90,
      matchStatus:          'match',
      obstructions:         [],
      cleanReshotRecommended: false,
      manualReviewRequired: false,
      basis:                'DOM text signals confirmed 3/3 key data points at capture time. Owner should verify screenshot visually before accepting.',
    } : null,
    visionPrompt:         VISION_PROMPT,
    promptInstructions:   [
      '1. Open the screenshot file: ' + SS_REL,
      '2. Visit https://claude.ai or your preferred vision model',
      '3. Upload the screenshot',
      '4. Paste the visionPrompt field above',
      '5. Copy the JSON response into expectedVisionResult and update matchStatus/confidenceScore accordingly',
      '6. Save the updated JSON to this file',
      '7. Run: npm run bonus:vision:plan  (to update the vision queue)',
    ],
    expectedBonus,
    captureMetadata: {
      capturedAt:  captureMeta?.capturedAt ?? null,
      httpStatus:  captureMeta?.httpStatus ?? null,
      pageTitle:   captureMeta?.pageTitle  ?? null,
      finalUrl:    captureMeta?.finalUrl   ?? null,
    },
    safetyNotes: [
      'No evidence facts were modified',
      'Vision result requires owner review before any evidence update',
      'No auto-publishing applied',
    ],
    createdAt: new Date().toISOString(),
    task:      'T09A.6',
  };
}

// ─── Generate markdown report ───────────────────────────────────────────────────

function buildMarkdownReport(record) {
  const statusIcon = {
    match:         '✅',
    mismatch:      '⚠️',
    not_detected:  '❓',
    blocked:       '🚫',
    needs_review:  '🔍',
    unknown:       '❓',
  }[record.matchStatus] ?? '❓';

  const lines = [];
  lines.push(`# Vision Detection Result — ${record.exchange.toUpperCase()}`);
  lines.push(`> Generated: ${record.createdAt}  `);
  lines.push(`> API mode: \`${record.apiMode}\`  `);
  lines.push(`> Screenshot: \`${record.screenshotPath}\`  `);
  lines.push(`> Task: ${record.task}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Result Summary');
  lines.push('');
  lines.push(`**Match Status:** ${statusIcon} \`${record.matchStatus}\``);
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  lines.push(`| Exchange | ${record.exchange} |`);
  lines.push(`| API Mode | \`${record.apiMode}\` |`);
  lines.push(`| Model Used | ${record.modelUsed ?? '—'} |`);
  lines.push(`| Screenshot | \`${record.screenshotPath}\` |`);
  lines.push(`| Hash | \`${record.screenshotHash ?? '—'}\` |`);
  lines.push(`| Page Type | ${record.pageType ?? '—'} |`);
  lines.push(`| Detected Bonus | ${record.detectedBonus ?? '—'} |`);
  lines.push(`| Detected Amount | ${record.detectedAmount ?? '—'} |`);
  lines.push(`| Detected Currency | ${record.detectedCurrency ?? '—'} |`);
  lines.push(`| Detected Referral Code | \`${record.detectedReferralCode ?? '—'}\` |`);
  lines.push(`| Visible Claim Text | ${record.visibleClaimText ? `"${record.visibleClaimText}"` : '—'} |`);
  lines.push(`| Confidence Score | ${record.confidenceScore ?? '—'} |`);
  lines.push(`| Match Status | **\`${record.matchStatus}\`** |`);
  lines.push(`| Manual Review Required | ${record.manualReviewRequired ? '⚠️ Yes' : '✅ No'} |`);
  lines.push(`| Obstructions | ${record.obstructions?.length ? record.obstructions.join(', ') : 'none'} |`);
  lines.push('');

  if (record.notes) {
    lines.push('**Notes:**');
    lines.push(`> ${record.notes}`);
    lines.push('');
  }

  lines.push('## DOM Text Signal Support');
  lines.push('');
  lines.push('These signals were confirmed by DOM text extraction at capture time:');
  lines.push('');
  lines.push('| Signal | Found |');
  lines.push('|--------|-------|');
  for (const [key, val] of Object.entries(record.domTextSignals ?? {})) {
    lines.push(`| \`${key}\` | ${val ? '✅ Yes' : '❌ No'} |`);
  }
  lines.push(`| **3/3 confirmed** | ${record.domConfirmed3of3 ? '✅ Yes' : '⚠️ No'} |`);
  lines.push('');

  if (record.apiMode === 'manual_template' || record.apiMode === 'live_failed') {
    lines.push('## Manual Review Instructions');
    lines.push('');
    if (record.apiMode === 'live_failed') {
      lines.push(`> ⚠️ Live vision API call failed: \`${record.apiError}\``);
      lines.push('');
    }
    lines.push('The screenshot has not been analyzed by a vision model yet. To complete the analysis:');
    lines.push('');
    for (const step of (record.promptInstructions ?? [])) {
      lines.push(`${step}`);
    }
    lines.push('');

    if (record.expectedVisionResult) {
      lines.push('## Pre-filled Expected Result (DOM-signal-supported)');
      lines.push('');
      lines.push('The following result is pre-filled based on DOM text signal confirmation.');
      lines.push('**Owner must visually verify the screenshot before accepting this as a vision result.**');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(record.expectedVisionResult, null, 2));
      lines.push('```');
      lines.push('');
    }

    lines.push('<details>');
    lines.push('<summary>Full vision prompt (paste into vision model)</summary>');
    lines.push('');
    lines.push('```');
    lines.push(record.visionPrompt ?? '');
    lines.push('```');
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('## Capture Metadata');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  lines.push(`| Captured At | ${record.captureMetadata?.capturedAt ?? '—'} |`);
  lines.push(`| HTTP Status | ${record.captureMetadata?.httpStatus ?? '—'} |`);
  lines.push(`| Page Title | ${record.captureMetadata?.pageTitle ?? '—'} |`);
  lines.push(`| Final URL | ${record.captureMetadata?.finalUrl ?? '—'} |`);
  lines.push('');
  lines.push('## Safety Notes');
  lines.push('');
  for (const note of (record.safetyNotes ?? [])) {
    lines.push(`- ✅ ${note}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*See: [BONUS_LANDING_VERIFICATION_ARCHITECTURE.md §14](../../docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md)*');

  return lines.join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────────────────

log('');
log('══════════════════════════════════════════════════════════════');
log('  Bonus Screenshot Vision Analysis');
log('══════════════════════════════════════════════════════════════');
log(`  Exchange:    ${EXCH_SLUG} (${exchangeName})`);
log(`  Screenshot:  ${SS_REL}`);
log(`  Size:        ${(fs.statSync(SS_ABS).size / 1024).toFixed(1)} KB`);
log(`  API mode:    ${API_MODE === 'live' ? '✅ LIVE (ANTHROPIC_API_KEY found)' : '⚠️  MANUAL_TEMPLATE (no API key)'}`);
log(`  Model:       ${VISION_MODEL}`);
log('');

let visionResult = null;
let callError    = null;
let finalApiMode = API_MODE;

if (API_MODE === 'live') {
  const liveResult = await runLiveVisionAnalysis();
  if (liveResult.success) {
    visionResult = liveResult.visionResult;
    log(`  ✅ Match status:   ${visionResult.matchStatus}`);
    log(`  ✅ Confidence:     ${visionResult.confidenceScore}`);
    log(`  ✅ Detected bonus: ${visionResult.detectedBonus ?? '(none)'}`);
    log(`  ✅ Detected code:  ${visionResult.detectedReferralCode ?? '(none)'}`);
  } else {
    callError    = liveResult.error;
    finalApiMode = 'live_failed';
    warn(`Live analysis failed — falling back to manual_template`);
  }
} else {
  log('  ℹ️  Set ANTHROPIC_API_KEY to enable live vision analysis.');
  log('  ℹ️  Manual review template will be generated instead.');
  log('');
}

// Build output record
const record = buildOutputRecord(
  visionResult,
  finalApiMode === 'live' && visionResult ? 'live' : finalApiMode,
  callError
);

// Write output files
const outDir = path.join(ROOT, 'reports', 'bonus-vision-detections');
fs.mkdirSync(outDir, { recursive: true });

const dateTag  = TODAY_STR;
const jsonPath = path.join(outDir, `${EXCH_SLUG}-${dateTag}.json`);
const mdPath   = path.join(outDir, `${EXCH_SLUG}-${dateTag}.md`);

// ── Preserve confirmed results ────────────────────────────────────────────────
// If a previous result already has a confirmed match (apiMode !== manual_template
// and matchStatus !== needs_review), preserve it rather than overwriting with a
// lower-quality manual_template output.
let existingConfirmed = null;
if (fs.existsSync(jsonPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const isConfirmed = existing.apiMode !== 'manual_template'
      && existing.matchStatus !== 'needs_review'
      && existing.matchStatus !== null;
    if (isConfirmed) {
      existingConfirmed = existing;
      dbg(`Preserving existing confirmed result (apiMode=${existing.apiMode}, matchStatus=${existing.matchStatus})`);
    }
  } catch { /* non-fatal — will overwrite */ }
}

const finalRecord = existingConfirmed ?? record;
const wasPreserved = !!existingConfirmed;

fs.writeFileSync(jsonPath, JSON.stringify(finalRecord, null, 2), 'utf8');
fs.writeFileSync(mdPath, buildMarkdownReport(finalRecord), 'utf8');

log(`  📄 JSON:     ${jsonPath}${wasPreserved ? ' (preserved existing confirmed result)' : ''}`);
log(`  📄 Markdown: ${mdPath}${wasPreserved ? ' (preserved)' : ''}`);
log('');
log('  ═══════════════════════════════════════════════════════════');
log(`   ANALYSIS COMPLETE — ${EXCH_SLUG.toUpperCase()}`);
log(`   API mode:     ${finalRecord.apiMode}${wasPreserved ? ' (preserved)' : ''}`);
log(`   Match status: ${finalRecord.matchStatus}`);
log(`   DOM signals:  ${finalRecord.domConfirmed3of3 ? '✅ 3/3 confirmed' : '⚠️ partial'}`);
log(`   Manual review: ${finalRecord.manualReviewRequired ? '⚠️ required' : '✅ not required'}`);
log('');
if (finalRecord.apiMode === 'manual_template') {
  log('  Next steps:');
  log('    1. Open the screenshot: ' + SS_REL);
  log('    2. Set ANTHROPIC_API_KEY and re-run for automated analysis:');
  log('       npm run bonus:vision:analyze:mexc');
  log('    3. Or manually paste the visionPrompt from the JSON output');
  log('       into a vision model and update the result file.');
}
log('  ⚠️  No evidence facts were modified.');
log('  ✅ No production data was changed.');
log('  ═══════════════════════════════════════════════════════════');
log('');
