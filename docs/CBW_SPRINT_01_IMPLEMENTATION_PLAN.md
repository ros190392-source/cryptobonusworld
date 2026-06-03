# CBW Sprint 01 — Production Foundation: Implementation Plan

**Status:** PLAN — Approved for implementation  
**Prepared:** 2026-06-03  
**Author:** Master Owner / System Architect  
**Version:** 1.0  
**Branch target:** `master`  
**Prerequisite reads:** `docs/AI_CONTEXT_TRANSFER.md`, `docs/ARCHITECTURE_MAP.md`, `docs/QUICKSTART_AI_CONTEXT.md`

> **Note:** `docs/CBW_CURRENT_STATE_AUDIT.md` does not yet exist. All assumptions in this plan are
> derived from direct codebase inspection conducted on 2026-06-03. Key files inspected:
> `src/data/evidence/bybit.json`, `src/pages/exchanges/[slug].astro`,
> `src/pages/go/[exchange].astro`, `scripts/validate-bonuses.cjs`,
> `src/data/screenshot-registry.ts`, `src/data/article-blueprints.ts`.

---

## 1. Executive Summary

### 1.1 What Sprint 01 Will Achieve

Sprint 01 turns CryptoBonusWorld from a functional affiliate site into a **governed, auditable,
AI-operable production platform**. By the end of this sprint, every data claim on the site will be
traceable to an evidence source, every affiliate link will pass an automated integrity check, all
critical governance gaps will be closed with CI gates, and Bybit will serve as the reference
implementation of the Gold Standard page pattern.

Concretely, Sprint 01 delivers:

1. **Data validation foundation** — a validation layer that covers the full evidence chain
   (exchanges.json → evidence/facts[] → screenshots), not just the surface-level bonus amounts
2. **Affiliate routing integrity gate** — automated CI check that P1/P2 affiliate links are
   live and that MEXC/Bybit immutable links have not been tampered with
3. **Evidence governance v1** — formal staleness + confidence scoring gate on evidence `facts[]`,
   with a Telegram-reportable summary and human-review queue for low-confidence items
4. **Screenshot registry hardening** — captureUrls for all 14 exchanges, Bybit `.jpg` → `.webp`
   format correction, and a registry integrity CI gate
5. **Bybit Gold Standard page** — Bybit's exchange review page fully wired to evidence data,
   screenshots resolved, bonus facts flagged for re-verification, page compliant with the
   `exchange_review` blueprint
6. **Production QA gate** — single `npm run qa:production` command that CI can run as a
   pre-deploy check, aggregating all critical sub-checks into one pass/fail

### 1.2 Why This Order Is Correct

```
Task 01 (data validation)
  → required before Task 03 (evidence governance needs a validation layer)
  → required before Task 06 (QA gate calls the validation script)

Task 02 (affiliate routing gate)
  → independent of data layer; can run in parallel with Tasks 01/03
  → required before Task 06 (QA gate checks affiliate integrity)

Task 03 (evidence governance)
  → depends on Task 01 (needs the facts validation infrastructure)
  → required before Task 05 (Bybit hardening needs governance understanding)

Task 04 (screenshot registry)
  → depends on Task 03 (evidence status drives registry status)
  → independent implementation but sequenced after Task 03 for data integrity

Task 05 (Bybit Gold Standard)
  → depends on Tasks 03 + 04 (evidence governance + registry must be stable)
  → this is the integration test of the whole data stack

Task 06 (Production QA gate)
  → depends on ALL previous tasks (aggregates all sub-checks)
  → this is the final integration layer
```

### 1.3 What Must NOT Be Done in Sprint 01

The following are explicitly out of scope and must not be touched:

- **Do not migrate src/ page architecture** — `[slug].astro` template is not being replaced
- **Do not implement Yandex Metrika events** — deferred to Sprint 02
- **Do not enable multi-region proxy verification** — GLOBAL only in Sprint 01
- **Do not publish new exchange review content** — blueprint compliance auditing only
- **Do not change any affiliate link values** — especially MEXC and Bybit (immutable)
- **Do not run `bonus:approve:all`** — all approvals must be manual per item
- **Do not commit to `main` branch** — all Sprint 01 work goes to `master`
- **Do not modify `.github/workflows/`** — CI workflow changes are Sprint 02+
- **Do not restructure the `src/data/` directory** — additive only

---

## 2. Current State Assumptions (Repo-Based)

### 2.1 What the Direct Inspection Found

| System | Status | Finding |
|---|---|---|
| `/go/[exchange].astro` | ✅ Well-built | GEO routing, SubID, UTM, analytics, noindex, JS-302 — production ready |
| `validate-bonuses.cjs` | ⚠️ Partial | Validates `exchanges.json` surface fields; does NOT validate evidence `facts[]` array |
| Evidence `facts[]` schema | ❌ No gate | Rich data (confidenceScore, conflictStatus, manualReviewRequired) exists but is never formally validated |
| Bybit bonus screenshot | ⚠️ Format mismatch | File exists as `.jpg`; evidence JSON correctly references `.jpg`; screenshot registry generates `.webp` path — registry wrong |
| Bybit bonus facts | 🚨 Low confidence | `confidenceScore: 0.27`, `conflictStatus: "outdated"`, `manualReviewRequired: true` — needs re-verification |
| Screenshot registry captureUrls | ❌ Incomplete | Only binance/okx/mexc have `captureUrl` set; 11 exchanges null |
| Production QA gate | ❌ Missing | No single CI-runnable command aggregates all critical checks |
| `docs/CBW_CURRENT_STATE_AUDIT.md` | ❌ Missing | File referenced in user instructions does not exist; create in Sprint 01 as a byproduct |
| Article blueprint audit | ✅ Built | `npm run articles:audit` runs; 13 pages audited, 79 issues (warnings, exit 0) |
| Telegram monitoring | ✅ Active | 6h cron on `main` branch via `telegram-reports.yml` |
| Build | ✅ Green | 207 pages, Astro 4.15, clean build |

### 2.2 Existing Files/Systems That Will Be Reused (No Replacement)

| File | Role in Sprint 01 |
|---|---|
| `scripts/validate-bonuses.cjs` | Extended by Task 01 (not replaced) |
| `src/data/evidence/bybit.json` | Modified in Task 05 (format fix, not structural change) |
| `src/data/screenshot-registry.ts` | Extended in Task 04 (add captureUrls) |
| `src/pages/go/[exchange].astro` | Read-only; referenced in Task 02 audit |
| `src/data/evidence/index.ts` | Used by new validation scripts via import |
| `src/data/evidence/_schema.ts` | Read in Task 01 to drive validation rules |
| `scripts/audit-screenshot-registry.mjs` | Called by Task 06 QA gate |
| `scripts/audit-affiliate-links.mjs` | Extended by Task 02 |
| `scripts/affiliate-link-inventory.mjs` | Used by Task 02 integrity gate |
| `package.json` | Scripts added in Tasks 01–06 |

### 2.3 Missing Files/Systems That Must Be Created

| File | Created In | Purpose |
|---|---|---|
| `scripts/validate-evidence-facts.mjs` | Task 01 | Validates evidence `facts[]` quality gate |
| `scripts/check-affiliate-integrity.mjs` | Task 02 | Checks P1/P2 links live; immutability guard for MEXC/Bybit |
| `scripts/evidence-governance-report.mjs` | Task 03 | Aggregated governance dashboard (confidence, staleness, manual review queue) |
| `scripts/qa-production.mjs` | Task 06 | Master production QA gate — runs all sub-checks |
| `docs/CBW_CURRENT_STATE_AUDIT.md` | Task 06 | Created as a byproduct of QA gate first run |
| `reports/evidence-governance-report.{json,md}` | Task 03 | Generated at runtime |
| `reports/qa-production-report.{json,md}` | Task 06 | Generated at runtime |

---

## 3. Sprint 01 Task Breakdown

---

### Task 01 — Data Validation Foundation

**Objective:**  
Extend the existing validation layer to cover the full evidence chain: from `exchanges.json` (already
covered) down to the `facts[]` array in each evidence JSON. This creates the data-integrity baseline
that all other tasks depend on.

**Exact files to inspect:**
- `scripts/validate-bonuses.cjs` — understand current scope and exit codes
- `src/data/evidence/_schema.ts` — understand the type contract for ExchangeEvidence
- `src/data/evidence/bybit.json` — primary reference for `facts[]` structure
- `src/data/evidence/index.ts` — understand how evidence is loaded at build time

**Exact files to create:**
- `scripts/validate-evidence-facts.mjs` — ESM script, validates all 14 evidence JSONs

**Exact files to modify:**
- `package.json` — add `validate:evidence`, `validate:evidence:verbose`, `validate:all` scripts

**Dependencies:** None (first task).

**Implementation steps:**

1. Read `src/data/evidence/bybit.json` to confirm the `facts[]` schema in use:
   ```
   facts[].field            string   — unique field key
   facts[].currentValue     any      — the current claim value
   facts[].confidenceScore  number   — 0.0–1.0
   facts[].conflictStatus   string   — "ok" | "outdated" | "conflict" | "unknown"
   facts[].manualReviewRequired boolean
   facts[].lastChecked      string   — ISO date or YYYY-MM
   facts[].officialSourceKey string | undefined
   facts[].officialSourceUrl string | undefined
   ```

2. Write `scripts/validate-evidence-facts.mjs` with these checks:
   - **CHECK 1 — Low confidence:** `confidenceScore < 0.5` → WARNING per field
   - **CHECK 2 — Very low confidence:** `confidenceScore < 0.3` → ERROR per field
   - **CHECK 3 — Outdated facts:** `conflictStatus === "outdated"` → WARNING
   - **CHECK 4 — Manual review required:** `manualReviewRequired === true` → WARNING
   - **CHECK 5 — Stale lastChecked:** `daysSince(lastChecked) > 30` for bonus fields → WARNING; `> 90` → ERROR
   - **CHECK 6 — Missing source:** `!officialSourceKey && !officialSourceUrl` on required fields → WARNING
   - **CHECK 7 — Screenshot status vs disk:** for each screenshot with `status: "available"`, verify the `path` resolves to an actual file under `public/`
   - **CHECK 8 — Screenshot format mismatch:** warn when `path` ends in `.jpg` and note it should be `.webp`
   
   Exit codes:
   ```
   0 = no issues
   1 = warnings only (non-blocking)
   2 = errors present (blocking in strict mode)
   ```
   
   Flags: `--verbose`, `--fail-on-errors`, `--exchange {slug}` (single exchange), `--json`

3. Add npm scripts:
   ```json
   "validate:evidence": "node scripts/validate-evidence-facts.mjs",
   "validate:evidence:verbose": "node scripts/validate-evidence-facts.mjs --verbose",
   "validate:evidence:strict": "node scripts/validate-evidence-facts.mjs --fail-on-errors",
   "validate:all": "node scripts/validate-bonuses.cjs && node scripts/validate-evidence-facts.mjs"
   ```

**Commands to run (after implementation):**
```powershell
npm run validate:evidence:verbose
npm run validate:all
npm run build
```

**Expected output:**
```
📋  Evidence Facts Validation
──────────────────────────────────────────────────────────
  14 evidence files scanned
  Errors: 2–4 (expected: bybit bonus low confidence, etc.)
  Warnings: 15–25 (outdated facts, missing sources)
  Screenshot path issues: 1 (bybit bonus .jpg)

  Reports written:
    reports/evidence-facts-validation.{json,md}
```

**Definition of Done:**
- [ ] `npm run validate:evidence` runs and exits 0 or 1 (never crashes)
- [ ] bybit bonus low-confidence facts correctly surfaced as errors/warnings
- [ ] bybit bonus screenshot `.jpg` path flagged
- [ ] `npm run build` still passes (207 pages)
- [ ] Report written to `reports/evidence-facts-validation.{json,md}`

**Rollback plan:**  
Script is additive only (new file + new npm scripts). Removing
`scripts/validate-evidence-facts.mjs` and the 4 npm script lines from `package.json` fully reverts.
No source code touched.

**Risk level:** 🟢 LOW — new script only, no existing file modification.

---

### Task 02 — Affiliate Routing /go Layer

**Objective:**  
The `/go/[exchange].astro` redirect layer already exists and is sophisticated. This task adds an
automated **integrity gate** that: (a) verifies no P1/P2 exchange has a placeholder or dead
affiliate URL; (b) verifies MEXC and Bybit affiliate URLs have not been modified since baseline;
(c) logs all results so Telegram can report affiliate health.

**Exact files to inspect:**
- `src/pages/go/[exchange].astro` — understand current implementation (GEO, SubID, analytics)
- `src/data/exchanges.json` — check `affiliateUrl` and `affiliateLinks.default` fields for all 14 exchanges
- `scripts/audit-affiliate-links.mjs` — understand current scope
- `scripts/affiliate-link-inventory.mjs` — understand report format

**Exact files to create:**
- `scripts/check-affiliate-integrity.mjs` — immutability guard + placeholder check + P1/P2 liveness

**Exact files to modify:**
- `package.json` — add `affiliate:integrity`, `affiliate:integrity:strict` scripts

**Dependencies:** None (independent of Task 01).

**Implementation steps:**

1. Read `src/data/exchanges.json` to confirm affiliate URL structure:
   ```json
   {
     "slug": "bybit",
     "affiliateUrl": "https://partner.bybit.com/b/CRYPTOBONUSW",
     "affiliateLinks": {
       "default": "https://partner.bybit.com/b/CRYPTOBONUSW",
       "geo": { ... }
     }
   }
   ```

2. Write `scripts/check-affiliate-integrity.mjs`:

   **Immutability baseline** — define expected fingerprints inline:
   ```javascript
   const IMMUTABLE_LINKS = {
     bybit: 'https://partner.bybit.com/b/CRYPTOBONUSW',
     mexc:  'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus',
   };
   ```
   Check: if current `affiliateUrl` !== baseline → CRITICAL error (not just warning).

   **Placeholder check** — for all P1 exchanges (binance, okx, mexc, bitget):
   - If `affiliateUrl` is `'#'`, `''`, `null`, or `undefined` → CRITICAL
   - If `affiliateLinks.default` is placeholder → CRITICAL

   **P2 placeholder check** — same as above but severity WARNING not CRITICAL.

   **Domain validation** — affiliate URL must use HTTPS and be a known domain:
   ```javascript
   const ALLOWED_DOMAINS = [
     'partner.bybit.com', 'www.bybit.com',
     'www.mexc.com',
     'okx.com', 'www.okx.com',
     'accounts.binance.com', 'www.binance.com',
     'partner.bitget.com', 'www.bitget.com',
     'bingxdao.com', 'www.bingx.com',
     'www.gate.io',
     'www.kucoin.com',
     'www.htx.com',
     'www.coinex.com',
     'phemex.com',
     'www.bitunix.com',
     'www.lbank.com', 'www.lbkex.net',
     'www.coinbase.com',
   ];
   ```

   **Exit codes:** 0 = all OK, 1 = warnings, 2 = CRITICAL issues (immutability violation or P1 placeholder)

   Flags: `--verbose`, `--fail-on-errors`, `--json`

3. Add npm scripts:
   ```json
   "affiliate:integrity": "node scripts/check-affiliate-integrity.mjs",
   "affiliate:integrity:strict": "node scripts/check-affiliate-integrity.mjs --fail-on-errors"
   ```

**Commands to run:**
```powershell
npm run affiliate:integrity:verbose   # full check with details
npm run affiliate:audit:strict        # existing check — must still pass
npm run build
```

**Expected output:**
```
🔒  Affiliate Integrity Check
──────────────────────────────────────────────────────────
  14 exchanges checked
  Immutability: ✅ MEXC OK  ✅ Bybit OK
  P1 placeholders: 0
  P2 placeholders: 0
  Domain violations: 0
  Result: ✅ PASS
```

**Definition of Done:**
- [ ] Script runs and exits 0 on clean baseline
- [ ] Intentionally mutating MEXC URL in a test branch triggers exit code 2
- [ ] P1 placeholder triggers exit code 2
- [ ] `npm run affiliate:audit:strict` (existing) still passes
- [ ] `npm run build` passes

**Rollback plan:** Remove `scripts/check-affiliate-integrity.mjs` and 2 npm script lines. No
existing files modified.

**Risk level:** 🟢 LOW — new script only, read-only access to exchanges.json.

---

### Task 03 — Evidence Governance v1

**Objective:**  
Create a unified evidence governance report that surfaces all low-confidence facts, stale
verifications, and manual review backlogs across all 14 exchanges. This report feeds the Telegram
monitoring system and creates the human review queue for data owners.

**Exact files to inspect:**
- All 14 `src/data/evidence/*.json` files — scan `facts[]` arrays
- `scripts/evidence-update-queue.mjs` — understand current queue format
- `scripts/bonus-telegram-report.mjs` — understand how to integrate new report into Telegram

**Exact files to create:**
- `scripts/evidence-governance-report.mjs` — generates governance dashboard

**Exact files to modify:**
- `package.json` — add `evidence:governance`, `evidence:governance:verbose` scripts

**Dependencies:** Task 01 (shares validation infrastructure, but can be developed in parallel
since both are new scripts).

**Implementation steps:**

1. Scan all 14 evidence JSONs and aggregate:
   - Facts with `confidenceScore < 0.5` (grouped by exchange, sorted by score ASC)
   - Facts with `conflictStatus: "outdated"` or `"conflict"` (grouped by exchange)
   - Facts with `manualReviewRequired: true` (grouped by exchange)
   - Facts where `lastChecked` is > 30 days ago
   - Screenshots with `status: "available"` but file missing from disk
   - Screenshots with `status: "needs_manual_capture"` (manual backlog)
   - Screenshots with `.jpg` path (should be `.webp`)

2. Compute per-exchange governance score:
   ```
   score = (facts with confidenceScore >= 0.7) / (total facts)
   ```
   Tier: A (≥0.8), B (0.6–0.8), C (0.4–0.6), D (<0.4)

3. Write report to `reports/evidence-governance-report.{json,md}`:
   ```markdown
   # Evidence Governance Report
   Generated: {date}

   ## Summary
   | Exchange | Score | Tier | Low Confidence | Outdated | Manual Review |
   | bybit    | 0.62  | B    | 5 facts        | 4 facts  | 1 fact        |
   ...

   ## Action Queue — Manual Review Required
   | Exchange | Field         | Confidence | Status   | Last Checked |
   | bybit    | bonus_amount  | 0.27       | outdated | 2026-05-20   |
   ...

   ## Screenshot Issues
   | Exchange | Category | Issue              |
   | bybit    | bonus    | .jpg format (→ .webp needed) |
   | bybit    | fees     | needs_manual_capture |
   ...
   ```

4. Add npm scripts:
   ```json
   "evidence:governance": "node scripts/evidence-governance-report.mjs",
   "evidence:governance:verbose": "node scripts/evidence-governance-report.mjs --verbose"
   ```

**Commands to run:**
```powershell
npm run evidence:governance:verbose
npm run build
```

**Expected output (first run):**
```
📊  Evidence Governance Report
  14 exchanges assessed
  Tier A (≥0.8): 8–10 exchanges
  Tier B (0.6–0.8): 2–4 exchanges
  Tier C/D (<0.6): 1–2 exchanges (bybit bonus is the main flag)

  Manual review queue: ~5–10 items (bybit bonus + other stale facts)
  Screenshot issues: ~15 items (needs_manual_capture across exchanges)
```

**Definition of Done:**
- [ ] Script runs, exits 0 (report always generated regardless of issues)
- [ ] bybit bonus `confidenceScore: 0.27` surfaced in action queue
- [ ] bybit bonus `.jpg` format issue surfaced in screenshot issues
- [ ] Per-exchange governance scores computed and in report
- [ ] `npm run build` passes

**Rollback plan:** Remove new script + 2 npm script lines. No existing files modified.

**Risk level:** 🟢 LOW — read-only access to evidence JSONs, new script only.

---

### Task 04 — Screenshot Registry v1 Hardening

**Objective:**  
Complete the screenshot registry by: (a) adding `captureUrl` for the 11 exchanges that currently
have `null`; (b) correcting the Bybit bonus entry format expectation (`.jpg` vs `.webp`);
(c) establishing a CI gate that blocks merges when registry entries for P1 exchanges are misconfigured.

**Exact files to inspect:**
- `src/data/screenshot-registry.ts` — lines 1–80 (REGISTRY_CAPTURE_URLS and buildFullRegistry)
- `src/data/evidence/bybit.json` screenshots section — confirm actual file paths
- `public/screenshots/bybit/` — list actual disk files (found: `.jpg` for bonus, `.webp` for others)
- `scripts/audit-screenshot-registry.mjs` — understand existing 10 checks

**Exact files to modify:**
- `src/data/screenshot-registry.ts` — add captureUrls for 11 exchanges in REGISTRY_CAPTURE_URLS

**Exact files to create:** None (audit script already exists; QA gate in Task 06 calls it).

**Dependencies:** Task 03 (evidence governance identifies the bybit `.jpg` issue formally).

**Implementation steps:**

1. Read `src/data/screenshot-registry.ts` REGISTRY_CAPTURE_URLS section. Identify the 11
   exchanges with no captureUrl entries:
   `bingx, bitget, bitunix, coinbase, coinex, gate-io, htx, kucoin, lbank, phemex, bybit`
   (Note: bybit may or may not be present — confirm by reading the file)

2. For each missing exchange, add a `captureUrl` entry using the PUBLIC pages that don't require
   auth. Use these base URLs per exchange:

   ```typescript
   bingx:    { registration: 'https://bingx.com/en/register/', bonus: 'https://bingx.com/en/activity/', ... }
   bitget:   { registration: 'https://www.bitget.com/en/register', bonus: 'https://www.bitget.com/en/activity/... }
   bybit:    { registration: 'https://www.bybit.com/en/register/', bonus: 'https://www.bybit.com/en/promo/global/welcome-gifts/?affiliate_id=75062' }
   coinbase: { registration: 'https://coinbase.com/signup', ... }
   coinex:   { registration: 'https://www.coinex.com/register', ... }
   gate-io:  { registration: 'https://www.gate.io/signup', ... }
   htx:      { registration: 'https://www.htx.com/en-us/register/', ... }
   kucoin:   { registration: 'https://www.kucoin.com/ucenter/signup', ... }
   lbank:    { registration: 'https://www.lbank.com/sign-up/', ... }
   phemex:   { registration: 'https://phemex.com/register', ... }
   bitunix:  { registration: 'https://www.bitunix.com/register', ... }
   ```
   
   Only add PUBLIC category captureUrls. Leave AUTH_SENSITIVE/AUTHED entries with `null`.

3. **Bybit bonus format correction:** In `src/data/evidence/bybit.json`, the bonus screenshot
   path is `/screenshots/bybit/bonus/global-desktop-2026-06.jpg`. The file exists on disk as
   `.jpg`. The screenshot registry currently generates a `.webp` expected path for this entry.
   
   **Resolution:** Do NOT rename the file (breaking change). Instead, update the registry
   `REGISTRY_CAPTURE_URLS` for bybit bonus to record that the current capture is `.jpg` and
   flag it for re-capture as `.webp` in the next cycle. Update the bybit bonus entry in the
   registry with:
   ```typescript
   notes: 'Current file is .jpg (global-desktop-2026-06.jpg). Re-capture as .webp in next cycle.'
   ```
   The `outputPath` in the registry should match what evidence says (`.jpg`), not generate a
   `.webp` path that doesn't exist.

4. Re-run `npm run screenshots:registry:audit` — the bybit bonus error should resolve (was
   reporting missing `.webp` file). Verify the 1 critical error disappears.

**Commands to run:**
```powershell
npm run screenshots:registry:audit
npm run screenshots:registry:check   # should now exit 0 (was exit 1 due to bybit)
npm run build
```

**Expected output after fix:**
```
📋  Screenshot Registry Audit
  152 entries  |  ✅ 7 available  |  ❌ 126 missing  |  ⏰ 0 stale
  Files: 15 on disk  |  Missing: 0  |  Orphans: 9
  Issues: 🚨 0  ⚠️ 139  ℹ️ 9

  ✅ No errors (previously: 1 error for bybit bonus missing .webp)
```

**Definition of Done:**
- [ ] `npm run screenshots:registry:check` exits 0 (was previously exit 1)
- [ ] captureUrls added for all 14 exchanges (registration + bonus categories at minimum)
- [ ] bybit bonus format issue documented in registry notes (not silently ignored)
- [ ] `npm run build` passes

**Rollback plan:** Revert `src/data/screenshot-registry.ts` changes via `git checkout`. No
other files modified.

**Risk level:** 🟡 MEDIUM — modifies `src/data/screenshot-registry.ts` which is imported by
audit scripts. TypeScript build will catch any syntax errors. The file is not used in Astro page
rendering (data-layer only), so any issue will surface at build time, not production.

---

### Task 05 — Bybit Gold Standard Page Hardening

**Objective:**  
Make Bybit's exchange review page the reference implementation of a Gold Standard evidence-backed
review. This means: (a) all evidence `facts[]` for Bybit are either verified or explicitly flagged
as pending re-verification; (b) screenshots are correctly referenced; (c) the page satisfies the
`exchange_review` blueprint requirements as far as current evidence allows; (d) the bybit page
produces zero errors from `validate:evidence`, `evidence:governance`, and
`screenshots:registry:check`.

**Exact files to inspect:**
- `src/data/evidence/bybit.json` — current state (facts, screenshots, sources)
- `src/pages/exchanges/[slug].astro` — full template to understand what data fields it reads
- `src/data/exchanges.json` — Bybit entry (affiliateUrl, bonus fields, etc.)
- `reports/article-blueprint-audit.md` — current blueprint compliance for Bybit's page

**Exact files to modify:**
- `src/data/evidence/bybit.json` — update facts confidence flags, add pending verification notes
- `src/data/exchanges.json` — verify Bybit's entry is complete and accurate

**Exact files to create:** None.

**Dependencies:** Tasks 01, 03, 04 must be complete (validation scripts must exist to test
against).

**Implementation steps:**

1. **Audit bybit.json facts — classify each field:**
   
   Run `npm run validate:evidence:verbose -- --exchange bybit` (from Task 01) and collect all
   issues. Expected findings:
   
   | Field | Current State | Action |
   |---|---|---|
   | `bonus_amount` | confidenceScore: 0.27, conflictStatus: outdated, manualReviewRequired: true | Add `reviewNote` field: "Re-verify via bonus:verify:bybit before next build" |
   | `bonus_min_deposit` | confidenceScore: 0.27, conflictStatus: outdated | Same |
   | `bonus_requires_deposit` | confidenceScore: 0.27, conflictStatus: outdated | Same |
   | `bonus_expiry_days` | confidenceScore: 0.27, conflictStatus: outdated | Same |
   | All fee fields | confidenceScore: 0.76, conflictStatus: ok | No action needed |
   | KYC fields | confidenceScore: 0.76, conflictStatus: ok | No action needed |

2. **Update bybit.json — bonus fact annotations:**
   For each low-confidence bonus fact, add a `reviewNote` field (not part of the schema contract
   but stored as documentation):
   ```json
   {
     "field": "bonus_amount",
     "currentValue": 30000,
     "confidenceScore": 0.27,
     "conflictStatus": "outdated",
     "manualReviewRequired": true,
     "reviewNote": "SPRINT01: Needs live re-capture via npm run bonus:verify:bybit. Do not display as confirmed fact until confidenceScore >= 0.5."
   }
   ```

3. **Update bybit.json — screenshot section:**
   Verify the bonus screenshot entry is accurate:
   ```json
   "bonus": {
     "status": "available",
     "path": "/screenshots/bybit/bonus/global-desktop-2026-06.jpg",
     "capturedAt": "2026-06",
     "notes": "SPRINT01: File is .jpg format. Re-capture as .webp in next screenshot cycle. See screenshot registry for details."
   }
   ```

4. **Update bybit.json — sources completeness:**
   Verify all source entries have `lastAccessed` within 90 days. If any source is stale, add
   `"staleNote": "Last accessed {date} — re-verify before next publish cycle."`.

5. **Generate Bybit content brief:**
   ```powershell
   node scripts/generate-content-brief.mjs --type exchange_review --exchange bybit
   ```
   Review `reports/content-briefs/bybit-exchange_review.md` — this becomes the Gold Standard
   reference brief.

6. **Run blueprint audit — check Bybit's page:**
   ```powershell
   npm run articles:audit:verbose
   ```
   Bybit is served via `[slug].astro` template. Review which of the 11 blueprint checks currently
   fail for the Bybit page. Document these as "known compliance gaps" in the content brief —
   they are content gaps, not code gaps, and belong to Sprint 02 editorial work.

7. **Run full validation stack against Bybit:**
   ```powershell
   npm run validate:evidence:verbose
   npm run evidence:governance:verbose
   npm run screenshots:registry:audit
   ```
   Verify bybit issues are surfaced clearly and categorized correctly (not errors where they
   should be warnings, etc.).

**Commands to run:**
```powershell
npm run validate:evidence:verbose
npm run evidence:governance:verbose
node scripts/generate-content-brief.mjs --type exchange_review --exchange bybit
npm run articles:audit:verbose
npm run build
```

**Expected output:**
```
Bybit validation:
  LOW CONFIDENCE (warnings): 4 bonus facts
  OUTDATED (warnings): 4 bonus facts
  MANUAL REVIEW (warnings): 1 bonus fact
  SCREENSHOT: bonus .jpg format flagged
  SCREENSHOT: fees needs_manual_capture (3 screenshots)
  BUILD: green
```

**Definition of Done:**
- [ ] `bybit.json` bonus facts have `reviewNote` fields documenting the re-verification backlog
- [ ] bybit bonus screenshot `.jpg` → note added for re-capture
- [ ] `reports/content-briefs/bybit-exchange_review.md` generated
- [ ] `validate:evidence:verbose` correctly classifies bybit issues without crashing
- [ ] `evidence:governance:verbose` includes bybit in action queue
- [ ] `npm run build` passes

**Rollback plan:** `git checkout src/data/evidence/bybit.json` and `git checkout src/data/exchanges.json`.
These are data files; Astro reads them at build time. A bad value would be caught at build.

**Risk level:** 🟡 MEDIUM — modifies `bybit.json` which is loaded at build time.
Any malformed JSON will fail the build immediately (detectable before commit).
Run `npm run build` immediately after every `bybit.json` edit.

---

### Task 06 — Production QA Gate

**Objective:**  
Create a single `npm run qa:production` command that runs all critical sub-checks in sequence,
produces a unified pass/fail verdict, and writes a QA report. This command becomes the
pre-deploy gate and is referenced by CI workflows in Sprint 02.

**Exact files to inspect:**
- `package.json` — understand all existing scripts that produce exit codes
- `scripts/audit-screenshot-registry.mjs` — confirm it has `--fail-on-errors` flag
- `scripts/audit-affiliate-links.mjs` — confirm `--fail-on-issues` flag
- `scripts/audit-schema.mjs` — confirm `--fail-on-errors` flag
- `scripts/audit-seo-titles.mjs` — confirm `--fail-on-ci` flag

**Exact files to create:**
- `scripts/qa-production.mjs` — master QA gate
- `docs/CBW_CURRENT_STATE_AUDIT.md` — generated as byproduct of first QA gate run

**Exact files to modify:**
- `package.json` — add `qa:production`, `qa:production:verbose`, `qa:report` scripts

**Dependencies:** All previous tasks (Tasks 01–05 must be complete; QA gate calls their scripts).

**Implementation steps:**

1. Write `scripts/qa-production.mjs`:

   **Checks to run in order (each sub-check is one phase):**
   ```
   Phase 1 — Build validation
     → Run: astro check (TypeScript)
     → Severity: ERROR if fails

   Phase 2 — Data validation
     → Run: validate-bonuses.cjs
     → Run: validate-evidence-facts.mjs --fail-on-errors
     → Severity: ERROR if exit code 2; WARNING if exit code 1

   Phase 3 — Affiliate integrity
     → Run: check-affiliate-integrity.mjs --fail-on-errors
     → Severity: ERROR if MEXC/Bybit links modified or P1 placeholder

   Phase 4 — Screenshot registry
     → Run: audit-screenshot-registry.mjs (exit 0 even with warnings)
     → Severity: ERROR if any 'missing_file' where status='available'

   Phase 5 — Schema check
     → Run: audit-schema.mjs (warning-only in Sprint 01)
     → Severity: WARNING

   Phase 6 — SEO titles
     → Run: audit-seo-titles.mjs --fail-on-ci
     → Severity: ERROR if CI-level failures

   Phase 7 — Evidence governance
     → Run: evidence-governance-report.mjs
     → Severity: WARNING only (informational in Sprint 01)

   Phase 8 — Affiliate audit
     → Run: audit-affiliate-links.mjs
     → Severity: WARNING

   Phase 9 — Internal links
     → Run: audit-internal-links.mjs
     → Severity: WARNING
   ```

   **Exit codes:**
   ```
   0 = PASS (all phases either OK or WARNING)
   1 = WARNINGS (non-blocking issues found)
   2 = FAIL (one or more ERROR-level phases failed)
   ```

2. **Report output:** Write `reports/qa-production-report.{json,md}` with:
   - Overall verdict: PASS / PASS_WITH_WARNINGS / FAIL
   - Per-phase results
   - Total error count, warning count
   - Timestamp and build version

3. **Create `docs/CBW_CURRENT_STATE_AUDIT.md`** on the first QA gate run:
   This document records the state of the project at Sprint 01 completion. Write it manually
   (not auto-generated) using the QA gate output as source data. Sections:
   - Sprint 01 completion date
   - QA gate result (first run output)
   - Known issues carried into Sprint 02
   - Systems confirmed production-ready
   - Data confidence baseline (per exchange, from governance report)

4. Add npm scripts:
   ```json
   "qa:production": "node scripts/qa-production.mjs",
   "qa:production:verbose": "node scripts/qa-production.mjs --verbose",
   "qa:report": "node scripts/qa-production.mjs --report-only"
   ```

**Commands to run:**
```powershell
npm run qa:production:verbose   # full run
npm run build                   # verify build still clean
```

**Expected first-run output:**
```
🏭  Production QA Gate
══════════════════════════════════════════════════════════

  Phase 1 — Build validation         ✅ PASS
  Phase 2 — Data validation          ⚠️ WARN  (bybit bonus low confidence)
  Phase 3 — Affiliate integrity      ✅ PASS
  Phase 4 — Screenshot registry      ✅ PASS  (bybit .jpg issue resolved in Task 04)
  Phase 5 — Schema check             ⚠️ WARN  (2 pre-existing warnings)
  Phase 6 — SEO titles               ✅ PASS
  Phase 7 — Evidence governance      ⚠️ WARN  (~5 items in manual review queue)
  Phase 8 — Affiliate audit          ✅ PASS
  Phase 9 — Internal links           ⚠️ WARN

══════════════════════════════════════════════════════════
  Verdict: PASS_WITH_WARNINGS
  Errors: 0  |  Warnings: 4 phases
  Report: reports/qa-production-report.{json,md}
```

**Definition of Done:**
- [ ] `npm run qa:production` runs end-to-end without crashing
- [ ] Exit code is 0 (PASS) or 1 (PASS_WITH_WARNINGS) — never 2 on clean baseline
- [ ] `reports/qa-production-report.{json,md}` written
- [ ] `docs/CBW_CURRENT_STATE_AUDIT.md` created after first successful run
- [ ] `npm run build` passes

**Rollback plan:** Remove `scripts/qa-production.mjs` and 3 npm script lines. No existing
files modified. `docs/CBW_CURRENT_STATE_AUDIT.md` can stay (documentation only).

**Risk level:** 🟢 LOW — new script only. Orchestrates existing scripts, does not modify any
source files.

---

## 4. Implementation Order

**Recommended execution sequence:**

```
Day 1:  Task 01 (Data validation foundation)
        Task 02 (Affiliate integrity gate)     ← can run in parallel with Task 01
Day 2:  Task 03 (Evidence governance)
Day 3:  Task 04 (Screenshot registry hardening)
Day 4:  Task 05 (Bybit Gold Standard)
Day 5:  Task 06 (Production QA gate)
        → Create docs/CBW_CURRENT_STATE_AUDIT.md
        → Sprint 01 complete
```

**Why this order reduces risk:**

1. **Tasks 01 and 02 first** — they are purely additive (new scripts, no existing file changes).
   If they break something (they won't, but if), they can be reverted without affecting
   Tasks 03–06.

2. **Task 03 after Task 01** — evidence governance builds on the same evidence-reading
   infrastructure. Running Task 01 first confirms that the evidence JSON parsing works correctly
   before Task 03 adds aggregate scoring on top.

3. **Task 04 before Task 05** — screenshot registry corrections (Task 04) must be in place
   before hardening Bybit's page (Task 05). Bybit's page hardening will call the registry audit
   to confirm the `.jpg` issue is resolved.

4. **Task 05 after Tasks 01, 03, 04** — the Bybit hardening is the integration test. Running it
   last among the data tasks means all validation scripts are available and the registry is
   corrected. If Tasks 01–04 are clean, Task 05 should produce no surprises.

5. **Task 06 last** — the QA gate aggregates all outputs from Tasks 01–05. Running it last
   confirms the sum of all parts is coherent. If any Task 01–05 broke something, Task 06 will
   surface it.

**Commit strategy:** One commit per completed task. This makes rollback granular.

---

## 5. Files Protection List

The following files must NOT be modified without explicit approval from the project owner.
Any PR touching these files requires a separate review.

### 🔴 IMMUTABLE — Never modify without explicit written owner approval

| File | Reason |
|---|---|
| `src/data/exchanges.json` `.affiliateUrl` for MEXC | Immutable affiliate link |
| `src/data/exchanges.json` `.affiliateUrl` for Bybit | Immutable affiliate link |
| `src/data/exchanges.json` `.affiliateLinks.default` for MEXC | Immutable |
| `src/data/exchanges.json` `.affiliateLinks.default` for Bybit | Immutable |
| `.github/workflows/telegram-reports.yml` (on `main`) | Active production CI |
| `.github/workflows/critical-alerts.yml` (on `main`) | Active production CI |

### 🟡 PROTECTED — Require explicit task authorization before modifying

| File | Reason |
|---|---|
| `src/pages/exchanges/[slug].astro` | Core exchange page template; changes affect all 14 pages |
| `src/pages/go/[exchange].astro` | Affiliate redirect layer; any error breaks affiliate tracking |
| `src/data/evidence/index.ts` | Evidence registry; import errors break entire build |
| `src/data/evidence/_schema.ts` | Type contract; changes may break 14 JSON files |
| `src/data/exchange-screenshots.ts` | Legacy registry; used in production components |
| `astro.config.mjs` | Core build config |
| `tsconfig.json` | TypeScript config |
| `package.json` | Scripts and dependencies |

### 🟢 SPRINT 01 AUTHORIZED MODIFICATIONS

| File | Authorized Change |
|---|---|
| `src/data/screenshot-registry.ts` | Add captureUrls for 11 exchanges; fix bybit bonus notes |
| `src/data/evidence/bybit.json` | Add `reviewNote` fields; update screenshot notes |
| `package.json` | Add new npm scripts only (no dependency changes) |

### 🟢 SPRINT 01 NEW FILES (CREATE ONLY)

```
scripts/validate-evidence-facts.mjs
scripts/check-affiliate-integrity.mjs
scripts/evidence-governance-report.mjs
scripts/qa-production.mjs
docs/CBW_CURRENT_STATE_AUDIT.md
```

---

## 6. QA Checklist

Run this checklist after completing all 6 tasks. Each item must pass before Sprint 01 is
declared complete.

### 6.1 Build Check
```powershell
npm run build
```
- [ ] Exit code 0
- [ ] Page count: 207 pages (unchanged)
- [ ] Build time: < 30 seconds
- [ ] No TypeScript errors
- [ ] No Astro warnings about missing files

### 6.2 Data Validation Check
```powershell
npm run validate:all
```
- [ ] `validate-bonuses.cjs` exits 0 or 1 (never 2)
- [ ] `validate-evidence-facts.mjs` runs and produces a report
- [ ] Bybit bonus low-confidence facts correctly identified (not silently skipped)
- [ ] No crashes or unhandled exceptions

### 6.3 Affiliate Link Check
```powershell
npm run affiliate:integrity
npm run affiliate:audit:strict
```
- [ ] `affiliate:integrity` exits 0 (all immutable links intact)
- [ ] `affiliate:audit:strict` exits 0 (existing check passes)
- [ ] MEXC affiliate URL matches baseline exactly
- [ ] Bybit affiliate URL matches baseline exactly
- [ ] No P1 exchange has placeholder `#` URL

### 6.4 Schema Check
```powershell
npm run schema:check
```
- [ ] Exits 0 (2 pre-existing warnings are acceptable; no new errors introduced)

### 6.5 Screenshot / Evidence Check
```powershell
npm run screenshots:registry:check
npm run evidence:governance:verbose
```
- [ ] `screenshots:registry:check` exits 0 (bybit `.jpg` issue resolved — was previously exit 1)
- [ ] `evidence:governance` report generated
- [ ] Bybit bonus confidence issue in action queue (not silently missing)
- [ ] Screenshot manual capture backlog documented (fees, mobile_app, proof_of_reserves)

### 6.6 Broken Links Check
```powershell
npm run affiliate:audit
npm run links:audit
```
- [ ] No broken affiliate links
- [ ] Internal link audit produces report
- [ ] No unexpected new warnings vs pre-sprint baseline

### 6.7 Telegram / Reporting Check

> Note: This check does NOT send to Telegram. It verifies the report generation scripts run.

```powershell
npm run bonus:telegram-report
npm run affiliate:telegram-report
npm run screenshots:telegram-report
npm run monitor:telegram:summary
```
- [ ] All 4 scripts run and exit 0
- [ ] No crashes or missing report file errors

### 6.8 Production QA Gate
```powershell
npm run qa:production
```
- [ ] Exit code 0 or 1 (PASS or PASS_WITH_WARNINGS)
- [ ] Exit code is NOT 2 (no ERRORs on clean baseline)
- [ ] `reports/qa-production-report.{json,md}` written
- [ ] All 9 phases complete (no phase crashes)

### 6.9 Bybit Gold Standard Verification
```powershell
node scripts/generate-content-brief.mjs --type exchange_review --exchange bybit
npm run validate:evidence:verbose
npm run articles:audit:verbose
```
- [ ] Bybit content brief generated at `reports/content-briefs/bybit-exchange_review.md`
- [ ] All bybit bonus low-confidence facts have `reviewNote` fields
- [ ] Articles audit runs without crash for bybit page

---

## 7. Final Recommendation

**First task to execute after this plan is approved:**

> **→ Task 01 — Data Validation Foundation**

**Why Task 01 first:**

Task 01 is the only task that creates new infrastructure (the `validate-evidence-facts.mjs`
script) without touching any existing production file. It is the highest-confidence first step:
nothing can break, the change is fully reversible, and it immediately delivers value by surfacing
the bybit bonus confidence issue formally.

Additionally, Task 01's output (the evidence facts validation script) is called by:
- Task 03 (evidence governance builds on it)
- Task 06 (QA gate calls it in Phase 2)

Starting with Task 01 front-loads the shared infrastructure that the rest of the sprint depends on.

**Recommended first command:**

```powershell
# Read the current facts[] structure before writing the validator
Get-Content "C:\projects\CryptoBonusWorld\src\data\evidence\bybit.json" | ConvertFrom-Json `
  | Select-Object -ExpandProperty facts | ConvertTo-Json -Depth 4 | Select-Object -First 40
```

This confirms the exact `facts[]` schema before writing a single line of Task 01 code.

---

*End of Sprint 01 Implementation Plan*  
*Document version 1.0 — generated 2026-06-03*  
*Next document: `docs/CBW_CURRENT_STATE_AUDIT.md` — to be created after Task 06 first run*
