> **Note:** This is a mirror of docs/AI_CONTEXT_TRANSFER.md. The canonical copy is at docs/AI_CONTEXT_TRANSFER.md. Last synced: 2026-06-03.

# CryptoBonusWorld â€” AI Context Transfer Document
> Auto-generated handoff document for continuing development in a new AI session.
> Generated: 2026-06-03

---

## 1. Project Overview

**CryptoBonusWorld** is an Astro 4.15 SSG (static site generator) affiliate bonus aggregator deployed at **cryptobonusworld.com**.

- **Stack:** Astro 4.15, TypeScript, ESM modules
- **Pages:** 207 static pages
- **Exchanges covered:** 14
- **Purpose:** Aggregates and compares crypto exchange signup bonuses, fees, and referral offers for affiliate monetization
- **Repository root:** `C:\projects\CryptoBonusWorld`
- **Node scripts:** All in `scripts/` as `.mjs` (ESM) or `.cjs`; run via `npm run <script>`
- **Reports output:** `reports/` directory (gitignored, generated at runtime)

---

## 2. Repository Structure

```
C:\projects\CryptoBonusWorld\
â”œâ”€â”€ .github/
â”‚   â””â”€â”€ workflows/
â”‚       â”œâ”€â”€ critical-alerts.yml       â† manual dispatch CI (on main branch)
â”‚       â”œâ”€â”€ production-monitor.yml    â† production monitoring (on main branch)
â”‚       â””â”€â”€ telegram-reports.yml     â† scheduled 6h reports (on main branch)
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ AI_CONTEXT_TRANSFER.md       â† this file
â”‚   â”œâ”€â”€ ARCHITECTURE_MAP.md
â”‚   â””â”€â”€ QUICKSTART_AI_CONTEXT.md
â”œâ”€â”€ public/
â”‚   â””â”€â”€ screenshots/                 â† served screenshot assets
â”œâ”€â”€ reports/                         â† GITIGNORED â€” generated at runtime
â”‚   â”œâ”€â”€ screenshot-registry-audit.{json,md}
â”‚   â”œâ”€â”€ article-blueprint-audit.{json,md}
â”‚   â”œâ”€â”€ content-briefs/
â”‚   â”œâ”€â”€ evidence-snapshots/
â”‚   â”œâ”€â”€ screenshot-refresh-queue.json
â”‚   â”œâ”€â”€ bonus-update-proposals.json
â”‚   â”œâ”€â”€ evidence-update-queue.md
â”‚   â””â”€â”€ affiliate-link-inventory.{json,md}
â”œâ”€â”€ scripts/                         â† all automation scripts
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ data/
â”‚   â”‚   â”œâ”€â”€ evidence/                â† per-exchange evidence JSONs + index.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ _schema.ts           â† ExchangeEvidence TypeScript interface
â”‚   â”‚   â”‚   â”œâ”€â”€ index.ts             â† getExchangeEvidence(), getAllEvidenceSlugs()
â”‚   â”‚   â”‚   â”œâ”€â”€ bybit.json
â”‚   â”‚   â”‚   â”œâ”€â”€ binance.json
â”‚   â”‚   â”‚   â””â”€â”€ ...14 total JSON files
â”‚   â”‚   â”œâ”€â”€ article-blueprints.ts    â† Blueprint system v1 (10 types)
â”‚   â”‚   â”œâ”€â”€ exchange-screenshots.ts  â† EXISTING registry (DO NOT replace)
â”‚   â”‚   â”œâ”€â”€ screenshot-registry.ts   â† NEW registry v1 (152 entries)
â”‚   â”‚   â”œâ”€â”€ verification-regions.ts  â† 7 regions (1 enabled, 6 disabled)
â”‚   â”‚   â””â”€â”€ ...other data files
â”‚   â”œâ”€â”€ pages/                       â† Astro page components (207 pages)
â”‚   â””â”€â”€ ...
â”œâ”€â”€ package.json
â”œâ”€â”€ astro.config.mjs
â””â”€â”€ tsconfig.json
```

**Key data files:**

| File | Purpose |
|---|---|
| `src/data/evidence/{exchange}.json` | Per-exchange evidence (screenshots, bonuses, fees) |
| `src/data/evidence/index.ts` | Evidence registry â€” `getExchangeEvidence()`, `getAllEvidenceSlugs()` |
| `src/data/evidence/_schema.ts` | TypeScript schema for `ExchangeEvidence` |
| `src/data/screenshot-registry.ts` | Screenshot Registry v1 â€” 152 entries, 14 exchanges |
| `src/data/exchange-screenshots.ts` | Existing screenshot registry (pre-v1, DO NOT replace) |
| `src/data/article-blueprints.ts` | Article Blueprint System v1 â€” 10 blueprint types |
| `src/data/verification-regions.ts` | Region config â€” GLOBAL enabled, PL/DE/RU/TR/IN/NG disabled |

---

## 3. Branch Strategy

**CRITICAL â€” Two-branch structure. Confusing but intentional. Never change this.**

| Branch | Purpose | What it contains |
|---|---|---|
| `main` | GitHub default branch | ONLY `.github/workflows/` YAML files. Sparse â€” no code. |
| `master` | All actual code | Everything: `src/`, `scripts/`, `docs/`, `public/`, `package.json`, etc. |

**Why this structure exists:**
- GitHub requires the default branch to host Actions workflows for the UI to show them correctly
- All code lives on `master` for historical/operational reasons
- CI workflows on `main` use `ref: master` to checkout actual code before running scripts

**Rules:**
- **Never commit code to `main`**
- **Never commit workflow YAML directly to `master`** (use `main` for workflow changes)
- `.gitattributes` exists on **both** branches with `*.yml text eol=lf`

**YAML file handling on Windows:**
- Always use `[System.IO.File]::WriteAllBytes()` with explicit LF bytes for YAML files
- Never use `Out-File` â€” it produces CRLF line endings which break GitHub Actions
- This is a known pain point; every YAML commit must be verified LF-clean

---

## 4. Exchange Coverage

**14 exchanges total:**

| Slug | Exchange | Priority |
|---|---|---|
| `binance` | Binance | P1 |
| `okx` | OKX | P1 |
| `mexc` | MEXC | P1 |
| `bitget` | Bitget | P1 |
| `bybit` | Bybit | P2 |
| `bingx` | BingX | P2 |
| `gate-io` | Gate.io | P2 |
| `kucoin` | KuCoin | P2 |
| `htx` | HTX | P2 |
| `coinex` | CoinEx | P3 |
| `phemex` | Phemex | P3 |
| `bitunix` | Bitunix | P3 |
| `lbank` | LBank | P3 |
| `coinbase` | Coinbase | P3 |

**Priority tiers:**
- **P1:** binance, okx, mexc, bitget â€” highest traffic, highest affiliate revenue, first to update
- **P2:** bybit, bingx, gate-io, kucoin, htx â€” secondary priority
- **P3:** coinex, phemex, bitunix, lbank, coinbase â€” lower volume, less frequent updates

---

## 5. Evidence System

**Purpose:** Per-exchange structured data capturing bonus amounts, screenshot status, fees, and verification history.

**Location:** `src/data/evidence/{exchange}.json` (14 files)

**Schema:** Defined in `src/data/evidence/_schema.ts` as `ExchangeEvidence`

**Key `screenshots` section structure:**
```json
{
  "screenshots": {
    "{category}": {
      "status": "missing" | "available" | "outdated" | "not_applicable",
      "path": "/screenshots/binance/registration/global-desktop-2025-11.webp" | null,
      "capturedAt": "2025-11-15T10:00:00Z" | null,
      "geo": "GLOBAL",
      "device": "desktop",
      "notes": "Human-readable notes"
    }
  }
}
```

**Registry exports from `src/data/evidence/index.ts`:**
- `getExchangeEvidence(slug: string): ExchangeEvidence | undefined`
- `getAllEvidenceSlugs(): string[]`
- `getEvidenceRegistry(): Record<string, ExchangeEvidence>`

**Standard screenshot categories (10 canonical):**
`registration`, `bonus_claim`, `trading_interface`, `deposit`, `withdrawal`, `kyc`, `affiliate_landing`, `fee_schedule`, `mobile_app`, `support`

---

## 6. Screenshot Pipeline Architecture

**Screenshot lifecycle:**
```
Capture request
  â†’ harvest-exchange-screenshots.mjs (Playwright capture)
  â†’ process-screenshot.mjs (resize + optimize to WebP)
  â†’ annotate-screenshot.mjs (overlays, labels)
  â†’ approve-screenshots.mjs (human approval gate)
  â†’ evidence JSON update (status: available, path set)
  â†’ screenshot-registry.ts (outputPath populated)
  â†’ public/screenshots/{exchange}/{category}/
  â†’ Served in Astro components
```

**Safety levels** (controls automation eligibility):

| Level | Meaning |
|---|---|
| `PUBLIC` | No auth required, safe to automate |
| `AFFILIATE_PUBLIC` | Public page with affiliate ref code in URL |
| `AUTH_SAFE` | Requires auth but safe to screenshot (blurred/redacted) |
| `AUTH_SENSITIVE` | Requires auth; sensitive data â€” manual review required |
| `AUTHED` | Requires auth session |
| `SKIP` | Not captured for this exchange |
| `MANUAL` | Must be captured manually, no automation |

**Path convention:** `/screenshots/{exchange}/{category}/{geo}-{device}-{YYYY-MM}.webp`

**Example:** `/screenshots/binance/registration/global-desktop-2025-11.webp`

**Two registries coexist (intentional):**
- `src/data/exchange-screenshots.ts` â€” existing pre-v1 registry. **DO NOT replace or delete.**
- `src/data/screenshot-registry.ts` â€” NEW Registry v1, additive layer, 152 entries

**Key scripts:**
- `scripts/harvest-exchange-screenshots.mjs` â€” Playwright capture
- `scripts/process-screenshot.mjs` â€” resize/optimize
- `scripts/annotate-screenshot.mjs` â€” overlays
- `scripts/approve-screenshots.mjs` â€” approval queue
- `scripts/orchestrate-screenshot-capture.mjs` â€” full orchestration (capture + process + annotate)
- `scripts/validate-screenshot-quality.mjs` â€” quality validation
- `scripts/generate-screenshot-review.mjs` â€” review report

---

## 7. Screenshot Registry Status

**Registry v1 summary (as of last audit):**
- **152 total entries** (14 exchanges Ã— 10 standard categories + 4 extended categories for binance/okx/mexc)
- **7 available** (have disk files)
- **126 missing** (no disk file yet)
- **0 stale** (none past staleness threshold)

**Run audit:** `npm run screenshots:registry:audit`
**Output:** `reports/screenshot-registry-audit.{json,md}`

**Known issues:**
1. **Bybit bonus file missing from disk** â€” `bybit.json` evidence marks bonus screenshot as `available` but the file does not exist on disk. P1 issue.
2. **9 orphan disk files** â€” screenshot files on disk not referenced by the registry
3. **139 warnings** â€” missing `captureUrls` and `selectors` for 11 exchanges (only binance/okx/mexc have these configured)

**Phase 2 work needed:**
- Add `captureUrl` values for all 11 remaining exchanges
- Add `selector` (CSS selector) values for all registry entries

---

## 8. Bonus Verification System

**Purpose:** Live Playwright-driven capture of affiliate landing pages to verify bonus amounts haven't changed.

**Core script:** `scripts/verify-bonus-capture.mjs`

**What it does:**
1. Navigates to the affiliate URL for each exchange
2. Records the full redirect chain
3. Extracts bonus text from the landing page
4. Takes a screenshot and computes SHA-256 hash
5. Compares hash with previous capture
6. If changed â†’ adds to `reports/screenshot-refresh-queue.json`
7. Saves evidence snapshot to `reports/evidence-snapshots/`
8. If bonus amount mismatch â†’ adds to `reports/bonus-update-proposals.json`

**Region support:**
- `--region GLOBAL` (default, enabled)
- `--all-regions` (loops through all enabled regions)
- Other regions disabled until proxy configured

**Approval workflow:**
```
bonus-update-proposals.json (status: pending_approval)
  â†’ npm run bonus:proposals   (list pending)
  â†’ npm run bonus:approve     (approve specific)
  â†’ npm run bonus:approve:all (approve all â€” use with caution)
  â†’ Evidence JSON updated
  â†’ Next build picks up new bonus amount
```

**NEVER auto-approve bonus proposals without human review.**

**Key scripts:**
- `scripts/verify-bonus-capture.mjs` â€” main verification
- `scripts/approve-bonus-updates.mjs` â€” approval management
- `scripts/evidence-snapshot.mjs` â€” snapshot index management

---

## 9. Affiliate Link Architecture

**Affiliate links are embedded in exchange data files and/or a dedicated affiliate-links data file.**

**Audit scripts:**
- `scripts/audit-affiliate-links.mjs` â€” checks all affiliate links for validity/reachability
- `scripts/affiliate-link-inventory.mjs` â€” generates inventory report

**Reports:**
- `reports/affiliate-link-inventory.{json,md}` â€” full inventory

**IMMUTABLE LINKS â€” NEVER change without explicit written approval:**
- **MEXC affiliate link** â€” immutable
- **Bybit affiliate link** â€” immutable

These two links have special contractual/operational significance. Any modification requires explicit approval from the project owner.

---

## 10. Telegram Monitoring System

**Purpose:** Automated status reports and critical alerts sent to a Telegram channel.

**Scripts:**
- `scripts/bonus-telegram-report.mjs` â€” bonus verification summary
- `scripts/affiliate-telegram-report.mjs` â€” affiliate link status
- `scripts/screenshots-telegram-report.mjs` â€” screenshot coverage status
- `scripts/monitor-telegram-summary.mjs` â€” combined severity summary (daily/weekly)
- `scripts/monitor-telegram-critical.mjs` â€” critical-only alerts; exits 0 silently if all OK

**Severity levels used in reports:**
- `OK âœ…` â€” no issues
- `INFO â„¹ï¸` â€” informational
- `WARNING âš ï¸` â€” action needed
- `CRITICAL ðŸš¨` â€” urgent action required

**Analytics:**
- **Yandex Metrika counter ID:** `109562447`

**GitHub Secrets required:**
- `TELEGRAM_BOT_TOKEN` â€” bot authentication
- `TELEGRAM_CHAT_ID` â€” target chat

**Local testing:** Use `.env` file (see `.env.example`). Script `scripts/lib/telegram.mjs` auto-loads `.env`.

---

## 11. Evidence Snapshots

**Purpose:** Point-in-time snapshots of bonus verification results for audit trail and change detection.

**Script:** `scripts/evidence-snapshot.mjs`

**Snapshot JSON schema:**
```json
{
  "exchange": "binance",
  "region": "GLOBAL",
  "locale": "en-US",
  "affiliateUrl": "https://...",
  "finalUrl": "https://...",
  "redirectChain": ["https://..."],
  "expectedBonus": "up to $600 USDT",
  "detectedBonus": "up to $600 USDT",
  "matchStatus": "match" | "mismatch" | "unknown",
  "severity": "OK" | "INFO" | "WARNING" | "CRITICAL",
  "screenshotChanged": false,
  "capturedAt": "2026-01-15T10:00:00Z",
  "screenshotHash": "sha256:abc123..."
}
```

**Output location:** `reports/evidence-snapshots/{exchange}-{region}-{YYYY-MM-DD}.json`

**Index files:**
- `reports/evidence-snapshots/index.json` â€” machine-readable index
- `reports/evidence-snapshots/index.md` â€” human-readable index

**Rebuild index:** `npm run evidence:snapshot:index`

---

## 12. Region Verification Architecture

**File:** `src/data/verification-regions.ts`

**Regions:**

| Code | Status | Locale | Proxy env var |
|---|---|---|---|
| `GLOBAL` | **Enabled** | `en-US` | None |
| `PL` | Disabled | `pl-PL` | `PROXY_PL_URL` |
| `DE` | Disabled | `de-DE` | `PROXY_DE_URL` |
| `RU` | Disabled | `ru-RU` | `PROXY_RU_URL` |
| `TR` | Disabled | `tr-TR` | `PROXY_TR_URL` |
| `IN` | Disabled | `en-IN` | `PROXY_IN_URL` |
| `NG` | Disabled | `en-NG` | `PROXY_NG_URL` |

**Exports:**
- `getEnabledRegions()` â€” returns only enabled regions (currently `[GLOBAL]`)
- `getRegion(code)` â€” returns region config by code

**Proxy verification flow:**
```
For non-GLOBAL region:
  1. Check proxyEnvKey in environment
  2. If missing â†’ skip with status "proxy_not_configured"
  3. If present â†’ launch Playwright with proxy URL
```

This is a safe fallback â€” missing proxies never cause errors, just skip verification for that region.

---

## 13. CI Workflows

**All workflows live on the `main` branch. They check out `master` for actual code.**

**`telegram-reports.yml`** (scheduled)
- Trigger: every 6 hours (`0 */6 * * *`)
- Steps: generate all reports â†’ send 4 Telegram messages
- Uses `ref: master` for checkout

**`critical-alerts.yml`** (manual dispatch)
- Trigger: `workflow_dispatch` (manual)
- Steps: generate bonus + affiliate reports â†’ send critical-only Telegram alert
- Exits 0 silently if no critical issues

**`production-monitor.yml`** (monitoring)
- Trigger: schedule-based production monitoring
- Details: see workflow file on `main` branch

**Required secrets in GitHub:**
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

**Optional proxy secrets:**
- `PROXY_PL_URL`, `PROXY_DE_URL`, `PROXY_RU_URL`, `PROXY_TR_URL`, `PROXY_IN_URL`, `PROXY_NG_URL`

---

## 14. SEO / Schema System

**Purpose:** Auditing and maintaining SEO quality across all 207 pages.

**Scripts:**
- `scripts/audit-schema.mjs` â€” JSON-LD structured data audit
- `scripts/audit-seo-titles.mjs` â€” title tag and meta description audit
- `scripts/audit-freshness.mjs` â€” content freshness audit
- `scripts/audit-internal-links.mjs` â€” internal link coverage audit
- `scripts/seo-issue-intake.mjs` â€” SEO issue triage (supports `--source google-search-console`)

**Staleness threshold:** 90 days (content older than this triggers a freshness warning)

**SEO intake statuses:** `new`, `classified`, `needs_manual_review`, `resolved`

**npm run shortcuts:**
- `npm run seo:titles` â€” write title audit report
- `npm run seo:check` â€” CI-friendly title check
- `npm run schema:audit` â€” verbose schema audit
- `npm run schema:check` â€” CI-friendly schema check
- `npm run freshness:audit` â€” freshness report
- `npm run links:audit` â€” internal link audit
- `npm run seo:intake` â€” SEO issue intake

---

## 15. Article Blueprint System (v1 â€” added 2026-06-03)

**Purpose:** Defines required content architecture for all page types. Enables auditing pages for completeness and generating content briefs.

**File:** `src/data/article-blueprints.ts`

**10 Blueprint types:**

| Type | Description |
|---|---|
| `exchange_review` | Full exchange review page (14 required sections, 3 optional) |
| `bonus_review` | Bonus-specific review page |
| `comparison` | Exchange vs exchange comparison |
| `country_exchange_guide` | Country-specific exchange guide |
| `category_page` | Category landing (e.g., "best futures exchanges") |
| `how_to_guide` | Step-by-step how-to content |
| `fee_guide` | Fee structure deep-dive |
| `kyc_guide` | KYC/verification guide |
| `p2p_guide` | P2P trading guide |
| `futures_guide` | Futures/derivatives guide |

**`exchange_review` blueprint requirements:**
- 14 required sections (defined in `SectionSpec[]`)
- 3 optional sections
- `EvidenceRequirement[]` â€” what evidence must be verified before publishing
- `ScreenshotRequirement[]` â€” which screenshot categories are required
- `SchemaRequirement[]` â€” JSON-LD schemas that must be present
- `InternalLinkTarget[]` â€” required internal links

**Audit:** `npm run articles:audit` â†’ `reports/article-blueprint-audit.{json,md}`

**Content brief generator:** `npm run articles:brief:binance` â†’ `reports/content-briefs/binance-exchange_review.md`

**Generic brief generator:** `npm run articles:brief` (requires `--type` and `--exchange` flags)

---

## 16. Intelligence Monitor System (v1)

**Purpose:** Unified severity-based monitoring that aggregates all system signals into single Telegram reports.

**Scripts:**
- `scripts/monitor-telegram-summary.mjs` â€” daily/weekly combined summary of all subsystems
- `scripts/monitor-telegram-critical.mjs` â€” critical-only; exits 0 silently if all OK (suitable for CI)

**Severity levels:**

| Level | Icon | Meaning |
|---|---|---|
| `OK` | âœ… | No issues |
| `INFO` | â„¹ï¸ | Informational, no action needed |
| `WARNING` | âš ï¸ | Action needed soon |
| `CRITICAL` | ðŸš¨ | Urgent â€” bonus mismatch, broken link, etc. |

**npm scripts:**
- `npm run monitor:telegram:summary` â€” send combined summary
- `npm run monitor:telegram:critical` â€” send critical-only (or exit quietly)

---

## 17. Important npm Scripts

### Build
| Script | Purpose | Notes |
|---|---|---|
| `dev` | Astro dev server | Local development |
| `build` | Astro production build | Must always succeed; 207 pages |
| `preview` | Preview production build locally | |

### Audit
| Script | Purpose | Notes |
|---|---|---|
| `audit` | Exchange data audit | |
| `audit:json` | Exchange audit JSON output | |
| `audit:content` | Content quality audit | |
| `audit:links` | Link audit | |
| `validate` | Bonus data validation | |

### Evidence
| Script | Purpose |
|---|---|
| `evidence:audit` | Evidence completeness audit |
| `evidence:queue` | Generate update queue |
| `evidence:queue:p1` | P1 exchanges only |
| `evidence:snapshot:index` | Rebuild snapshot index |

### Screenshots
| Script | Purpose | Notes |
|---|---|---|
| `screenshots:audit` | Exchange screenshots audit | |
| `screenshots:check` | CI-friendly screenshots check | |
| `screenshots:harvest` | Playwright capture | |
| `screenshots:approve` | Approval queue | |
| `screenshots:registry:audit` | Registry v1 audit | |
| `screenshots:registry:check` | CI registry check | |
| `screenshots:orchestrate` | Full orchestration | |
| `screenshots:quality` | Quality validation | |
| `screenshots:review` | Review report | |
| `screenshots:process` | Process/optimize | |
| `screenshots:annotate` | Add overlays | |

### Bonus Verification
| Script | Purpose | Notes |
|---|---|---|
| `bonus:verify` | Single exchange verify | |
| `bonus:verify:all` | All exchanges | Playwright required |
| `bonus:verify:stale` | Stale-only | |
| `bonus:proposals` | List pending proposals | |
| `bonus:approve` | Approve specific | |
| `bonus:approve:all` | Approve all | CAUTION |

### Affiliate
| Script | Purpose |
|---|---|
| `affiliate:audit` | Audit all affiliate links |
| `affiliate:check` | CI-friendly check |
| `affiliate:report` | Generate inventory report |
| `affiliate:inventory` | Inventory listing |

### SEO
| Script | Purpose |
|---|---|
| `seo:titles` | Write title audit |
| `seo:check` | CI title check |
| `schema:audit` | JSON-LD schema audit |
| `schema:check` | CI schema check |
| `freshness:audit` | Content freshness |
| `links:audit` | Internal links |
| `seo:intake` | SEO issue intake |

### Monitor / Telegram
| Script | Purpose |
|---|---|
| `monitor:telegram:summary` | Combined summary |
| `monitor:telegram:critical` | Critical-only |
| `bonus:telegram-report` | Bonus report |
| `affiliate:telegram-report` | Affiliate report |
| `screenshots:telegram-report` | Screenshots report |

### Articles
| Script | Purpose |
|---|---|
| `articles:audit` | Blueprint compliance audit |
| `articles:audit:verbose` | Verbose audit |
| `articles:brief` | Generate content brief |
| `articles:brief:binance` | Binance exchange review brief |

### Deploy
| Script | Purpose |
|---|---|
| `deploy` | Deploy to production |
| `indexnow` | Submit URLs to IndexNow |
| `indexnow:dry` | Dry run IndexNow |

---

## 18. Important Report Paths

All in `reports/` (gitignored â€” generated at runtime):

| Report | Generated by |
|---|---|
| `reports/screenshot-registry-audit.json` | `npm run screenshots:registry:audit` |
| `reports/screenshot-registry-audit.md` | `npm run screenshots:registry:audit` |
| `reports/article-blueprint-audit.json` | `npm run articles:audit` |
| `reports/article-blueprint-audit.md` | `npm run articles:audit` |
| `reports/content-briefs/{exchange}-{type}.md` | `npm run articles:brief:*` |
| `reports/evidence-snapshots/index.json` | `npm run evidence:snapshot:index` |
| `reports/evidence-snapshots/index.md` | `npm run evidence:snapshot:index` |
| `reports/evidence-snapshots/{exchange}-{region}-{date}.json` | `npm run bonus:verify:all` |
| `reports/screenshot-refresh-queue.json` | `npm run bonus:verify:all` |
| `reports/bonus-update-proposals.json` | `npm run bonus:verify:all` |
| `reports/evidence-update-queue.md` | `npm run evidence:queue:md` |
| `reports/affiliate-link-inventory.json` | `npm run affiliate:inventory:write` |
| `reports/affiliate-link-inventory.md` | `npm run affiliate:inventory:write` |

---

## 19. Pending High-Priority Tasks

1. **Implement Yandex Metrika event tracking (10 events)**
   - Counter ID: `109562447`
   - Events: `exchange_click`, `affiliate_outbound`, `compare_click`, `bonus_copy`, `faq_expand`, `scroll_50`, `scroll_90`, `verdict_interaction`, `country_page_visit`, `coin_page_visit`

2. **Apply article blueprints to existing exchange review pages**
   - Start with P1: binance, okx, mexc, bitget
   - Run `npm run articles:audit` to see current compliance
   - Generate briefs: `npm run articles:brief:binance`

3. **Add captureUrls + CSS selectors to screenshot registry**
   - Currently only binance/okx/mexc have `captureUrl` configured
   - 11 exchanges need `captureUrl` per category
   - All entries need `selector` (CSS selector to wait for)
   - This is Phase 2 of the Screenshot Registry v1

4. **Fix bybit bonus file**
   - `bybit.json` evidence marks bonus screenshot as `available` but file missing from disk
   - Either: capture the screenshot OR update evidence to `needs_manual_capture`
   - Bybit is P2 â€” not critical but should be resolved

5. **Configure proxy secrets for multi-region verification**
   - Add `PROXY_PL_URL`, `PROXY_DE_URL`, etc. to GitHub Secrets
   - Once added, those regions auto-enable in `getEnabledRegions()`

6. **Generate content briefs for all P1 exchanges**
   - `npm run articles:brief:binance`
   - Add similar scripts for okx, mexc, bitget

7. **Run full bonus verification for all exchanges**
   - `npm run bonus:verify:all`
   - Review proposals in `reports/bonus-update-proposals.json`
   - Approve verified changes

8. **Implement /methodology page**
   - Describe how bonuses are verified, evidence standards, update frequency

---

## 20. Known Technical Debt

| Issue | Details | Action |
|---|---|---|
| Two-branch confusion | `main` (workflows) vs `master` (code) is counterintuitive | DO NOT merge â€” intentional |
| CRLF/LF on Windows | PowerShell `Out-File` produces CRLF; GitHub Actions fails | Always use `[System.IO.File]::WriteAllBytes()` for YAML |
| Two screenshot registries | `exchange-screenshots.ts` (v0) and `screenshot-registry.ts` (v1) coexist | v1 is additive, not a replacement |
| Placeholder npm scripts | Some `npm run` commands reference scripts that may not fully implement all flags | Check script before assuming full implementation |
| reports/ gitignored | All audit output is ephemeral â€” regenerate before acting on stale data | |
| 139 registry warnings | Missing captureUrls/selectors in screenshot registry for 11 exchanges | Phase 2 work |

---

## 21. Current Production Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Screenshots not auto-captured | HIGH | Manual process; no CI automation for capture |
| Bonus amounts change frequently | HIGH | Verify before publishing; run `bonus:verify:all` |
| Bybit bonus file missing from disk | MEDIUM | File evidence says available but file not present |
| No automated CI for bonus verification | MEDIUM | Telegram reports via cron are monitoring-only; no auto-update |
| Stale content after 90 days | MEDIUM | `freshness:audit` detects; manual update required |
| Bybit affiliate link | HIGH | Immutable; any change breaks affiliate tracking |
| MEXC affiliate link | HIGH | Immutable; any change breaks affiliate tracking |

---

## 22. Active Workflows

**`telegram-reports.yml`** (on `main` branch, scheduled)
- Schedule: `0 */6 * * *` â€” every 6 hours
- Steps:
  1. Checkout `master` code
  2. `npm ci`
  3. `npm run bonus:verify:all` â†’ generate snapshot
  4. `npm run affiliate:report` â†’ generate inventory
  5. `npm run screenshots:report` â†’ generate audit
  6. `npm run bonus:telegram-report -- --send`
  7. `npm run affiliate:telegram-report -- --send`
  8. `npm run screenshots:telegram-report -- --send`
  9. `npm run monitor:telegram:summary -- --send`

**`critical-alerts.yml`** (on `main` branch, manual dispatch)
- Trigger: `workflow_dispatch`
- Steps:
  1. Checkout `master` code
  2. `npm ci`
  3. Generate bonus + affiliate reports
  4. `npm run monitor:telegram:critical -- --send`
  5. Exits 0 silently if no critical issues

**`production-monitor.yml`** (on `main` branch)
- Production-level monitoring workflow (see workflow file for full details)

---

## 23. Required GitHub Secrets

| Secret | Purpose | Required |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot authentication | **Yes** |
| `TELEGRAM_CHAT_ID` | Target chat for reports | **Yes** |
| `PROXY_PL_URL` | Poland region proxy URL | Optional |
| `PROXY_DE_URL` | Germany region proxy URL | Optional |
| `PROXY_RU_URL` | Russia region proxy URL | Optional |
| `PROXY_TR_URL` | Turkey region proxy URL | Optional |
| `PROXY_IN_URL` | India region proxy URL | Optional |
| `PROXY_NG_URL` | Nigeria region proxy URL | Optional |

---

## 24. Proxy Architecture Plan

**6 regional proxies planned:** PL (Poland), DE (Germany), RU (Russia), TR (Turkey), IN (India), NG (Nigeria)

**How it works:**
1. Each region config in `verification-regions.ts` has a `proxyEnvKey` field
2. Before launching Playwright for that region, the script checks `process.env[proxyEnvKey]`
3. If env var missing â†’ region skipped with status `proxy_not_configured` (no error)
4. If env var present â†’ Playwright launched with proxy URL

**Current state:** Only `GLOBAL` is enabled. All regional proxies are disabled until GitHub Secrets are configured.

**Enabling a region:**
1. Set up proxy server for that region
2. Add proxy URL to GitHub Secrets (e.g., `PROXY_PL_URL=http://proxy.example.com:8080`)
3. Region auto-enables in `getEnabledRegions()` when env var is present

---

## 25. Recommended Next Tasks (Priority Order)

1. **Implement Yandex Metrika event tracking**
   - Counter: `109562447`
   - 10 events: `exchange_click`, `affiliate_outbound`, `compare_click`, `bonus_copy`, `faq_expand`, `scroll_50`, `scroll_90`, `verdict_interaction`, `country_page_visit`, `coin_page_visit`
   - Add to Astro layout + relevant components

2. **Apply article blueprints to binance/okx/mexc exchange pages**
   - Run `npm run articles:audit` first to see current state
   - Generate briefs: `npm run articles:brief:binance`
   - Update page content to satisfy blueprint requirements

3. **Add captureUrls + CSS selectors to screenshot registry**
   - Edit `src/data/screenshot-registry.ts`
   - Fill in `captureUrl` for 11 remaining exchanges
   - Add `selector` for all 152 entries
   - Re-run `npm run screenshots:registry:audit` to verify

4. **Fix bybit bonus screenshot**
   - Option A: Capture screenshot using `npm run screenshots:harvest:bybit`
   - Option B: Update `bybit.json` evidence to mark as `missing` or `needs_manual_capture`
   - Bybit affiliate link is immutable â€” do not change it

5. **Configure proxy secrets for multi-region verification**
   - Set up proxy servers for PL/DE/RU/TR/IN/NG
   - Add to GitHub repository secrets
   - Test with `npm run bonus:verify:all`

6. **Generate content briefs for all P1 exchanges**
   - binance: `npm run articles:brief:binance`
   - okx/mexc/bitget: `node scripts/generate-content-brief.mjs --type exchange_review --exchange okx`

7. **Run full bonus verification**
   - `npm run bonus:verify:all`
   - Review `reports/bonus-update-proposals.json`
   - Manually approve accurate updates

8. **Implement /methodology page**
   - Document evidence standards, update frequency, verification process
   - Blueprint type: `how_to_guide` or custom `methodology` type

