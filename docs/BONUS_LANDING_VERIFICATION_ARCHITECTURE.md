# Bonus Landing Verification Architecture
> CryptoBonusWorld — Sprint 01 / Task 04B
> Created: 2026-06-03 | Status: DRAFT — not yet implemented

---

## Purpose

This document defines the architecture for a recurring system that verifies the bonus claims
shown on live affiliate referral landing/registration pages reached through `/go/{exchange}` links.

The goal is to detect bonus value drift (exchanges changing their bonus offers) before it
propagates unchecked to the published site, giving the owner a manual review opportunity before
any data update is applied.

---

## 1. Verification Flow

```
[Trigger: cron / manual]
       │
       ▼
Read exchange list + expected bonus data
(src/data/exchanges.json + src/data/evidence/{exchange}.json)
       │
       ▼
For each exchange:
  Resolve /go/{exchange}/ redirect chain (follow redirects, no JS)
       │
       ▼
  Inspect final landing/registration URL
  (public page: registration, bonus promo, or affiliate landing)
       │
       ▼
  Capture:
    - Page title
    - Visible text (h1, h2, .bonus, .promo elements)
    - Full page screenshot (webp)
    - HTTP status
    - Redirect chain (all intermediate URLs)
    - Final URL
       │
       ▼
  Run bonus detection regexes on visible text
  → detectedBonusAmount, detectedBonusCurrency, detectedBonusRawText
       │
       ▼
  Compare detectedBonus vs expectedBonus (from evidence)
  → matchStatus: match | mismatch | not_detected | blocked | error | needs_review
       │
       ▼
  Write snapshot record:
    reports/bonus-landing-snapshots/YYYY-MM-DD/{exchange}-{geo}.json
    public/screenshots/{exchange}/bonus_referral_landing/global-desktop-YYYY-MM.webp
       │
       ▼
  Update rolling reports:
    reports/bonus-landing-snapshots/latest.json
    reports/bonus-landing-verification-report.md
    reports/bonus-landing-mismatches.json (if any mismatch/not_detected)
    reports/bonus-review-queue.json (all items requiring manual review)
       │
       ▼
  Send Telegram notification
  (summary always; critical alert for mismatch)
       │
       ▼
[STOP — NO auto-publishing. All mismatches → manual review queue.]
```

---

## 2. Data Model

Each snapshot record stored in `reports/bonus-landing-snapshots/YYYY-MM-DD/{exchange}-{geo}.json`:

```typescript
interface BonusLandingSnapshot {
  // Identity
  exchange:       string;             // Exchange slug (matches exchanges.json)
  region:         string;             // GEO code: "GLOBAL" | "PL" | "DE" | ...
  runId:          string;             // ISO timestamp of verification run

  // URL chain
  sourceGoUrl:    string;             // https://cryptobonusworld.com/go/{exchange}/
  affiliateUrl:   string;             // Resolved affiliate URL (from exchanges.json)
  finalUrl:       string;             // URL after all redirects
  redirectChain:  string[];           // All intermediate URLs
  httpStatus:     number;             // HTTP status of final URL

  // Expected (from evidence at run time)
  expectedBonus: {
    amount:       number | null;      // bonus_amount.currentValue
    currency:     string | null;      // bonus_currency.currentValue
    confidence:   number;             // bonus_amount.confidenceScore
    conflictStatus: string;           // ok | outdated | needs-check | unverified
    lastChecked:  string;             // YYYY-MM-DD
    manualReviewRequired: boolean;
  };

  // Detected from live page
  detectedBonus: {
    amount:       number | null;      // Parsed from visible text (null if not detected)
    currency:     string | null;      // USDT | USD | BTC etc.
    rawText:      string | null;      // Raw snippet containing detected bonus
    pattern:      string | null;      // Which regex pattern matched
  };

  // Comparison result
  matchStatus:
    | 'match'         // detectedBonus matches expected within tolerance
    | 'mismatch'      // detectedBonus differs from expected (needs review)
    | 'not_detected'  // Page loaded but no bonus pattern found
    | 'blocked'       // Page returned 403, CAPTCHA, redirect to restricted page
    | 'error'         // Network error, timeout, or unexpected HTTP status
    | 'needs_review'; // Uncertain — detected text is ambiguous

  confidenceScore:    number;   // 0.0–1.0 — how certain the detection is
  manualReviewRequired: boolean;

  // Page evidence
  capturedAt:         string;   // ISO timestamp
  screenshotPath:     string | null; // /screenshots/{exchange}/bonus_referral_landing/...
  screenshotHash:     string | null; // SHA-256 of screenshot file
  pageTitle:          string | null;
  visibleTextHash:    string | null; // SHA-256 of extracted text (for change detection)

  // Context
  geo:                string;   // Geographic region used for resolution
  userAgentProfile:   string;   // "desktop-chrome" | "mobile-ios" etc.
  playwrightVersion:  string;   // Playwright version at capture time

  // Metadata
  notes:              string;
}
```

### Latest Index File

`reports/bonus-landing-snapshots/latest.json`:
```json
{
  "generatedAt": "2026-06-03T12:00:00Z",
  "runId": "2026-06-03T12:00:00Z",
  "summary": {
    "total": 14,
    "match": 2,
    "mismatch": 3,
    "not_detected": 5,
    "blocked": 1,
    "error": 1,
    "needs_review": 2
  },
  "snapshots": [ /* BonusLandingSnapshot[] */ ]
}
```

---

## 3. Output Files

| File | Purpose | Updated |
|------|---------|---------|
| `reports/bonus-landing-snapshots/latest.json` | Latest full run — all exchanges | Every run |
| `reports/bonus-landing-snapshots/YYYY-MM-DD/{exchange}-{geo}.json` | Per-exchange per-run record | Every run |
| `reports/bonus-landing-verification-report.md` | Human-readable summary | Every run |
| `reports/bonus-landing-mismatches.json` | Exchanges with mismatch / not_detected | When found |
| `reports/bonus-review-queue.json` | Full manual review queue | Every run |

All files in `reports/` are gitignored. They are generated by CI and sent via Telegram.

---

## 4. Bonus Detection Logic

### 4.1 Detection targets

The verifier inspects these elements on the landing/registration page:
- `h1`, `h2`, `h3` — headline elements
- `.bonus`, `.promo`, `.campaign`, `.reward`, `.welcome` — common class patterns
- `[data-bonus]`, `[data-promo]` — common data attributes
- `meta[name="description"]` content
- Full visible text (text nodes, limited depth)

### 4.2 Regex patterns

```javascript
const BONUS_PATTERNS = [
  // e.g. "up to 30,000 USDT" / "up to $10,000"
  /up\s+to\s+[\$]?([\d,]+(?:\.\d+)?)\s*(USDT|USD|BTC|ETH|USDC)?/i,

  // e.g. "30000 USDT bonus" / "bonus of 19800 USDT"
  /([\d,]+(?:\.\d+)?)\s*(USDT|USD|BTC|ETH|USDC)\s+(?:welcome\s+)?bonus/i,

  // e.g. "welcome bonus up to 5000"
  /welcome\s+bonus\s+(?:up\s+to\s+)?([\d,]+(?:\.\d+)?)/i,

  // e.g. "deposit bonus" / "trading rewards" (presence-only, no amount)
  /(deposit\s+bonus|trading\s+rewards|welcome\s+gift|sign[-\s]?up\s+bonus)/i,

  // e.g. "$30K" / "30K USDT"
  /([\d,]+)K\s*(USDT|USD)?/i,
];
```

### 4.3 Currency normalisation

| Detected | Normalized |
|----------|-----------|
| `$`, `USD` | `USD` |
| `USDT`, `tether` | `USDT` |
| `30K USDT` | `30000 USDT` |
| `30,000` | `30000` (numeric) |

### 4.4 Match tolerance

A `match` verdict requires:
- `detectedAmount` within ±10% of `expectedAmount`, **OR**
- `detectedAmount === expectedAmount` exactly
- Currency matches (or expected is USDT and detected is USD — treated as ambiguous → `needs_review`)

A `mismatch` verdict requires:
- `detectedAmount` differs by > 10% from `expectedAmount`

### 4.5 Limitations

- **Not OCR**: text extraction only, no image-based reading. Canvases or image-rendered bonuses won't be detected.
- **Single locale**: detection runs in `en-US` locale only. Non-English bonus text will produce `not_detected`.
- **Dynamic content**: bonus amounts shown via JS countdown timers or personalised A/B variants may differ from static text.
- **Anti-scraping**: some exchanges detect headless browsers and redirect to CAPTCHAs → `blocked`.
- **Detection is not authoritative**: all `mismatch` and `not_detected` outcomes go to `manual_review_required = true`. The system is a signal, not a ground truth.

---

## 5. Safety Rules

The verification system **must never**:

| Rule | Rationale |
|------|-----------|
| Log in to any exchange account | Auth pages contain sensitive data; auth sessions are not to be persisted in CI |
| Create accounts or submit forms | Would create fake registrations on partner platforms |
| Bypass or solve CAPTCHAs | Violates exchange terms of service |
| Scrape authenticated pages | Private data; legal/ethical risk |
| Auto-publish detected bonus changes | Risk of incorrect data reaching production |
| Retry blocked exchanges aggressively | Would trigger IP bans and damage affiliate relationships |

The system **only**:
- Visits public registration/landing pages (no authentication)
- Reads visible DOM text — no network interception
- Saves a screenshot for evidence
- Compares detected text against current evidence data
- Reports findings to manual review queue

---

## 6. Schedule

### Cadence

| Parameter | Value |
|-----------|-------|
| Default cadence | Every 3 days |
| P1 exchanges (binance, okx, mexc, bitget) | Every 3 days |
| P2 exchanges (bybit, bingx, gate-io, kucoin, htx) | Every 3 days |
| P3 exchanges (coinex, phemex, bitunix, lbank, coinbase) | Every 6 days (alternate runs) |
| Stagger delay between exchanges | 90 seconds (avoid traffic spike) |
| Request timeout | 30 seconds per page |
| Retry on error | Once, 10 minutes later |
| Max retries | 2 (then mark as `error`, alert) |

### Stagger logic

```
Run starts → Exchange 1 (immediate)
→ wait 90s → Exchange 2
→ wait 90s → Exchange 3
...
Total for 14 exchanges ≈ 14 × 90s ≈ 21 minutes
```

---

## 7. GitHub Actions / Cron Plan

### Proposed workflow

**File:** `.github/workflows/bonus-landing-verification.yml`
(Must live on `main` branch, checked out from `master` — matches project's two-branch structure)

```yaml
name: Bonus Landing Verification

on:
  schedule:
    - cron: '0 8 */3 * *'   # Every 3 days at 08:00 UTC
  workflow_dispatch:          # Manual trigger
    inputs:
      exchange:
        description: 'Single exchange slug (leave empty for all)'
        required: false

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 40
    steps:
      - uses: actions/checkout@v4
        with:
          ref: master

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npx playwright install chromium --with-deps

      - name: Run bonus landing verification
        run: node scripts/bonus-landing-verification.mjs --live
        env:
          PROXY_PL_URL:  ${{ secrets.PROXY_PL_URL }}
          PROXY_DE_URL:  ${{ secrets.PROXY_DE_URL }}
          PROXY_RU_URL:  ${{ secrets.PROXY_RU_URL }}
          PROXY_TR_URL:  ${{ secrets.PROXY_TR_URL }}
          PROXY_IN_URL:  ${{ secrets.PROXY_IN_URL }}
          PROXY_NG_URL:  ${{ secrets.PROXY_NG_URL }}

      - name: Send Telegram summary
        if: always()
        run: node scripts/bonus-telegram-report.mjs
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID:   ${{ secrets.TELEGRAM_CHAT_ID }}

      - name: Upload snapshot artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: bonus-landing-snapshots-${{ github.run_id }}
          path: reports/bonus-landing-snapshots/
          retention-days: 30
```

### Required secrets

| Secret | Purpose | Required |
|--------|---------|---------|
| `TELEGRAM_BOT_TOKEN` | Send Telegram reports | Yes |
| `TELEGRAM_CHAT_ID` | Target chat | Yes |
| `PROXY_{PL,DE,RU,TR,IN,NG}_URL` | Region-specific proxy for GEO verification | Optional (falls back to direct) |

### Artifacts

Each run uploads `reports/bonus-landing-snapshots/` as a GitHub Actions artifact, retained 30 days.
The `latest.json` file is the canonical run output for downstream consumers.

### Failure notification rules

| Condition | Action |
|-----------|--------|
| `mismatch` found for any exchange | Telegram critical alert + `manualReviewRequired: true` |
| `error` count ≥ 3 | Telegram warning |
| `blocked` count ≥ 3 | Telegram warning (possible IP/proxy issue) |
| Workflow itself fails (timeout, crash) | GitHub default failure email + Telegram via `if: always()` |
| All `match` | Telegram summary only (no alert) |

---

## 8. Telegram Reporting

### Per-run summary message

```
📊 Bonus Landing Verification — 2026-06-03

✅ Match:         2
⚠️ Mismatch:     3  ← NEEDS REVIEW
❓ Not detected: 5
🚫 Blocked:      1
💥 Error:        1
🔍 Needs review: 2

Mismatches:
• binance: expected 19,800 USDT → detected 25,000 USDT
• okx: expected 60,000 USDT → NOT DETECTED (page blocked)
• mexc: expected 8,888 USDT → detected 10,000 USDT

⚠️ NO AUTO-UPDATE. Review queue: reports/bonus-review-queue.json
```

### Critical alert (mismatch)

Sent immediately when `mismatch` is detected for any exchange:

```
🚨 BONUS MISMATCH DETECTED

Exchange: binance
Expected: 19,800 USDT (evidence confidence: 0.27)
Detected: 25,000 USDT
Source: https://www.binance.com/join?ref=CRYPTOBONUSW

Manual review required before updating evidence.
Use: npm run bonus:approve to review proposals.
```

### Blocked/error alerts

Sent in summary only (not individually), unless all exchanges are blocked.

---

## 9. Integration with Evidence System

### How detected bonus updates flow through evidence

```
Detection result: MATCH
  → No evidence update needed
  → bonus_amount.lastChecked updated to today
  → bonus_amount.conflictStatus stays 'ok' (if already ok)
  → manualReviewRequired stays false

Detection result: MISMATCH
  → Creates bonus-update-proposal entry
  → bonus_amount.manualReviewRequired = true
  → bonus_amount.conflictStatus = 'needs-check'
  → Human reviews via: npm run bonus:approve
  → If approved: evidence updated, confidenceScore recalculated
  → If rejected: snapshot archived, no evidence change

Detection result: NOT_DETECTED
  → bonus_amount.conflictStatus → 'unverified' (if currently 'ok')
  → OR stays 'outdated' if already outdated
  → manualReviewRequired = true
  → No auto-update

Detection result: BLOCKED / ERROR
  → No evidence update
  → Run flagged for retry
  → If 3 consecutive runs blocked → Telegram warning
```

### Confidence score recalculation after human approval

When a human approves a bonus proposal:
```
New confidenceScore = 0.85   (human-reviewed live page)
conflictStatus      = 'ok'
lastChecked         = today
checkedBy           = 'landing-verification-approved'
manualReviewRequired = false
```

### When manualReviewRequired STAYS true

- Any `not_detected` result (detection may have failed, not the data)
- Any `mismatch` until human reviews the proposal
- When `blocked` — actual bonus cannot be confirmed
- When `detectedBonus.confidence < 0.6` (ambiguous detection)

### When conflictStatus can move from 'outdated' to 'ok'

Only when ALL of:
1. Detection result is `match`
2. Human approved OR confidence ≥ 0.85 AND amount matches exactly
3. `lastChecked` updated to today in evidence
4. `checkedBy` = `'landing-verification-approved'`

### How validate:evidence and evidence:governance consume results

After `bonus:approve` applies an approved proposal:
- `npm run validate:evidence` will see improved `conflictStatus` (ok) and higher `confidenceScore`
- `npm run evidence:governance` EMS score improves:
  - Bonus Trust component increases
  - Clean Status component improves (fewer outdated facts)
  - Publish-safe threshold may be crossed if confidence ≥ 0.50
- `bonus_amount` moves out of the "top warning fields" list

---

## 10. File Structure

```
scripts/
  bonus-landing-verification.mjs      ← Main verification script (DRY RUN by default)
  bonus-telegram-report.mjs           ← Existing Telegram reporter
  approve-bonus-updates.mjs           ← Existing approval workflow

reports/ (gitignored)
  bonus-landing-verification-plan.json    ← Dry-run plan (produced without --live)
  bonus-landing-verification-plan.md
  bonus-landing-snapshots/
    latest.json                           ← Latest run summary
    YYYY-MM-DD/
      {exchange}-{geo}.json               ← Per-exchange snapshot
  bonus-landing-verification-report.md   ← Human-readable run report
  bonus-landing-mismatches.json          ← Mismatches only
  bonus-review-queue.json                ← Full manual review queue

public/screenshots/ (gitignored for raw captures)
  {exchange}/bonus_referral_landing/
    global-desktop-YYYY-MM.webp          ← Captured landing page screenshot

.github/workflows/ (on main branch)
  bonus-landing-verification.yml        ← CI workflow (NOT YET CREATED)
```

---

## 11. Implementation Phases

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 0** | Architecture doc + dry-run plan script | ✅ This document |
| **Phase 1** | Implement live capture with Playwright (single exchange) | Pending |
| **Phase 2** | Full 14-exchange run + regex detection | Pending |
| **Phase 3** | CI workflow + Telegram integration | Pending |
| **Phase 4** | Evidence update proposals + approval flow | Pending |
| **Phase 5** | GEO-aware verification (per-region proxy) | Pending |

---

## 12. Playwright Integration Note

Playwright `^1.60.0` is already installed as a devDependency.

When Phase 1 is implemented, the verification script will:

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  locale: 'en-US',
  viewport: { width: 1440, height: 900 },
  proxy: process.env.PROXY_URL ? { server: process.env.PROXY_URL } : undefined,
});
const page = await context.newPage();
await page.goto(affiliateUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
// ... extract text, screenshot, hash
await browser.close();
```

No Playwright installation step is needed — `npx playwright install chromium` in CI is sufficient.

---

## 13. Known Detection Failures and Exchange-Specific Notes

### 13.1 MEXC — `not_detected` on 2026-06-03

**Run ID:** `2026-06-03-mexc-live`  
**Result:** `not_detected` (HTTP 204, page title: generic homepage)  
**Owner verification:** Confirmed — owner browser screenshot shows "Sign Up to Claim 10,000 USDT" for referral code `mexc-CryptoBonus`.

**Root cause analysis:**

The headless verifier failed to detect the bonus text for the following reasons:

1. **Bonus text in a JS-rendered registration panel.** The "Sign Up to Claim 10,000 USDT" text appears in a dynamically rendered right-hand bonus panel. The verifier uses `waitUntil: 'domcontentloaded'` which fires before the SPA fully hydrates. The bonus panel content is not present in the initial HTML response.

2. **HTTP 204 response.** The verifier observed status 204 (No Content). This is atypical for a registration page and may indicate the SPA bootstraps from a near-empty HTML shell. Page title falls back to the generic MEXC homepage title rather than a registration-specific title.

3. **Browser permission popup obstruction.** The notification permission popup (browser-level) renders over the page. Playwright in headless mode may not dismiss this popup automatically; it can intercept text extraction from underlying elements.

4. **Google account selector popup.** The Google sign-in overlay may render over the bonus panel, preventing text extraction if the verifier extracts text from the visible DOM rather than the full document tree.

**Recommended verifier improvements for MEXC (and similar SPA exchanges):**

- Wait for `networkidle` or a bonus-specific selector before extracting text:
  ```javascript
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // OR wait for a selector likely to contain bonus text
  await page.waitForSelector('.bonus, .reward-amount, .signup-bonus', { timeout: 10000 }).catch(() => {});
  ```
- Block notification permission requests in Playwright context:
  ```javascript
  await context.grantPermissions([]);  // Grant nothing — prevents permission popups
  ```
- Extract `document.body.innerText` after `networkidle` as a fallback to capture SPA-rendered content:
  ```javascript
  const bodyText = await page.evaluate(() => document.body.innerText);
  ```
- Broaden extraction to include `aria-label`, `data-*` attributes and shadow DOM hosts.
- Log the first 2000 chars of raw page text to the snapshot JSON under `detectionDebug.rawTextExcerpt` for post-mortem debugging of `not_detected` cases.
- **Do NOT** click signup flows, fill forms, submit registrations, or bypass any auth gate — read-only text extraction only.

**Status:** `bonus_amount` evidence updated manually via T09A.2. Automated detection improvement deferred to a future verifier enhancement sprint.

---

## 14. Screenshot Vision Bonus Detection

> Status: Architecture designed. Dry-run skeleton implemented. Live AI API integration pending.  
> Added: 2026-06-03 (T09A.3)  
> Script: `scripts/bonus-screenshot-vision-detect.mjs`  
> Plan scripts: `npm run bonus:vision:plan` / `bonus:vision:plan:json` / `bonus:vision:plan:markdown`

---

### 14.1 Why Text Extraction Is Not Sufficient

The text-extraction verifier in Section 4 works well for exchanges that serve static or server-rendered HTML with visible bonus text. However, it fails for exchanges where the bonus claim:

| Failure mode | Example | Text extractor result |
|---|---|---|
| Bonus in JS-rendered SPA panel | MEXC registration right panel | `not_detected` |
| HTTP 204 — near-empty initial HTML | MEXC sign-up URL | `not_detected` (no text to parse) |
| Browser popup overlays page | Notification permission, Google sign-in | Text extraction may hit overlay elements |
| Canvas/SVG-rendered amounts | Hero graphic with bonus number | `not_detected` (no DOM text node) |
| Non-English page content | Regional variant | `not_detected` (patterns are `en-US` only) |
| A/B test showing different variants | Bonus amount rotated per session | Inconsistent `match` / `not_detected` |

A full-page screenshot captures the **visual state** of the page exactly as a human sees it, including:
- JS-hydrated panel content
- Styled/positioned text that may not be in DOM order
- Overlay and popup state (visible obstructions)
- Canvas and SVG content (if readable by vision model)

Screenshot vision analysis therefore provides a second independent verification layer that complements DOM text extraction.

---

### 14.2 Screenshot Capture Flow

```
[bonus-landing-verification.mjs --live --exchange <slug>]
        │
        │  Playwright headless Chromium
        ▼
  page.goto(captureUrl, { waitUntil: 'domcontentloaded' })
  + waitForTimeout(3000)          ← allow SPA hydration
  + page.screenshot({ type: 'webp', fullPage: false })  ← viewport only
        │
        ▼
  Screenshot saved:
    reports/bonus-landing-snapshots/YYYY-MM-DD/{slug}-screenshot.webp
        │
        ▼
  [bonus-screenshot-vision-detect.mjs]
  Reads screenshot → builds base64 payload
        │
        ▼
  Vision model (Claude claude-3-5-sonnet or equivalent)
  Input: screenshot (base64 image/webp) + structured prompt
        │
        ▼
  Model response: structured JSON (see §14.4)
        │
        ▼
  Write vision result to:
    reports/bonus-vision-detection-results/YYYY-MM-DD/{slug}-vision.json
        │
        ▼
  Add to review queue if manualReviewRequired: true
  ← NO AUTO-UPDATE TO EVIDENCE. ALWAYS MANUAL REVIEW.
```

**Improved capture settings** (recommended after MEXC `not_detected` failure):

```javascript
// Better wait strategy for SPA exchanges
await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
// Grant no permissions — prevents browser permission popups
await context.grantPermissions([]);
// Dismiss cookie banners if safe to do so
await page.evaluate(() => {
  document.querySelectorAll('[id*="cookie"], [class*="cookie"]').forEach(el => el.remove());
}).catch(() => {});
// Screenshot after hydration
await page.screenshot({ path: screenshotPath, type: 'webp', fullPage: false });
```

---

### 14.3 Vision Model Input

**Model:** `claude-3-5-sonnet-20241022` (or equivalent multimodal model)  
**Max tokens:** 512 (JSON response is compact)  
**Temperature:** 0 (deterministic extraction)  
**Input format:** `image/webp` base64-encoded screenshot  

**Prompt structure:**

```
You are analyzing a screenshot of a cryptocurrency exchange registration or
referral landing page for {Exchange Name} ({slug}).

Extract ONLY what is VISIBLE in the screenshot. Do not infer or estimate values
not shown.

Context:
- Exchange: {name}
- Expected referral/invite code: {expectedReferralCode}
- Expected bonus amount: {expectedBonus}

Instructions:
1. Identify whether this is a registration page, bonus landing page, homepage,
   or blocked/error page.
2. Extract the primary bonus claim (amount + currency) if visible.
3. Extract any visible referral/promo/invite code.
4. Quote the exact visible bonus claim text verbatim.
5. Note any popups or overlays that obstruct the page.
6. Assign a confidence score (0.0–1.0) for clarity of bonus information.
7. Set matchStatus: "match" if detected ≈ expected (within 10%),
   "mismatch" if different, "not_detected" if no bonus visible,
   "blocked" if CAPTCHA/login gate.

Respond with ONLY the JSON object below (no markdown, no explanation):
```

---

### 14.4 Expected JSON Output

```json
{
  "exchange": "mexc",
  "pageType": "registration_referral_landing",
  "detectedBonus": "10,000 USDT",
  "detectedAmount": 10000,
  "detectedCurrency": "USDT",
  "detectedReferralCode": "mexc-CryptoBonus",
  "visibleClaimText": "Sign Up to Claim 10,000 USDT",
  "confidenceScore": 0.92,
  "matchStatus": "match",
  "obstructions": ["notification_permission_popup", "google_signin_popup"],
  "cleanReshotRecommended": true,
  "manualReviewRequired": false,
  "notes": "Bonus is visible on the right registration panel. Two popups present but do not obscure bonus text. Recommend clean recapture without popups."
}
```

**pageType values:**

| Value | Meaning |
|-------|---------|
| `registration_referral_landing` | Registration/sign-up page with referral panel |
| `bonus_promo` | Dedicated bonus promotion page |
| `homepage` | Generic exchange homepage (referral may not have applied) |
| `blocked` | CAPTCHA, geo-block, or access-denied page |
| `unknown` | Cannot determine page type |

---

### 14.5 Bonus Detection Fields

| JSON field | Type | Description |
|---|---|---|
| `detectedBonus` | string \| null | Bonus as displayed: `"10,000 USDT"` |
| `detectedAmount` | number \| null | Numeric value extracted: `10000` |
| `detectedCurrency` | string \| null | Currency code: `"USDT"` |
| `visibleClaimText` | string \| null | Exact verbatim text from page |
| `matchStatus` | enum | Comparison result vs expected |
| `confidenceScore` | 0.0–1.0 | Model confidence in extraction |

---

### 14.6 Referral Code Detection

The vision model should identify the referral/promo/invite code if it appears on the page. Common locations:
- Pre-filled input field (e.g. referral code box)
- Right-hand registration panel
- URL bar (if visible in screenshot)
- Confirmation banner: "Invited by mexc-CryptoBonus"

If `detectedReferralCode` differs from `expectedReferralCode`, set `matchStatus: 'needs_review'` and `manualReviewRequired: true` regardless of bonus amount match.

---

### 14.7 Obstruction Detection

The vision model should classify any overlays/popups present:

| Obstruction type | Description |
|---|---|
| `notification_permission_popup` | Browser-level "Allow notifications?" dialog |
| `google_signin_popup` | Google One Tap / account selector overlay |
| `cookie_banner` | Cookie consent banner (bottom/top bar) |
| `captcha` | reCAPTCHA, hCaptcha, or similar challenge |
| `login_gate` | Exchange login wall (page requires auth) |
| `age_gate` | Age verification modal |
| `overlay` | Generic modal/overlay (unclassified) |
| `other_popup` | Any other detected popup |
| `none` | No obstructions detected |

If `obstructions` is non-empty, set `cleanReshotRecommended: true` so the harvest script can attempt a cleaner capture in the next run.

---

### 14.8 Confidence Scoring

| Score range | Interpretation |
|---|---|
| 0.90–1.00 | Bonus text clearly visible and unambiguous |
| 0.70–0.89 | Bonus text visible but partially obstructed or small |
| 0.50–0.69 | Bonus text likely present but partially obscured |
| 0.30–0.49 | Ambiguous — possible bonus text but uncertain |
| 0.00–0.29 | No usable bonus detection |

Evidence updates from vision results:
- `confidenceScore ≥ 0.85` + `matchStatus: match` → may update `bonus_amount.confidenceScore` to 0.85 after human approval
- `confidenceScore < 0.50` → `manualReviewRequired: true` always
- `matchStatus: mismatch` → creates bonus-update-proposal, human review required

---

### 14.9 Manual Review Rules

Vision analysis results **always require manual review** before updating evidence when:

1. `matchStatus: mismatch` — detected amount differs from expected
2. `matchStatus: not_detected` — bonus not visible in screenshot
3. `matchStatus: blocked` — page was a CAPTCHA or access-denied
4. `confidenceScore < 0.70` — uncertain extraction
5. `detectedReferralCode` ≠ `expectedReferralCode` — referral code mismatch
6. `cleanReshotRecommended: true` — obstructions present (reshot first)
7. `pageType: homepage` — wrong page type (referral may not have applied)

Vision analysis results may bypass manual review ONLY when:
- `matchStatus: match`
- `confidenceScore ≥ 0.85`
- `manualReviewRequired: false`
- `obstructions: []` (no popups)
- Human confirms result in review queue

---

### 14.10 No Auto-Publishing Rule

**Vision analysis results NEVER auto-update production evidence or pages.**

```
Vision result (any matchStatus)
        │
        ▼
  Written to: reports/bonus-vision-detection-results/{date}/{slug}-vision.json
        │
        ▼
  Added to: reports/bonus-review-queue.json
        │
        ▼
  Owner reviews via: npm run bonus:approve
        │
        ▼
  If APPROVED: evidence updated with new confidenceScore
  If REJECTED: snapshot archived, no evidence change
```

This mirrors the text-detection flow (Section 9) and applies the same safety guarantee: no bonus amount, confidence score, or conflict status is ever modified automatically by an automated process.

---

### 14.11 Implementation Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| **14-A** | Architecture doc + dry-run plan skeleton | ✅ T09A.3 |
| **14-B** | Improved Playwright capture (networkidle, grant permissions, popup dismiss) | Pending |
| **14-C** | Live vision API integration (Anthropic Messages API, image/webp input) | Pending — requires `ANTHROPIC_API_KEY` secret |
| **14-D** | Vision result → review queue integration | Pending |
| **14-E** | CI GitHub Actions workflow (weekly vision sweep) | Pending |
| **14-F** | Multi-region vision (geo-aware bonus detection) | Future |

---

## Appendix: Known Bonus Amounts (as of 2026-06-01)

| Exchange | Expected Amount | Currency | Confidence | Status |
|----------|----------------|----------|------------|--------|
| binance | 19,800 | USDT | 0.27 | outdated |
| bybit | 30,000 | USDT | 0.27 | outdated |
| okx | 60,000 | USDT | 0.27 | outdated |
| mexc | 10,000 | USDT | 0.75 | ok — owner-verified 2026-06-03 |
| bitget | 6,200 | USDT | 0.27 | outdated |
| bingx | 5,000 | USDT | 0.27 | outdated |
| gate-io | 400 | USDT | 0.27 | outdated |
| kucoin | 700 | USDT | 0.27 | outdated |
| htx | 8,000 | USDT | 0.27 | outdated |
| coinex | 8,000 | USDT | 0.27 | outdated |
| phemex | 8,800 | USDT | 0.27 | outdated |
| bitunix | 1,000 | USDT | 0.27 | outdated |
| lbank | 500 | USDT | 0.27 | outdated |
| coinbase | — | — | 0.53 | ok |

> All bonus amounts are pre-verification estimates. The purpose of this system is to
> replace these low-confidence values with live-verified ones over time.
