# CryptoBonusWorld — Architecture Map
> Generated: 2026-06-03

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CryptoBonusWorld                               │
│                   cryptobonusworld.com                               │
│                  Astro 4.15 SSG — 207 pages                         │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
        ┌─────────┼──────────────────────────────┐
        ▼         ▼                              ▼
┌───────────┐ ┌──────────────────┐  ┌────────────────────────────┐
│ Evidence  │ │  Screenshot       │  │   Article Blueprint        │
│ JSONs     │ │  Registry v1      │  │   System v1                │
│ 14 files  │ │  152 entries      │  │   10 blueprint types       │
└─────┬─────┘ └────────┬─────────┘  └──────────────┬─────────────┘
      │                │                            │
      └────────────────┼────────────────────────────┘
                       │
              ┌────────▼───────────┐
              │   Astro Build      │
              │   src/pages/       │
              │   207 static pages │
              └────────┬───────────┘
                       │
              ┌────────▼───────────┐
              │   public/          │
              │   screenshots/     │
              │   Static assets    │
              └────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Monitoring / CI Layer                             │
│                                                                     │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ Bonus Verification│  │ Affiliate Audit  │  │ Screenshot Audit │  │
│  │ verify-bonus-     │  │ audit-affiliate- │  │ audit-screenshot-│  │
│  │ capture.mjs       │  │ links.mjs        │  │ registry.mjs     │  │
│  └────────┬─────────┘  └────────┬────────┘  └────────┬─────────┘  │
│           └─────────────────────┼───────────────────┘             │
│                                 ▼                                   │
│                    ┌────────────────────────┐                       │
│                    │  Telegram Reports       │                       │
│                    │  monitor-telegram-      │                       │
│                    │  summary.mjs            │                       │
│                    └────────────┬───────────┘                       │
│                                 ▼                                   │
│                    ┌────────────────────────┐                       │
│                    │  GitHub Actions CI      │                       │
│                    │  (main branch)          │                       │
│                    │  telegram-reports.yml   │                       │
│                    │  critical-alerts.yml    │                       │
│                    └────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Screenshot Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│  SCREENSHOT PIPELINE                                                 │
└─────────────────────────────────────────────────────────────────────┘

  Capture request
       │
       ▼
  ┌─────────────────────────────────────────────┐
  │  harvest-exchange-screenshots.mjs            │
  │  (Playwright automation)                     │
  │  - Navigate to captureUrl                    │
  │  - Wait for CSS selector                     │
  │  - Take screenshot                           │
  │  - Save to /tmp/screenshots/...              │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  process-screenshot.mjs                      │
  │  - Resize to standard dimensions             │
  │  - Optimize to WebP format                   │
  │  - Apply naming convention:                  │
  │    {geo}-{device}-{YYYY-MM}.webp             │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  annotate-screenshot.mjs                     │
  │  - Add overlay labels                        │
  │  - Add geo/date watermarks                   │
  │  - Blur sensitive data (AUTH_SAFE level)     │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  HUMAN APPROVAL GATE                         │
  │  approve-screenshots.mjs                     │
  │  - Review pending screenshots                │
  │  - Approve / reject                          │
  └──────────────────────┬──────────────────────┘
                         │
               ┌─────────┴──────────┐
               ▼                    ▼
  ┌─────────────────────┐  ┌──────────────────────────────┐
  │ Evidence JSON update │  │ screenshot-registry.ts        │
  │ status: available    │  │ outputPath populated          │
  │ path: /screenshots/  │  │ status: available             │
  │   {exchange}/...     │  │                              │
  └──────────┬──────────┘  └──────────────────────────────┘
             │
             ▼
  ┌─────────────────────────────────────────────┐
  │  public/screenshots/{exchange}/{category}/   │
  │  {geo}-{device}-{YYYY-MM}.webp               │
  │  Served as static assets                     │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  Astro components                            │
  │  Reference via screenshot-registry.ts        │
  │  Displayed on exchange review pages          │
  └─────────────────────────────────────────────┘
```

---

## Bonus Verification Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│  BONUS VERIFICATION PIPELINE                                         │
└─────────────────────────────────────────────────────────────────────┘

  npm run bonus:verify:all
       │
       ▼
  ┌─────────────────────────────────────────────┐
  │  verify-bonus-capture.mjs                    │
  │  For each exchange × enabled region:         │
  │  1. Navigate to affiliate URL (Playwright)   │
  │  2. Record full redirect chain               │
  │  3. Extract bonus text from landing page     │
  │  4. Take screenshot → SHA-256 hash           │
  └──────────────────────┬──────────────────────┘
                         │
               ┌─────────┴──────────┐
               ▼                    ▼
  ┌──────────────────────┐  ┌───────────────────────────┐
  │  Screenshot changed?  │  │  Bonus amount changed?    │
  │  → add to refresh     │  │  → add to proposals       │
  │    queue              │  │    (status: pending_       │
  └──────────┬───────────┘  │    approval)               │
             │              └──────────────┬─────────────┘
             │                             │
             ▼                             ▼
  ┌─────────────────────────────────────────────┐
  │  saveEvidenceSnapshot()                      │
  │  → reports/evidence-snapshots/               │
  │    {exchange}-{region}-{YYYY-MM-DD}.json     │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  reports/bonus-update-proposals.json         │
  │  (pending_approval entries)                  │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  HUMAN REVIEW REQUIRED                       │
  │  npm run bonus:proposals  ← list pending     │
  │  npm run bonus:approve    ← approve specific │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  approve-bonus-updates.mjs                   │
  │  → Evidence JSON updated (new bonus amount)  │
  │  → Next Astro build picks up new value       │
  └─────────────────────────────────────────────┘
```

---

## Telegram Reporting Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  telegram-reports.yml  (every 6 hours, on main branch)              │
└─────────────────────────────────────────────────────────────────────┘

  GitHub Actions trigger (cron: 0 */6 * * *)
       │
       ▼  checkout ref: master
  ┌─────────────────────────────────────────────┐
  │  Generate reports:                           │
  │  → npm run bonus:verify:all                  │
  │  → npm run affiliate:report                  │
  │  → npm run screenshots:report                │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  Send Telegram messages:                     │
  │  → bonus:telegram-report -- --send           │
  │  → affiliate:telegram-report -- --send       │
  │  → screenshots:telegram-report -- --send     │
  │  → monitor:telegram:summary -- --send        │
  └─────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  critical-alerts.yml  (manual dispatch, on main branch)             │
└─────────────────────────────────────────────────────────────────────┘

  workflow_dispatch (manual trigger)
       │
       ▼  checkout ref: master
  ┌─────────────────────────────────────────────┐
  │  Generate reports:                           │
  │  → npm run bonus:verify:all                  │
  │  → npm run affiliate:report                  │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  monitor:telegram:critical -- --send         │
  │  → Sends only if CRITICAL issues found       │
  │  → Exits 0 silently if all OK                │
  └─────────────────────────────────────────────┘
```

---

## CI Structure (Branch Layout)

```
GitHub Repository
│
├── main branch  (GitHub default, SPARSE)
│   ├── .github/
│   │   └── workflows/
│   │       ├── telegram-reports.yml    ← runs every 6h
│   │       ├── critical-alerts.yml     ← manual dispatch
│   │       └── production-monitor.yml  ← production monitoring
│   └── .gitattributes  (*.yml text eol=lf)
│
└── master branch  (ALL CODE)
    ├── .gitattributes  (*.yml text eol=lf)
    ├── astro.config.mjs
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── data/
    │   │   ├── evidence/          (14 JSON files + index.ts)
    │   │   ├── screenshot-registry.ts
    │   │   ├── exchange-screenshots.ts
    │   │   ├── article-blueprints.ts
    │   │   └── verification-regions.ts
    │   └── pages/                 (207 Astro pages)
    ├── scripts/                   (50+ automation scripts)
    ├── docs/                      (handoff documentation)
    └── public/
        └── screenshots/           (static screenshot assets)

RULE: All CI workflow steps use `ref: master` to checkout code.
RULE: Never commit code to main. Never commit workflows to master.
```

---

## Region Verification Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  src/data/verification-regions.ts                                    │
└─────────────────────────────────────────────────────────────────────┘

  getEnabledRegions()
       │
       ▼
  ┌────────────────────────────────────────────────────────────┐
  │  GLOBAL  ← only enabled region currently                    │
  │  locale: en-US                                              │
  │  no proxy required                                          │
  └────────────────────────────────────────────────────────────┘

  Disabled regions (enabled when proxyEnvKey is set in environment):
  ┌───────────────────────────────────────────────────────────┐
  │  PL  ← enabled when PROXY_PL_URL is set                   │
  │  DE  ← enabled when PROXY_DE_URL is set                   │
  │  RU  ← enabled when PROXY_RU_URL is set                   │
  │  TR  ← enabled when PROXY_TR_URL is set                   │
  │  IN  ← enabled when PROXY_IN_URL is set                   │
  │  NG  ← enabled when PROXY_NG_URL is set                   │
  └───────────────────────────────────────────────────────────┘

  For each non-GLOBAL region, verification script:
  ┌────────────────────────────────────────────────────────────┐
  │  1. Check process.env[proxyEnvKey]                         │
  │  2. If missing → skip, log "proxy_not_configured"          │
  │     (no error, no crash — safe fallback)                   │
  │  3. If present → launch Playwright with proxy URL          │
  │  4. Navigate affiliate URL through proxy                   │
  │  5. Extract bonus, take screenshot                         │
  └────────────────────────────────────────────────────────────┘
```

---

## Evidence JSON Structure

```json
// src/data/evidence/{exchange}.json
{
  "exchange": "binance",
  "lastUpdated": "2026-01-15T00:00:00Z",

  "screenshots": {
    "registration": {
      "status": "available",
      "path": "/screenshots/binance/registration/global-desktop-2025-11.webp",
      "capturedAt": "2025-11-15T10:00:00Z",
      "geo": "GLOBAL",
      "device": "desktop",
      "notes": "Standard registration page screenshot"
    },
    "bonus_claim": {
      "status": "missing",
      "path": null,
      "capturedAt": null,
      "geo": "GLOBAL",
      "device": "desktop",
      "notes": "Not yet captured"
    }
  },

  "bonuses": [
    {
      "type": "welcome_bonus",
      "amount": "up to $600 USDT",
      "currency": "USDT",
      "verified": true,
      "verifiedAt": "2026-01-10T00:00:00Z",
      "affiliateUrl": "https://accounts.binance.com/register?ref=..."
    }
  ],

  "fees": {
    "maker": "0.1%",
    "taker": "0.1%",
    "withdrawal": "varies by asset"
  }
}
```

**Status values:**
- `"available"` — screenshot file exists on disk, path is set
- `"missing"` — no screenshot captured yet
- `"outdated"` — screenshot exists but past staleness threshold
- `"not_applicable"` — this category doesn't apply to this exchange

---

## Article Blueprint Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  Article Blueprint System v1                                         │
└─────────────────────────────────────────────────────────────────────┘

  src/data/article-blueprints.ts
  ┌────────────────────────────────────────────────────────────┐
  │  10 blueprint types                                         │
  │  Each blueprint defines:                                    │
  │  - SectionSpec[] (required + optional sections)            │
  │  - EvidenceRequirement[] (what must be verified)           │
  │  - ScreenshotRequirement[] (required screenshots)          │
  │  - SchemaRequirement[] (JSON-LD schemas)                   │
  │  - InternalLinkTarget[] (required internal links)          │
  └──────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  audit-article-blueprints.mjs                │
  │  - Scan src/pages/ for exchange review pages │
  │  - Compare actual content against blueprint  │
  │  - Flag missing sections / evidence          │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  reports/article-blueprint-audit.{json,md}   │
  │  - Per-page compliance score                 │
  │  - Missing section list                      │
  │  - Evidence gaps                             │
  └─────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────┐
  │  generate-content-brief.mjs                  │
  │  --type exchange_review --exchange binance   │
  │  - Load blueprint definition                 │
  │  - Load binance.json evidence                │
  │  - Generate structured content brief         │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  reports/content-briefs/                     │
  │  binance-exchange_review.md                  │
  │  (human-readable content brief for writers)  │
  └─────────────────────────────────────────────┘
```

---

## Screenshot Registry Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  src/data/screenshot-registry.ts — Registry v1                       │
└─────────────────────────────────────────────────────────────────────┘

  buildFullRegistry()
  ┌────────────────────────────────────────────────────────────┐
  │  14 exchanges × 10 standard categories                      │
  │  + 4 extended categories (binance/okx/mexc only):          │
  │    bonus_referral_landing, registration_mobile,            │
  │    kyc_status_safe, kyc_info                               │
  │  = 152 total entries                                        │
  └──────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
  Each entry (ScreenshotRegistryEntry):
  ┌────────────────────────────────────────────────────────────┐
  │  id:           binance-registration-global-desktop          │
  │  exchange:     binance                                      │
  │  category:     registration                                 │
  │  region:       GLOBAL                                       │
  │  locale:       en-US                                        │
  │  device:       desktop                                      │
  │  captureUrl:   https://... (null for 11 exchanges)          │
  │  requiresAuth: false                                        │
  │  safetyLevel:  PUBLIC                                       │
  │  selector:     null (Phase 2 work)                          │
  │  outputPath:   /screenshots/binance/registration/...        │
  │  status:       driven by evidence JSON status field         │
  └──────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  audit-screenshot-registry.mjs               │
  │  - Check each entry against disk             │
  │  - Compare with evidence JSON status         │
  │  - Report: available / missing / orphan      │
  └──────────────────────┬──────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────┐
  │  reports/screenshot-registry-audit.{json,md} │
  │  Current state: 7 available, 126 missing     │
  │  Known issue: bybit bonus file missing       │
  └─────────────────────────────────────────────┘
```

---

## Data Dependencies Map

```
┌──────────────────────────────────────────────────────────────────┐
│  What depends on what                                             │
└──────────────────────────────────────────────────────────────────┘

evidence/{exchange}.json
  ├── consumed by: screenshot-registry.ts (status field)
  ├── consumed by: article-blueprints.ts (evidence requirements)
  ├── consumed by: verify-bonus-capture.mjs (affiliateUrl, expectedBonus)
  ├── consumed by: Astro pages (build-time data)
  └── updated by: approve-bonus-updates.mjs

screenshot-registry.ts
  ├── depends on: evidence/index.ts (getExchangeEvidence)
  ├── consumed by: audit-screenshot-registry.mjs
  ├── consumed by: harvest-exchange-screenshots.mjs
  └── consumed by: src/utils/exchangeScreenshots.ts

article-blueprints.ts
  ├── consumed by: audit-article-blueprints.mjs
  └── consumed by: generate-content-brief.mjs

verification-regions.ts
  ├── consumed by: verify-bonus-capture.mjs
  └── consumed by: evidence-snapshot.mjs

reports/ (generated, gitignored)
  ├── evidence-snapshots/ → consumed by: monitor-telegram-summary.mjs
  ├── bonus-update-proposals.json → consumed by: approve-bonus-updates.mjs
  ├── screenshot-refresh-queue.json → consumed by: harvest-exchange-screenshots.mjs
  └── affiliate-link-inventory.json → consumed by: affiliate-telegram-report.mjs
```
