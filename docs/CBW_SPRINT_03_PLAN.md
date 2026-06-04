# Sprint 03 — Trust Expansion & KYC Governance: Plan

**Sprint:** Sprint 03 — Trust Expansion & KYC Governance
**Status:** PLANNED
**Branch:** `master`
**Created:** 2026-06-04
**Baseline:** Sprint 02 closed — 7 commits pushed, 207 pages, PASS_WITH_WARNINGS

---

## 1. Sprint 03 Goal

> Expand the publish-safe exchange count from 4/14 to at least 8/14, fix all carried-over P1 screenshot issues, establish a KYC/no-verification editorial policy before any KYC claims go live, and improve screenshot coverage for automated harvesting.

**Sprint 02 end state (baseline for Sprint 03):**

| System | Value |
|---|---|
| Build | 207 pages, 0 fatals |
| QA Gate | PASS_WITH_WARNINGS (exit 0) |
| Affiliate Links | 14/14 clean |
| Global EMS | 69/100 (Fair) |
| Bonus avg confidence | 0.47 |
| Publish-safe exchanges | 4/14 (binance, bitget, mexc, okx) |
| Available screenshots | 22/152 |
| Evidence warnings | 128 |
| P1 carried from Sprint 02 | 3 (Bybit bonus, OKX bonus screenshot, Bybit .jpg format) |

**Sprint 03 Definition of Done:**
- Publish-safe count ≥ 8/14
- All Sprint 02 carried P1 issues cleared (Bybit bonus confidence, .jpg→.webp, OKX bonus screenshot)
- KYC editorial policy written and applied to all 14 evidence files where relevant
- Screenshot captureUrls populated for top 5 exchanges
- No new P0 regressions
- `npm run audit:production` exits 0

---

## 2. Top 10 Tasks — Ranked by Priority

| Rank | ID | Title | Priority | Publish-safe impact |
|------|-----|-------|----------|---------------------|
| 1 | T01 | Bybit bonus verification + confidence raise | P1 | +1 (5/14) |
| 2 | T02 | Bybit bonus screenshot: .jpg → .webp recapture | P1 | Clears P1-05 carry |
| 3 | T03 | OKX bonus screenshot: capture missing file | P1 | Clears registry critical |
| 4 | T04 | KYC/no-verification editorial policy | P1 | Compliance safety |
| 5 | T05 | Coinbase bonus verification + confidence raise | P2 | +1 (6/14) |
| 6 | T06 | Bybit screenshot completion (fees, mobile, PoR) | P2 | EMS boost |
| 7 | T07 | KuCoin bonus verification + confidence raise | P2 | +1 (7/14) |
| 8 | T08 | Bitunix evidence cleanup (8 unverified facts) | P2 | Debt reduction |
| 9 | T09 | Screenshot captureUrl + selector population | P2 | Automation unlock |
| 10 | T10 | OG card images for top 5 exchanges | P3 | SEO/social quality |

---

## 3. Recommended First 5 Tasks

Execute in order: T01 → T02 → T03 → T04 → T05

---

## 4. Task Details

---

### T01 — Bybit Bonus Verification + Confidence Raise

**Task ID:** T01-BYBIT-BONUS
**Priority:** P1
**Owner decision needed:** YES — owner must verify current bonus amount on bybit.com/en/promo/global/welcome-gifts/ before applying

**Reason:**
Bybit is the single highest-value affiliate target on the site (Gold Standard page, EMS 73/100, 7 screenshots on disk, strongest content overrides). Three fields are blocking publish-safe status — all have `confidenceScore: 0.27` and `conflictStatus: "outdated"`:
- `bonus_amount` (30,000 USDT — last checked 2026-05-20)
- `bonus_requires_deposit` (true — last checked 2026-05-20)
- `bonus_expiry_days` (30 days — last checked 2026-05-20)

All other Bybit facts are solid (fees 0.76, KYC 0.76, futures 0.85, p2p 0.90, PoR 0.95).

**Expected impact:**
- Bybit moves from `[REVIEW]` → `[SAFE]` (publish-safe)
- Publish-safe count: 4/14 → 5/14
- Schema emits accurate bonus offer data for Bybit
- EMS likely rises from 73 → 76+

**Files likely touched:**
- `src/data/evidence/bybit.json` — update bonus_amount, bonus_requires_deposit, bonus_expiry_days fields
  - `confidenceScore`: 0.27 → 0.85
  - `conflictStatus`: outdated → ok
  - `manualReviewRequired`: true → false
  - `lastChecked`: 2026-05-20 → 2026-06-04
  - `notes`: full evidence chain

**Verification steps for owner:**
1. Open https://www.bybit.com/en/promo/global/welcome-gifts/?affiliate_id=75062
2. Confirm current max bonus amount (expect ~30,000 USDT — verify exact figure)
3. Confirm deposit required (yes/no and minimum amount)
4. Confirm 30-day task window (still active?)
5. Note any changes since 2026-05-20

**Risk level:** Low — evidence update only, no code changes
**Owner decision needed:** YES — verify current Bybit bonus page before applying update

---

### T02 — Bybit Bonus Screenshot: .jpg → .webp Recapture

**Task ID:** T02-BYBIT-BONUS-WEBP
**Priority:** P1 (carried from Sprint 01 as P1-05, Sprint 02 did not resolve)
**Owner decision needed:** NO — technical recapture only

**Reason:**
The screenshot registry audit flags this as a 🚨 critical error:
```
🚨 bybit/bonus: File not on disk as .webp
   Evidence path: /screenshots/bybit/bonus/global-desktop-2026-06.jpg
   File exists as: .jpg on disk
   Registry convention: .webp
```
The .jpg file at `public/screenshots/bybit/bonus/global-desktop-2026-06.jpg` is an orphan
disk file not matched by any registry entry. The evidence JSON references the .jpg path,
but the registry expects .webp. This creates a broken reference in the screenshot registry
and an orphan on disk.

**Expected impact:**
- Clears P1-05 carry from Sprint 01
- Reduces critical registry issues: 2 → 1 (then 0 after T03)
- Bybit bonus screenshot correctly displayed on exchange page

**Files likely touched:**
- `public/screenshots/bybit/bonus/global-desktop-2026-06.webp` — new capture (replace .jpg)
- `public/screenshots/bybit/bonus/global-desktop-2026-06.jpg` — delete old file
- `src/data/evidence/bybit.json` — update screenshots.bonus.path from .jpg → .webp

**Capture target:** `https://www.bybit.com/en/promo/global/welcome-gifts/`
Use: `npm run screenshots:capture:public -- --exchange bybit --slot bonus`

**Risk level:** Low — public page, no auth required, delete old file
**Owner decision needed:** NO

---

### T03 — OKX Bonus Screenshot: Capture Missing File

**Task ID:** T03-OKX-BONUS-SCREENSHOT
**Priority:** P1 (critical registry error)
**Owner decision needed:** NO — public page capture

**Reason:**
Screenshot registry audit flags a second 🚨 critical error:
```
🚨 okx/bonus: File not on disk: /screenshots/okx/bonus/global-desktop-2026-06.webp
```
OKX is already publish-safe (evidence confidence 0.85), but the `bonus` screenshot slot
is registered as `available` in evidence JSON yet the file does not exist on disk.
This means the exchange page attempts to render a missing image asset.

**Expected impact:**
- Clears remaining critical registry issue (0 critical after T02+T03)
- OKX bonus page shows visual evidence to users
- Screenshot count: 22 → 23

**Files likely touched:**
- `public/screenshots/okx/bonus/global-desktop-2026-06.webp` — new capture
- `src/data/evidence/okx.json` — confirm screenshots.bonus.status: available, path correct

**Capture target:** OKX new user bonus/promo landing page (public)
Use: `npm run screenshots:capture:public -- --exchange okx --slot bonus`

**Risk level:** Low — public page, no auth required
**Owner decision needed:** NO

---

### T04 — KYC/No-Verification Editorial Policy

**Task ID:** T04-KYC-POLICY
**Priority:** P1 — compliance and editorial safety
**Owner decision needed:** YES — final policy approval required before applying to pages

**Reason:**
Several exchanges on the site (Bitunix, BingX, KuCoin, Gate.io) have KYC claims that are
either unverified or carry misleading framing. The current evidence schema has no structured
fields for KYC granularity. Before Sprint 03 content expansion brings more KYC-related claims
to published pages, a clear policy must exist.

Specific risks in current evidence data:
- `bitunix.kyc_required: false` — confidenceScore 0.65, conflictStatus: "unverified" — page
  may imply "no KYC needed" without solid evidence
- `bitunix.bonus_requires_kyc: false` — same risk; a newer exchange whose KYC policy may have
  changed since last check
- No exchange currently has geo-specific KYC fields (e.g. KYC may differ Russia vs. EU vs. UAE)
- No `withdrawal_limit_without_kyc` field exists at the exchange level (only a general `no_kyc_withdrawal_limit` in Bybit)

**Expected impact:**
- Safe editorial wording rules codified in documentation
- 14 evidence files audited for KYC claim safety before publishing
- Reduces legal/reputational risk from inaccurate "no KYC" claims
- Enables Sprint 03+ KYC section on exchange pages with confidence

**Files likely touched:**
- `docs/CBW_KYC_EDITORIAL_POLICY.md` — new policy document (see Section 5 below)
- `src/data/evidence/*.json` — add `kyc_policy` block to each exchange (data collection)
- `src/data/content-overrides.json` — update KYC-related copy for Bitunix, BingX
- `src/pages/exchanges/[slug].astro` — KYC section rendering (optional Phase 2)

**Risk level:** Medium — policy impacts how KYC is presented to users on live pages
**Owner decision needed:** YES — approve policy and safe wording before applying to pages

---

### T05 — Coinbase Bonus Verification + Confidence Raise

**Task ID:** T05-COINBASE-BONUS
**Priority:** P2
**Owner decision needed:** YES — owner must verify current Coinbase offer

**Reason:**
Coinbase ranks 4th by EMS (73/100, tied with Bybit) and has high confidence in most facts
(avg 0.82 per governance report). It is currently in `[REVIEW]` state — likely because
bonus-related fields are outdated. Coinbase is a high-trust exchange (US-regulated, Nasdaq-listed)
and a strong SEO/affiliate target for the site. Bringing it to publish-safe is high-ROI.

Note: Coinbase has a different bonus model than crypto-native exchanges — it often uses
rewards/earn programs rather than a welcome bonus. The bonus_amount field may need to be
restructured to reflect cashback, staking rewards, or referral bonuses rather than a
single "max bonus" figure.

**Expected impact:**
- Publish-safe count: 5/14 → 6/14
- High-trust exchange added to publish-safe list
- EMS improvement for Coinbase (currently 73)

**Files likely touched:**
- `src/data/evidence/coinbase.json` — update bonus fields, verify current offer structure

**Risk level:** Low — evidence update only
**Owner decision needed:** YES — verify current Coinbase new user offer before applying

---

### T06 — Bybit Screenshot Completion (Fees, Mobile, PoR)

**Task ID:** T06-BYBIT-SCREENSHOTS-COMPLETE
**Priority:** P2
**Owner decision needed:** NO — public pages

**Reason:**
Bybit has 3 screenshot slots still in `needs_manual_capture` state after Sprint 02:
- `fees` — "Raw fee screenshots archived. Need clean desktop capture of fee schedule page."
- `mobile_app` — "No mobile app screenshot available."
- `proof_of_reserves` — "No PoR screenshot available."

These are needed to complete Bybit's Gold Standard profile (currently 7/10 slots filled).
`proof_of_reserves` is particularly important — Bybit has PoR published and Hacken-verified,
making it a trust signal worth displaying.

**Expected impact:**
- Bybit screenshot count: 7 → 10 (all major slots filled)
- EMS boost for Bybit (screenshots contribute to maturity score)
- PoR and fees screenshots serve as trust evidence on the page

**Files likely touched:**
- `public/screenshots/bybit/fees/global-desktop-2026-06.webp` — new
- `public/screenshots/bybit/mobile_app/global-mobile-2026-06.webp` — new
- `public/screenshots/bybit/proof_of_reserves/global-desktop-2026-06.webp` — new
- `src/data/evidence/bybit.json` — update 3 screenshot slots to `available`

**Capture targets:**
- fees: https://www.bybit.com/en/help-center/article/Transaction-Fee-and-Handling-Fee-Bybit-Spot
- proof_of_reserves: https://www.bybit.com/en/proof-of-reserves/
- mobile_app: App Store/Play Store listing or actual app screenshot (manual)

**Risk level:** Low — public pages
**Owner decision needed:** NO (mobile_app may need physical device — note if blocked)

---

### T07 — KuCoin Bonus Verification + Confidence Raise

**Task ID:** T07-KUCOIN-BONUS
**Priority:** P2
**Owner decision needed:** YES — owner must verify current KuCoin offer

**Reason:**
KuCoin ranks 7th by EMS (68/100) and is a top-10 global exchange by volume. After Bybit
and Coinbase, it is the most natural next target for publish-safe status. KuCoin has a
well-known welcome bonus program (typically 500-700 USDT for new users) and is a major
affiliate opportunity for the site.

**Expected impact:**
- Publish-safe count: 6/14 → 7/14
- High-volume exchange added to publish-safe list

**Files likely touched:**
- `src/data/evidence/kucoin.json` — update bonus fields

**Risk level:** Low — evidence update only
**Owner decision needed:** YES

---

### T08 — Bitunix Evidence Cleanup

**Task ID:** T08-BITUNIX-CLEANUP
**Priority:** P2 (carried from Sprint 01 and Sprint 02 as unresolved)
**Owner decision needed:** YES — several facts require manual verification of a newer exchange

**Reason:**
Bitunix has 8 unverified facts — the highest count in the dataset. The governance report
flags it as a critical issue. Specific unverified fields:
1. `bonus_requires_kyc: false` — conflictStatus: unverified, manualReviewRequired
2. `kyc_required: false` — conflictStatus: unverified, manualReviewRequired
3. `p2p_available: false` — conflictStatus: unverified, manualReviewRequired
4. `proof_of_reserves: false` — conflictStatus: unverified, manualReviewRequired
5. `headquarters: Unknown` — confidenceScore 0.35, manualReviewRequired
6. `restricted_us: true` — conflictStatus: unverified, manualReviewRequired
7. `bonus_amount: 1000 USDT` — outdated, manualReviewRequired
8. `trading_pairs_count: 200` — conflictStatus: unverified (no manualReviewRequired)

This is a newer exchange (founded ~2022). Several claims (especially KYC-free trading
and "no KYC required") require careful verification before they appear on live pages,
especially in light of the T04 KYC policy being created.

**Expected impact:**
- Reduce unverified facts from 8 → 0 or near-0 for Bitunix
- Reduce global evidence warnings by ~10-15
- Bitunix EMS rises from 59 → 65+ (potential publish-safe if bonus verified)
- Risk: If KYC-free claim cannot be verified → must be changed to conservative wording

**Files likely touched:**
- `src/data/evidence/bitunix.json` — update 6-8 facts
- `src/data/content-overrides.json` — review Bitunix KYC copy

**Risk level:** Medium — KYC claims require careful handling; wrong wording creates user risk
**Owner decision needed:** YES — must manually verify bitunix.com facts before applying

---

### T09 — Screenshot captureUrl + Selector Population

**Task ID:** T09-SCREENSHOT-REGISTRY-URLS
**Priority:** P2 — automation unlock
**Owner decision needed:** NO

**Reason:**
The screenshot registry audit shows 102 entries missing `captureUrl` and 36 entries missing
CSS selectors. This blocks the automated screenshot harvester from running for most exchanges.
Adding captureUrls and selectors is a one-time setup task that unlocks `npm run screenshots:orchestrate:all`
for the full exchange set.

Current affected exchanges (all missing captureUrls): bingx, bitget, bitunix, bybit, coinbase,
coinex, gate-io, htx, kucoin, lbank, mexc, okx, phemex (13/14 exchanges).

**Expected impact:**
- Unlock automated screenshot harvesting for 13 exchanges
- After harvest: screenshot count could jump from 22 → 50+
- Eliminates "102 missing captureUrl" warnings from audit

**Files likely touched:**
- `src/data/screenshot-registry.ts` (or wherever the registry is defined) — add captureUrls
  and CSS selectors for registration, fees, bonus, proof_of_reserves slots per exchange

**Risk level:** Low — read-only data, no code logic changes
**Owner decision needed:** NO — URLs are public exchange pages

---

### T10 — OG Card Images for Top 5 Exchanges

**Task ID:** T10-OG-IMAGES
**Priority:** P3 — SEO/social quality
**Owner decision needed:** YES — approve image style/content before publishing

**Reason:**
Exchange review pages currently have no OG images, which degrades Yandex/social preview
quality. When a page is shared in Telegram, VK, or appears in Yandex search snippets,
a relevant image increases CTR significantly. Top 5 exchanges by affiliate importance:
Binance, Bybit, OKX, MEXC, Bitget — these should get OG images first.

OG images should be:
- 1200×630px (standard OG dimensions)
- Exchange logo + bonus amount + "cryptobonusworld.com" brand
- Generated from a template (Satori/canvas or design tool)
- Not confused with editorial screenshots — they are marketing thumbnails

**Expected impact:**
- Improved CTR from Yandex/Telegram/social shares
- Better appearance in Yandex Webmaster image report
- Professional appearance in link previews

**Files likely touched:**
- `public/og/` (new directory) — 5 new OG images
- `src/utils/seo.ts` — point `og:image` to per-exchange OG image if available
- `src/pages/exchanges/[slug].astro` — pass OG image to SeoHead

**Risk level:** Low — additive only, no existing functionality affected
**Owner decision needed:** YES — approve image design and content before creating

---

## 5. KYC / No-Verification Editorial Policy

> **Effective from:** Sprint 03 start
> **Applies to:** All 14 exchange pages on cryptobonusworld.com
> **Policy document target:** `docs/CBW_KYC_EDITORIAL_POLICY.md` (to be created in T04)

### 5.1 Forbidden Claims

The following statements are **PROHIBITED** on any exchange page without exact, dated,
geo-specific, source-linked evidence:

| Forbidden phrasing | Risk |
|---|---|
| "trade without verification" | KYC requirements vary by product, geo, and time |
| "no KYC exchange" | Virtually no exchange allows full withdrawal without KYC |
| "withdraw without KYC" | Legally and practically incorrect for most exchanges |
| "no KYC required" (without qualification) | Misleads users who then face withdrawal blocks |
| "anonymous trading" | Regulatory risk; potentially illegal claim in some geos |
| "P2P without KYC" | P2P KYC requirements differ by exchange and country |
| "instant withdrawal without verification" | False for most exchanges |

### 5.2 Required Safe Wording

Replace forbidden phrases with these approved patterns:

```
APPROVED:
"partial access without full KYC verification may be available for spot trading"
"limits and available products depend on your country, account level, and current exchange policy"
"withdrawal may require identity verification — check {exchange} help center for current requirements"
"P2P and futures trading may require additional verification steps"
"KYC requirements verified on {DATE} — re-check before registration as policies change"
"no-KYC withdrawal limit: {AMOUNT} USDT/day (verify current limit before registering)"
```

### 5.3 Required Evidence Fields Per Exchange

Each exchange evidence file must include a structured `kyc_policy` block before any KYC
claims appear on published pages. Required fields:

```json
"kyc_policy": {
  "registration_without_kyc": true | false,
  "spot_trading_without_kyc": true | false | "limited",
  "futures_without_kyc": true | false | "limited",
  "p2p_without_kyc": true | false | "limited",
  "deposit_without_kyc": true | false,
  "withdrawal_without_kyc": true | false,
  "withdrawal_limit_no_kyc_usdt_day": 0,
  "geo_restrictions_apply": true | false,
  "geo_notes": "string — e.g. 'KYC mandatory in EU; limited trading in Russia'",
  "last_checked": "YYYY-MM-DD",
  "source_url": "https://...",
  "confidenceScore": 0.00,
  "manualReviewRequired": true | false
}
```

**Minimum confidence to publish a KYC claim on a page:** `confidenceScore ≥ 0.70`
**Any KYC claim with `conflictStatus: "unverified"` must show safe-wording fallback only.**

### 5.4 KYC Trust Tiers for Exchange Pages

| Tier | Criteria | Page treatment |
|------|----------|----------------|
| **Verified** | confidenceScore ≥ 0.85, conflictStatus: ok, lastChecked ≤ 30 days | Display exact KYC policy with date |
| **Checked** | confidenceScore ≥ 0.70, conflictStatus: ok, lastChecked ≤ 90 days | Display with "verified on {date}" qualifier |
| **Outdated** | confidenceScore < 0.70 OR conflictStatus: outdated | Display safe-wording fallback only |
| **Unverified** | conflictStatus: unverified OR manualReviewRequired: true | Do not display KYC-specific claims |

### 5.5 KYC Policy by Exchange — Current Status

| Exchange | kyc_policy block | Withdrawal limit | Risk notes |
|----------|-----------------|------------------|------------|
| Binance | ❌ not in schema | KYC required for full withdrawal | Safe — KYC required wording |
| Bybit | Partial (no_kyc_withdrawal_limit: 0 USDT/day) | 0 — KYC mandatory | Safe — well evidenced |
| OKX | ❌ not in schema | Unknown | Review before KYC copy added |
| MEXC | ❌ not in schema | Unknown | Review before KYC copy added |
| Bitget | ❌ not in schema | Unknown | Review before KYC copy added |
| BingX | ❌ not in schema | Unknown | Review before KYC copy added |
| Bitunix | `kyc_required: false` — **unverified** | Unknown | ⚠️ HIGH RISK — do not publish no-KYC claim |
| Others | ❌ not in schema | Unknown | Fallback wording only |

> **Immediate action:** Bitunix page must display safe-wording fallback for KYC claims
> until T08-BITUNIX-CLEANUP resolves the unverified `kyc_required: false` field.

---

## 6. Sprint 03 Success Metrics

| Metric | Sprint 02 Baseline | Sprint 03 Target |
|--------|--------------------|-----------------|
| Publish-safe exchanges | 4/14 | ≥ 8/14 |
| Global EMS | 69/100 | ≥ 74/100 |
| Evidence warnings | 128 | ≤ 100 |
| Available screenshots | 22/152 | ≥ 35/152 |
| Critical registry issues | 2 | 0 |
| KYC policy document | ❌ | ✅ created + applied |
| captureUrls populated | ~0 | ≥ top 5 exchanges |
| OG images | 0 | ≥ 5 (top exchanges) |
| Build pages | 207 | 207 (no regression) |
| QA gate | PASS_WITH_WARNINGS | PASS_WITH_WARNINGS (or better) |

---

## 7. Owner Decisions Needed Before Sprint 03 Start

The following require explicit owner approval before any code or evidence changes:

| # | Decision | Needed for |
|---|----------|-----------|
| OD-1 | Verify current Bybit bonus page — confirm 30,000 USDT, deposit requirement, 30-day window | T01-BYBIT-BONUS |
| OD-2 | Approve KYC editorial policy safe wording (Section 5.2) | T04-KYC-POLICY |
| OD-3 | Verify current Coinbase new user offer structure | T05-COINBASE-BONUS |
| OD-4 | Verify current KuCoin welcome bonus | T07-KUCOIN-BONUS |
| OD-5 | Approve OG image design direction (layout, branding, bonus amount display) | T10-OG-IMAGES |
| OD-6 | Confirm whether Bitunix `kyc_required: false` is safe to publish or must be fallback | T08-BITUNIX-CLEANUP |

---

## 8. Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Bybit bonus terms changed since 2026-05-20 | Medium | Owner verifies before any update applied |
| Bitunix KYC-free claim published before verification | High | T04 policy + safe-wording fallback gates publishing |
| OKX bonus screenshot capture blocked by anti-bot | Low | Use authenticated session or manual capture |
| captureUrl population accidentally uses wrong regional URL | Low | All URLs must be verified as global (not geo-specific) before adding |
| Coinbase bonus model differs from standard (no "max bonus" figure) | Medium | If bonus_amount doesn't apply, use bonus_description instead |
| Sprint 03 scope creep from too many verification tasks | Medium | Limit to 4 exchange verifications per sprint; defer the rest |

---

## 9. Files Missing from This Planning Session

The following files were requested but did not exist (not a blocker):

| File | Status |
|------|--------|
| `reports/sprint-02-final-qa-commit-plan.md` | Gitignored — regenerated on demand |
| `reports/evidence-governance-report.md` | Gitignored — data sourced from production QA report instead |
| `src/data/evidence/binance.json` | Not read — Sprint 02 data confirmed via governance output |
| `src/data/evidence/okx.json` | Not read — critical issue identified from registry audit directly |
| `src/data/evidence/mexc.json` | Not read — already publish-safe per Sprint 02 |
| `src/data/evidence/bitget.json` | Not read — already publish-safe per Sprint 02 |

---

## 10. Recommended Next Immediate Prompt

```
PROMPT ID: T01-BYBIT-BONUS-OWNER-VERIFY
TASK: Owner to verify current Bybit welcome bonus page before Sprint 03 begins.

Visit: https://www.bybit.com/en/promo/global/welcome-gifts/?affiliate_id=75062

Confirm and report:
1. Current maximum bonus amount (in USDT)
2. Is deposit required? If yes — minimum deposit amount?
3. Is the 30-day task completion window still active?
4. Any significant changes to bonus structure since May 2026?

Then send confirmation: "OWNER DECISION: APPROVE — apply Bybit bonus_amount update.
  bonus_amount: [VALUE] USDT
  bonus_requires_deposit: [true/false]
  bonus_min_deposit: [VALUE or null] USDT
  bonus_expiry_days: [VALUE] days
  source confirmed on: [DATE]"
```

---

*Sprint 03 created: 2026-06-04*
*Author: Master Owner / Sprint Planning*
*Based on: Sprint 02 final QA state + screenshot registry audit + bybit/bitunix evidence analysis*
