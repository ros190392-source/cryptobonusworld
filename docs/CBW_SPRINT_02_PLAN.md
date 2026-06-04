# Sprint 02 — Evidence Quality & Template Expansion: Plan

**Sprint:** Sprint 02 — Evidence Quality & Template Expansion  
**Status:** PLANNED  
**Branch:** `master`  
**Prepared by:** Master Owner / Release Documentation Engineer  
**Sprint 01 Closed:** 2026-06-03  
**Baseline QA at Sprint 02 Start:** `PASS_WITH_WARNINGS` (exit 0)

---

## 1. Sprint 02 Objective

> Resolve all P1 data quality gaps from Sprint 01, bring three more exchanges to Gold Standard, and integrate automated evidence verification into the CI/CD pipeline.

Sprint 01 built the governed platform. Sprint 02 fills it with verified data.

**Three pillars:**
1. **Data Quality** — Clear outdated bonus facts for P1 exchanges; validate all 297 facts against live sources.
2. **Template Expansion** — Bring Binance, MEXC, and OKX to Gold Standard using the spec document from Task 05.5.
3. **Automation** — GitHub Actions CI gate, automated Yandex Metrika event verification, Telegram reporting.

**Sprint 02 end state (Definition of Done):**
- At least 3 exchanges publish-safe (bonus confidence ≥ 0.50, conflictStatus ≠ "outdated")
- At least 3 exchanges at Gold Standard (EMS ≥ 70, screenshots ≥ 5, evidence-aware copy)
- `npm run audit:production` runs clean in CI on every push to `master`
- Product schema no longer emits stale bonus amounts for outdated evidence
- Bybit bonus screenshot recaptured as `.webp` (critical P1 cleared)

---

## 2. Sprint 01 Handoff State

Current baseline as of Sprint 01 close:

| System | Status |
|---|---|
| Build | ✅ 207 pages, 0 errors |
| QA Gate | ✅ PASS_WITH_WARNINGS (exit 0) |
| Affiliate Links | ✅ 14/14 clean, MEXC + Bybit immutable |
| Global EMS | 67/100 (Fair) |
| Bonus avg confidence | 0.44 (threshold: 0.50) |
| Publish-safe exchanges | **0/14** |
| Available screenshots | 15/152 |
| Gold Standard exchanges | **1/14** (Bybit only) |
| P1 issues open | 6 |
| Uncommitted changes | All Sprint 01 changes on `master`, NOT yet committed or deployed |

**Unresolved P1 issues from Sprint 01:**

| ID | Issue |
|---|---|
| P1-01 | All 14 exchanges: `bonus_amount.conflictStatus: outdated` |
| P1-02 | 0/14 bonus claims are publish-safe |
| P1-03 | bitunix: 8 unverified facts, 7 manual review flags |
| P1-04 | Bybit live verification technical error (ERR_HTTP2_PROTOCOL_ERROR) |
| P1-05 | Bybit bonus screenshot `.jpg` on disk (registry expects `.webp`) |
| P1-06 | Product schema emits `offers.price: 30000` despite outdated evidence |

---

## 3. Priority Framework

| Priority | Meaning | Blocking? |
|---|---|---|
| **P0** | Breaks affiliate safety, build, or QA gate exit 0 | Yes — fix before any other work |
| **P1** | Data quality / trust accuracy / schema accuracy — users may see stale claims | Recommended sprint targets |
| **P2** | Completeness / automation / reporting — no user-visible risk, but backlog debt | Schedule after P1s clear |

**Sprint 02 P0 criteria:** Any change that causes `npm run audit:production` to exit non-zero, breaks affiliate link validation, or introduces a live crawl without explicit `--live --confirm-live` flags is a P0 regression — stop and revert.

---

## 4. Task Roster

### T07 — Screenshot Harvest: P1 Exchanges

**Priority:** P1  
**Estimated scope:** 3–4 sessions  
**Risk:** Low (read-only capture; no data modified)

**Objective:**  
Capture the 9 standard screenshot categories for MEXC, OKX, Bitget, and BingX. Bybit bonus screenshot must be recaptured as `.webp` to clear the P1 registry error. Store to `/screenshots/<exchange>/<category>/global-desktop-2026-06.webp`, update evidence JSON with `status: "available"`, update screenshot registry.

**Files likely touched:**
```
src/data/screenshot-registry.ts          ← status updates
src/data/evidence/mexc.json              ← screenshots section
src/data/evidence/okx.json
src/data/evidence/bitget.json
src/data/evidence/bingx.json
src/data/evidence/bybit.json             ← bonus: .jpg → .webp path
public/screenshots/bybit/bonus/global-desktop-2026-06.webp   ← recapture
public/screenshots/mexc/**
public/screenshots/okx/**
public/screenshots/bitget/**
public/screenshots/bingx/**
```

**Dependencies:** None (registry and scripts already in place)

**Do NOT:**
- Capture: withdrawal pages, API keys, security settings, documents, wallet addresses, QR codes, balances, personal info
- Commit screenshots — add `/public/screenshots/` to `.gitignore` if not already excluded
- Auto-approve any screenshot that contains sensitive data — mark `manual_review_required`
- Blur or crop programmatically unless capture script has explicit blur step

**Definition of Done:**
- `npm run audit:screenshots` shows 0 critical errors
- Bybit bonus: `status: "available"`, path ends in `.webp`
- MEXC, OKX, Bitget, BingX: ≥ 5 screenshots each with `status: "available"`
- `npm run audit:production` still exits 0

**QA commands:**
```bash
npm run audit:screenshots
npm run audit:screenshots:markdown
npm run audit:production
```

---

### T07B — Binance Screenshot Governance Discrepancy Investigation

**Priority:** P1  
**Estimated scope:** 1 session (investigation only)  
**Risk:** Very low (read-only)

**Objective:**  
Resolve the discrepancy between `reports/evidence-governance-report.md` (shows Binance 0/10 screenshots) and `reports/screenshot-registry-audit.md` (confirms 8 Binance disk files). Identify whether the governance report's EMS screenshot component has a counting bug in `scripts/evidence-governance-report.mjs`, or whether `evidence/binance.json` has a structural issue. Fix the root cause — do not manually inflate the score.

**Context:**  
`src/data/evidence/binance.json` has 8 screenshots marked `status: "available"`. The registry audit confirms the same 8 files on disk. But the governance report's Binance EMS screenshot component shows 0. This means Binance EMS is likely being under-counted by ~5–10 points.

**Files likely touched:**
```
scripts/evidence-governance-report.mjs   ← likely counting bug
src/data/evidence/binance.json           ← read-only inspection
reports/evidence-governance-report.md    ← regenerate after fix
```

**Dependencies:** None

**Definition of Done:**
- Root cause identified and documented
- Governance script fixed if it has a bug
- `npm run evidence:governance` shows Binance screenshot count ≥ 8
- Binance EMS re-scores correctly
- Report regenerated and reviewed

**QA commands:**
```bash
npm run evidence:governance
npm run evidence:governance:markdown
npm run audit:production
```

---

### T08 — Apply Gold Standard Template: Binance, MEXC, OKX

**Priority:** P1  
**Estimated scope:** 3–5 sessions (one per exchange)  
**Risk:** Medium (modifies exchange data and template rendering)

**Objective:**  
Apply the Gold Standard template specification (`docs/GOLD_STANDARD_EXCHANGE_TEMPLATE.md`) to Binance, MEXC, and OKX. Each exchange requires:

1. Add `exchanges.json` realism fields: `offerConfidenceScore`, `offerLastChecked`, `keyLimitation`, `keyLimitationSeverity`, `riskLevel`
2. Add content overrides in `content-overrides.json` or exchange data: exchange-specific hero headline, verdict block, FAQ additions
3. Verify evidence-aware copy renders correctly for each exchange's `conflictStatus`
4. Add OfferRealism block data (requires screenshot + source)
5. Confirm `_bonusTrustOutdated` renders "under active review" variant (it should — all 14 are outdated)

**Per-exchange priority:**
- **Binance:** P1 — highest traffic, 8 screenshots already on disk, Near-Gold
- **MEXC:** P1 — MEXC affiliate link is immutable, high-value, 0 screenshots needed for template
- **OKX:** P1 — 66 EMS, good confidence base

**Files likely touched:**
```
src/data/exchanges.json                  ← add realism fields (3 exchanges)
src/data/content-overrides.json          ← add exchange-specific copy
src/data/evidence/binance.json           ← review + light additions (no value changes)
src/data/evidence/mexc.json
src/data/evidence/okx.json
src/pages/exchanges/[slug].astro         ← only if template bug found
```

**Dependencies:** T07B should complete first (correct Binance EMS before applying template)

**Do NOT:**
- Modify `bonus_amount.currentValue` without explicit owner approval
- Change `confidenceScore` values
- Modify the MEXC or Bybit affiliate URLs
- Change `conflictStatus` from "outdated" — this must come from live verification (T09)

**Definition of Done:**
- Binance, MEXC, OKX each have `offerConfidenceScore` set in `exchanges.json`
- OfferRealism block renders on all 3 exchange pages
- Evidence-aware trust copy displays correctly (should show "under active review" for all 3)
- Build ✅ 207+ pages
- `npm run audit:production` exits 0
- EMS for all 3 exchanges ≥ 65

**QA commands:**
```bash
npm run build
npm run evidence:governance:markdown
npm run audit:production
```

---

### T09 — Bonus Landing Re-Verification: P1 Exchanges

**Priority:** P1  
**Estimated scope:** 2–3 sessions  
**Risk:** Medium (live crawling; controlled by existing safety flags)

**Objective:**  
Run live bonus landing verification for Binance, MEXC, OKX, and Bitget using the existing `bonus-landing-verification.mjs` script. Review snapshots in the review queue. For any exchange where detected bonus matches expected value (or can be confirmed), update `bonus_amount.conflictStatus` from "outdated" to "verified" and update `confidenceScore`. Each update requires explicit owner approval — no auto-apply.

**Bybit retry:** Retry `npm run bonus:landing:live:bybit` to resolve the ERR_HTTP2_PROTOCOL_ERROR technical error.

**Context:** The bonus landing verification architecture is complete. `bonus:review:queue` classifies snapshots into 7 action categories. The only remaining step is running the live checks and approving changes.

**Files likely touched (only after explicit owner approval):**
```
src/data/evidence/binance.json           ← bonus_amount.conflictStatus + confidenceScore
src/data/evidence/mexc.json
src/data/evidence/okx.json
src/data/evidence/bitget.json
src/data/evidence/bybit.json
reports/bonus-landing-snapshots/          ← new dated snapshot dirs (read/append only)
reports/bonus-landing-live-report.md     ← updated
reports/bonus-review-queue.md            ← updated
```

**Dependencies:** Bonus verification architecture (Task 04.6/04.7) — already complete

**Do NOT:**
- Run live crawls without explicit `--live --confirm-live` flags
- Auto-update evidence files — every `conflictStatus` change requires owner review
- Run all 14 exchanges in one session — run P1 exchanges only (binance, okx, mexc, bitget)
- Submit any forms, click CTAs, or bypass CAPTCHAs

**Definition of Done:**
- Live snapshot exists for each P1 exchange (dated today)
- Review queue report generated and sent to owner
- At least 1 exchange has `conflictStatus` updated to "verified" (with owner approval)
- `npm run bonus:review:queue` shows 0 technical errors after retry
- `npm run audit:production` still exits 0

**QA commands:**
```bash
npm run bonus:landing:plan
npm run bonus:review:queue
npm run evidence:governance:markdown
npm run audit:production
```

---

### T10 — Product Schema Evidence-Aware Safety Fix

**Priority:** P1  
**Estimated scope:** 1 session  
**Risk:** Low (template logic only; no data changes)

**Objective:**  
Fix the Product schema in `src/utils/seo.ts` (or wherever the schema is built) so that `offers.price` is not emitted when `bonus_amount.conflictStatus === "outdated"`. Google may extract stale bonus amounts from the schema and display them in rich results. The correct fix is one of:
- Option A: Omit `offers.price` entirely when conflictStatus is outdated
- Option B: Emit `offers.price: 0` with `priceValidUntil` set to a past date (signals expired)
- Option C: Replace `offers` block with a `description`-only price mention (no machine-readable price)

**Owner must approve which option to use** before implementation. Recommendation: Option A (omit) — safest, no stale data exposure risk.

**Files likely touched:**
```
src/utils/seo.ts                         ← schema generation logic
src/pages/exchanges/[slug].astro         ← only if schema built inline
```

**Dependencies:** None (standalone fix)

**Do NOT:**
- Change `bonus_amount.currentValue` in evidence JSON
- Remove the entire Product schema — only the `offers.price` emission needs guarding
- Apply Option B without confirming `priceValidUntil` date logic is correct

**Definition of Done:**
- When `bonus_amount.conflictStatus === "outdated"`, Product schema does not emit `offers.price`
- Build ✅ 207+ pages
- Schema output manually verified on Bybit page (`<script type="application/ld+json">` in page source)
- `npm run audit:production` exits 0

**QA commands:**
```bash
npm run build
# Inspect: dist/exchanges/bybit/index.html — check for offers.price in ld+json
npm run audit:production
```

---

### T11 — GitHub Actions QA Gate Integration

**Priority:** P1  
**Estimated scope:** 1–2 sessions  
**Risk:** Low (new file in `main` branch only; no `master` changes)

**Objective:**  
Add a GitHub Actions workflow on the `main` branch that runs `npm run audit:production:fast` on every push to `master`. The workflow must:
1. Run the QA gate (validate evidence, check affiliates, check screenshots, check review queue)
2. Post results as a PR status check
3. Block merge if QA gate exits non-zero
4. NOT run live bonus verification (dry-run only)
5. NOT store credentials or capture live screenshots

**Context:** The two-branch structure is intentional — `main` holds workflow YAML only; `master` holds all code. Workflow file goes to `main` and targets `master` pushes.

**Files likely touched:**
```
.github/workflows/qa-production.yml     ← NEW (goes on main branch)
```

**Dependencies:** All Sprint 01 scripts must be stable (they are)

**Do NOT:**
- Merge `main` into `master`
- Add secrets or credentials to the workflow
- Enable live crawling in CI — `bonus:landing:plan` only (dry-run)
- Modify any `master` branch scripts to make the CI pass — fix the scripts, not the CI gate

**Definition of Done:**
- `.github/workflows/qa-production.yml` exists on `main` branch
- Workflow triggers on push to `master`
- Workflow runs `npm run audit:production:fast` (no build step — too slow for CI)
- First run completes successfully
- PR status check appears on next push

**QA commands:**
```bash
# After pushing to main:
gh run list --limit 3
gh run view <run-id> --log
```

---

### T12 — Bitunix Evidence Triage

**Priority:** P2  
**Estimated scope:** 1 session (investigation + data fix)  
**Risk:** Medium (evidence JSON modifications)

**Objective:**  
Resolve the 8 unverified facts and 7 manual review flags in `src/data/evidence/bitunix.json`. This is the worst-rated exchange in the dataset (EMS 59/100). Options:
- **Option A (recommended):** Manually fact-check bitunix.com for the 8 unverified fields; update `currentValue` and `confidenceScore` with verified data
- **Option B:** Remove bitunix from the site pending a full re-review
- **Option C:** Mark as `"lowConfidencePage": true` in `exchanges.json` and add a prominent disclaimer

Owner must decide which option. If Option A: provide specific source URLs for each verified fact.

**Files likely touched:**
```
src/data/evidence/bitunix.json           ← fact updates (owner-approved values only)
src/data/exchanges.json                  ← possibly add lowConfidence flag
```

**Dependencies:** None

**Definition of Done:**
- bitunix EMS ≥ 65 (fair) OR page removed/flagged pending review
- `npm run validate:evidence` shows 0 manual_review_required for bitunix
- `npm run audit:production` still exits 0

**QA commands:**
```bash
npm run validate:evidence:verbose
npm run evidence:governance:markdown
npm run audit:production
```

---

### T13 — Yandex Metrika Event Tracking Audit & Verification

**Priority:** P2  
**Estimated scope:** 2–3 sessions  
**Risk:** Low (analytics only; no content or affiliate changes)

**Objective:**  
Audit and verify all Yandex Metrika event tracking in `Analytics.astro` and across exchange pages. Counter ID: `109562447`. Confirm all 10 events fire correctly:

| Event | Where expected to fire |
|---|---|
| `exchange_click` | Any click on an exchange card or listing |
| `affiliate_outbound` | Any click through to an affiliate URL |
| `compare_click` | Comparison table interaction |
| `bonus_copy` | PromoCodeBox copy button click |
| `faq_expand` | FAQ accordion item open |
| `scroll_50` | Page scroll past 50% |
| `scroll_90` | Page scroll past 90% |
| `verdict_interaction` | Verdict block interaction (tab, expand) |
| `country_page_visit` | Any `/country/` page load |
| `coin_page_visit` | Any `/coin/` page load |

**Checklist:**
- Confirm `ym(109562447, 'reachGoal', '<event>')` calls present and correctly named
- Confirm no duplicate events fire on single interaction
- Confirm CTA coverage: hero CTA, sidebar CTA, mid-flow CTA, mobile CTA all tracked
- Confirm `affiliate_outbound` includes exchange slug as a parameter
- Confirm Analytics bridge fires for both dev and production
- Build and deploy a test page if needed for live browser verification

**Files likely touched:**
```
src/components/Analytics.astro           ← counter ID + scroll events + bridge
src/pages/exchanges/[slug].astro         ← CTA click handlers, PromoCodeBox
src/components/PromoCodeBox.astro        ← bonus_copy event
src/components/FAQBlock.astro            ← faq_expand event
src/pages/country/[slug].astro           ← country_page_visit
src/pages/coin/[slug].astro              ← coin_page_visit
```

**Dependencies:** None (standalone audit)

**Definition of Done:**
- All 10 events verified firing in Yandex Metrika real-time report
- No duplicate events per interaction
- All affiliate CTAs tracked with `affiliate_outbound` + exchange slug param
- `npm run build` exits 0
- `npm run audit:production` exits 0

**QA commands:**
```bash
npm run build
# Manual: Open Yandex Metrika real-time dashboard, trigger each event, confirm receipt
npm run audit:production
```

---

### T14 — Telegram Owner Report Integration

**Priority:** P2  
**Estimated scope:** 1 session  
**Risk:** Low (new script only; no content changes)

**Objective:**  
Create a script `scripts/telegram-owner-report.mjs` that sends a Telegram message to the owner summarizing the current QA gate status. Triggered manually (`npm run report:telegram`) or automatically after a successful CI run. Message must include:
- Build status + page count
- QA gate result (PASS/FAIL/PASS_WITH_WARNINGS)
- Count of P1 issues
- EMS score + bonus publish-safe count
- Affiliate status
- Screenshot status (available / missing counts)

**Security:**
- Telegram bot token and chat ID must be stored as GitHub Actions secrets (never hardcoded or committed)
- Local dev: read from `.env.local` (already in `.gitignore`)
- Do not log credentials to stdout or reports

**Files likely touched:**
```
scripts/telegram-owner-report.mjs        ← NEW
package.json                             ← add report:telegram script
.env.local.example                       ← add TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID placeholders
.github/workflows/qa-production.yml     ← add optional Telegram step (after T11)
```

**Dependencies:** T11 (GitHub Actions workflow) — Telegram step should slot into existing workflow

**Definition of Done:**
- `npm run report:telegram` sends message to owner Telegram chat
- Message renders all required metrics
- Token is NOT in any committed file
- `npm run audit:production` still exits 0

---

## 5. Recommended Task Order

```
Sprint 02 sequence:

Week 1 (data quality first):
  T07B → T09 → T10

  T07B first: fix Binance governance bug so EMS scores are accurate
  T09 second: live verification gives us real bonus data to work with
  T10 third: schema fix is safe and doesn't depend on T09 results

Week 2 (template expansion):
  T08 (Binance) → T08 (MEXC) → T08 (OKX)

  One exchange per session. Binance first (highest traffic + 8 screenshots already).
  MEXC second (immutable affiliate, high priority affiliate partner).
  OKX third.

Week 3 (screenshots + automation):
  T07 → T11 → T13

  T07: screenshot harvest for MEXC/OKX/Bitget
  T11: CI integration (use stable scripts from weeks 1–2)
  T13: Yandex Metrika audit (standalone, no dependencies)

Week 4 (backlog cleanup):
  T12 → T14

  T12: bitunix triage (owner decision required before implementation)
  T14: Telegram reporting (optional; requires T11 complete)
```

**Rationale for this order:**
- Data quality before template expansion — applying the Gold Standard template to exchanges with wrong EMS scores wastes effort
- Schema fix (T10) is fast and eliminates an ongoing Google risk — do it early
- CI integration (T11) should use fully-stable scripts — do it after data work settles
- Screenshots can happen in parallel with template work but don't block it

---

## 6. Task Sizing Summary

| Task | Priority | Scope | Risk | Depends On |
|---|---|---|---|---|
| T07 — Screenshot Harvest | P1 | 3–4 sessions | Low | — |
| T07B — Binance Gov. Bug | P1 | 1 session | Very Low | — |
| T08 — Gold Standard Template (×3) | P1 | 3–5 sessions | Medium | T07B |
| T09 — Bonus Re-Verification | P1 | 2–3 sessions | Medium | — |
| T10 — Schema Safety Fix | P1 | 1 session | Low | — |
| T11 — GitHub Actions CI | P1 | 1–2 sessions | Low | — |
| T12 — Bitunix Triage | P2 | 1 session | Medium | — |
| T13 — Yandex Metrika Audit | P2 | 2–3 sessions | Low | — |
| T14 — Telegram Reports | P2 | 1 session | Low | T11 |

**Total estimated sprint scope:** 15–21 sessions  
**Suggested sprint cut:** P1 tasks only (T07/T07B/T08/T09/T10/T11) = 11–16 sessions for a well-bounded sprint

---

## 7. What NOT to Do in Sprint 02

| Item | Reason |
|---|---|
| Refactor `[slug].astro` into components | Trigger is 3+ exchanges with walkthroughs; not met until T08 is complete for ≥ 3 exchanges |
| Merge `main` and `master` branches | Two-branch structure is intentional and must not be collapsed |
| Auto-approve bonus amount updates | Every `bonus_amount.currentValue` change requires explicit owner approval |
| Modify the MEXC affiliate URL | MEXC affiliate link is IMMUTABLE — no change without explicit written approval |
| Modify the Bybit affiliate URL | Bybit affiliate link is IMMUTABLE — no change without explicit written approval |
| Run live bonus verification in CI | CI must use dry-run only (`bonus:landing:plan`, never `bonus:landing:live:*`) |
| Commit raw screenshots | Screenshots are gitignored; never commit image files from `/public/screenshots/` |
| Change `confidenceScore` manually | Scores must come from live verification results, not editorial judgment |
| Change `conflictStatus` without live data | Only the bonus landing verification pipeline may change this field |
| Start Sprint 03 tasks | No template components, no TypeScript schema update, no multi-region verification |
| Use `Out-File` for YAML on Windows | Always use `[System.IO.File]::WriteAllBytes()` for YAML file writes on Windows |
| Add `.env` or secrets to committed files | All secrets go to GitHub Actions secrets or `.env.local` (gitignored) |

---

## 8. Sprint 02 QA Gate Contract

The QA gate exit code must remain 0 throughout Sprint 02. Every PR or session must end with:

```bash
npm run audit:production
```

Expected output at Sprint 02 start:
```
✅ PASS_WITH_WARNINGS — 6/6 steps passed, exit 0
P1 issues: 4
```

Expected output at Sprint 02 end:
```
✅ PASS — 6/6 steps passed, exit 0
P1 issues: 0
```

If any step causes `npm run audit:production` to exit non-zero:
1. **Stop immediately**
2. Identify the failing step
3. Revert the change that caused it
4. Document the failure before proceeding

---

## 9. Definition of Done — Sprint 02

Sprint 02 is complete when ALL of the following are true:

**Evidence quality:**
- [ ] At least 3 exchanges have `bonus_amount.conflictStatus: "verified"` (not "outdated")
- [ ] bitunix status resolved (Option A, B, or C — owner decides)
- [ ] Binance screenshot count correct in governance report (T07B)
- [ ] Bonus avg confidence ≥ 0.50 for at least 3 exchanges

**Template expansion:**
- [ ] Binance, MEXC, OKX each have `offerConfidenceScore` set in `exchanges.json`
- [ ] OfferRealism block renders for Binance, MEXC, OKX
- [ ] Binance, MEXC, OKX EMS ≥ 70 (Gold Standard threshold)

**Screenshots:**
- [ ] Bybit bonus screenshot recaptured as `.webp` (P1-05 cleared)
- [ ] `npm run audit:screenshots` shows 0 critical errors
- [ ] MEXC, OKX, Bitget each have ≥ 5 screenshots on disk

**Schema:**
- [ ] Product schema does not emit `offers.price` for exchanges with outdated bonus evidence (T10)

**Automation:**
- [ ] `npm run audit:production:fast` runs in GitHub Actions on every `master` push (T11)
- [ ] All 10 Yandex Metrika events verified firing (T13)

**Build:**
- [ ] `npm run build` exits 0
- [ ] `npm run audit:production` exits 0

---

## 10. Recommended First Task

**Start with T07B — Binance Screenshot Governance Discrepancy Investigation.**

Reason: It takes ≤ 1 session, is read-only, has zero risk, and its result affects every subsequent EMS score you'll look at. Fixing the governance script's counting bug means all future `evidence:governance:markdown` reports are trustworthy. Without this fix, you'd be evaluating Binance's template readiness against an under-counted EMS, and the Sprint 02 DoD check "Binance EMS ≥ 70" would be unreliable.

After T07B, move directly to T10 (schema safety fix) — one-session fix that eliminates a live Google risk with no dependencies.

---

## 11. Constraints and Safety Rules

*These apply for the entire Sprint 02 and are inherited from Sprint 01 owner instructions:*

- Never store passwords; never commit `.auth/`; never commit raw screenshots
- Never capture: withdrawal pages, API keys, security settings, documents, wallet addresses, QR codes, balances, personal info
- Blur sensitive data automatically; if sensitive content detected → skip and mark `manual_review_required`
- Never use `Out-File` for YAML files on Windows — always use `[System.IO.File]::WriteAllBytes()`
- DO NOT approve screenshots automatically
- DO NOT automatically rewrite site content without approval
- MEXC affiliate link is IMMUTABLE — never change without explicit approval
- Bybit affiliate link is IMMUTABLE — never change without explicit approval
- Do not merge `main` and `master` branches — two-branch structure is intentional
- If QA gate exits non-zero: stop, revert, document, report

---

*Sprint 02 Plan — CryptoBonusWorld*  
*Prepared: 2026-06-03 | Baseline: Sprint 01 COMPLETE | Branch: master*
