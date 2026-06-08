# Multilingual Screenshot Factory — Data Standard

**Version:** 1.0
**Created:** 2026-06-08
**Sprint:** Sprint 06
**Status:** ACTIVE — canonical data model for the Multilingual Screenshot Factory
**Owner:** Chief Project Owner (ROLE 0)
**Role:** ROLE 38 — Multilingual Screenshot Factory Lead
**Companion:** `docs/MULTILINGUAL_SCREENSHOT_FACTORY_ROLE.md`

> This document defines the data model for screenshot jobs, approved assets, and rejected
> captures. It is the schema reference for the factory's data files. It does not replace
> `docs/SCREENSHOT_STANDARD.md` (file path / slot naming) — it sits above it, governing the
> *production lifecycle* while SCREENSHOT_STANDARD governs *file conventions*.

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Recommended Data Location](#2-recommended-data-location)
3. [Screenshot Job Schema](#3-screenshot-job-schema)
4. [Asset Registry Schema](#4-asset-registry-schema)
5. [Rejected Screenshot Schema](#5-rejected-screenshot-schema)
6. [Automation vs Manual Model](#6-automation-vs-manual-model)
7. [Multilingual Strategy](#7-multilingual-strategy)
8. [Binance Pilot Screenshot Factory](#8-binance-pilot-screenshot-factory)
9. [Relationship with Existing Data](#9-relationship-with-existing-data)
10. [No-Autopublish Rule](#10-no-autopublish-rule)

---

## 1. Purpose

Define the standard data model for screenshot jobs so that screenshot production is a structured,
queryable pipeline rather than ad-hoc captures. The model lets any role answer:

- What screenshots do we need for exchange X in language L and GEO G?
- Which are captured, processed, approved, active, or stale?
- Which were rejected, and why (so we never reuse them)?
- Which approved asset is used on which pages?
- What must be recaptured this week?

The data model is the machine-readable backbone of the lifecycle defined in
`docs/MULTILINGUAL_SCREENSHOT_FACTORY_ROLE.md §7`.

---

## 2. Recommended Data Location

```
src/data/screenshot-factory/
├── jobs/
│   ├── binance.json        # all screenshot jobs for Binance (one array of job objects)
│   ├── bybit.json
│   └── …
├── assets/
│   ├── binance.json        # approved public screenshot assets for Binance
│   ├── bybit.json
│   └── …
└── rejected/
    ├── binance.json        # rejected captures for Binance with reasons
    ├── bybit.json
    └── …
```

**Notes:**
- One file per exchange per category keeps diffs small and review focused.
- `jobs/` is the production matrix; `assets/` is the approved-for-public registry;
  `rejected/` is the audit archive.
- These files are **planning/staging data** — like `src/data/exchange-intelligence/`, they are a
  staging layer and do not directly render public pages (see §10).
- Candidate images live in `reports/screenshots/{exchange}/{section}/`; approved public assets live
  in `public/screenshots/{exchange}/{section}/` per `docs/SCREENSHOT_STANDARD.md`.

---

## 3. Screenshot Job Schema

```json
{
  "screenshotId": "binance_bonus_landing_en_global",
  "exchange": "binance",
  "language": "en",
  "geo": "global",
  "section": "bonus_landing",
  "targetUrl": "",
  "sourceFromExchangeProfile": true,
  "captureType": "public|authenticated|owner_manual|forbidden",
  "priority": "P0|P1|P2|P3",
  "claimSupported": "",
  "requiredVisibleElements": [],
  "forbiddenVisibleElements": [],
  "maskingRequired": [],
  "cropPolicy": "",
  "browserChromePolicy": "hidden|cropped|allowed_if_url_is_evidence",
  "expectedOutput": {
    "candidatePath": "reports/screenshots/{exchange}/{section}/",
    "publicPath": "public/screenshots/{exchange}/{section}/",
    "format": "webp",
    "maxWidth": 1440
  },
  "approval": {
    "ownerApprovalRequired": true,
    "ethicsReviewRequired": true,
    "publicPublishAllowed": false,
    "approvedBy": null,
    "approvedAt": null
  },
  "freshness": {
    "lastCaptured": null,
    "lastApproved": null,
    "refreshCadence": "daily|weekly|monthly|quarterly|manual",
    "staleAfterDays": 30
  },
  "status": "planned|candidate_captured|processed|owner_review|approved|active|stale|rejected|archived"
}
```

**Field notes:**
- `screenshotId` — globally unique; format `{exchange}_{section}_{language}_{geo}`.
- `sourceFromExchangeProfile` — `true` when `targetUrl` is sourced from ROLE 37's
  `screenshotTargets`. ROLE 38 should not invent URLs; it consumes them.
- `requiredVisibleElements` — what MUST be visible for the capture to count (e.g.
  `["19,800 USDT", "CRYPTOBONUSW", "Sign Up"]`).
- `forbiddenVisibleElements` — what must NOT appear (e.g. `["balance", "email", "UID"]`); presence
  forces masking or rejection.
- `maskingRequired` — explicit list to mask (e.g. `["merchant_names", "account_id"]`).
- `cropPolicy` — free-text crop instruction (e.g. "crop URL bar and OS taskbar; keep filter bar").
- `browserChromePolicy` — `hidden` (headless, no chrome), `cropped` (crop the URL bar),
  `allowed_if_url_is_evidence` (URL bar kept only when the URL itself is the proof, e.g. a
  `?ref=CODE` referral URL).
- `approval.publicPublishAllowed` — stays `false` until ROLE 0 approves; ROLE 38 cannot set it true.
- `freshness.staleAfterDays` — drives stale detection; bonus jobs short (e.g. 14–30), structural
  pages longer.

---

## 4. Asset Registry Schema

Approved public screenshots (the output of the lifecycle):

```json
{
  "assetId": "",
  "screenshotId": "",
  "exchange": "",
  "language": "",
  "geo": "",
  "section": "",
  "publicPath": "",
  "caption": "",
  "alt": "",
  "claimSupported": "",
  "approvedBy": "ROLE 0",
  "approvedAt": "",
  "sourceJobId": "",
  "usedOnPages": [],
  "lastChecked": "",
  "staleAfterDays": 90
}
```

**Field notes:**
- `assetId` — stable identifier for the published asset (may differ from `screenshotId` if a job
  produces multiple crops).
- `publicPath` — exact `public/screenshots/…` path the page references.
- `caption` / `alt` — editorial caption and accessibility text; `alt` must describe the image
  factually, never make an unverified claim.
- `claimSupported` — the specific claim this asset visually supports (ties asset to evidence).
- `usedOnPages` — every page route rendering this asset; enables one-recapture-updates-all.
- `lastChecked` / `staleAfterDays` — independent of the job's cadence; an active asset is
  re-validated on its own schedule.

---

## 5. Rejected Screenshot Schema

Track *why* a screenshot was rejected so it is never reused:

```json
{
  "rejectedId": "",
  "screenshotId": "",
  "exchange": "",
  "section": "",
  "candidatePath": "",
  "rejectionReason": "error_state|loading_state|wrong_geo|wrong_currency|old_offer_amount|private_data|browser_url_bar|misleading_ui|low_quality|owner_rejected",
  "rejectionDetail": "",
  "rejectedBy": "",
  "rejectedAt": "",
  "doNotReuse": true
}
```

**Standard rejection reasons:**

| Reason | Meaning |
|--------|---------|
| `error_state` | Page showed an error ("An Error Occurred", 404, etc.) |
| `loading_state` | Skeleton / spinner / unfinished render at capture time |
| `wrong_geo` | GEO does not match the target (e.g. CNY market on a global page) |
| `wrong_currency` | Currency does not match the intended fiat (e.g. CNY instead of USD) |
| `old_offer_amount` | Shows a stale/incorrect bonus amount |
| `private_data` | Contains personal/forbidden data (name, balance, address, code, etc.) |
| `browser_url_bar` | URL bar visible when it should have been hidden/cropped |
| `misleading_ui` | UI state could mislead the reader about the offer or product |
| `low_quality` | Blurry, too small, wrong aspect, or below size/quality threshold |
| `owner_rejected` | ROLE 0 rejected on visual review for any reason |

Rejected entries are permanent audit records. QA grep checks reference `candidatePath` values to
ensure no rejected path ever appears in built HTML.

---

## 6. Automation vs Manual Model

| Tier | Capture method | Sections |
|------|----------------|----------|
| **Fully automated** | Playwright headless / scripted public browser | public bonus landing; fees; proof of reserves; app download; public P2P listing; public help pages |
| **Semi-automated** | Driven session, may need owner login but no forbidden data | registration with email entered; rewards center; KYC overview; authenticated account settings/limits |
| **Manual** | Owner performs the sensitive step personally | email verification; KYC documents (overview only); payment examples; Revolut/bank transfer/PIX illustration screens |
| **Forbidden** | Never captured | passwords; verification codes; 2FA secrets; balances; withdrawal/deposit addresses; API keys; personal documents; selfies; chats; real transactions |

This table maps directly to the `captureType` field in §3 and the capture types in
`MULTILINGUAL_SCREENSHOT_FACTORY_ROLE.md §5`.

---

## 7. Multilingual Strategy

For every language/GEO variant, ROLE 38 must treat it as a **distinct evidence artifact**, not a
translation of the global shot:

- **Do not assume the same offer** — bonus amounts and campaigns differ by GEO.
- **Verify the local page** — capture the actual localized URL, not the global one with a language toggle assumed.
- **Verify currency** — BRL for Brazil, TRY for Turkey, KZT for Kazakhstan, PLN for Poland, etc.
- **Verify language** — the rendered UI text must actually be in the target language.
- **Verify product availability** — the product (P2P, futures, earn) must actually be offered in that GEO.
- **Mark confidence** — record how confident we are that the variant is correct and current.
- **Owner approval required** — every language/GEO variant needs its own ROLE 0 approval before public use; an approved EN/global asset does not authorise its RU or PT-BR sibling.

---

## 8. Binance Pilot Screenshot Factory

Initial Binance screenshot jobs to seed `src/data/screenshot-factory/jobs/binance.json`.

### EN / global (priority — current Gold Page)

| screenshotId | section | captureType | priority |
|--------------|---------|-------------|----------|
| `binance_bonus_referral_landing_en_global` | bonus_referral_landing | public | P0 |
| `binance_registration_demo_state_en_global` | registration_demo_state | semi-automated | P1 |
| `binance_email_entered_state_en_global` | email_entered_state | semi-automated | P2 |
| `binance_email_verification_en_global` | email_verification_empty_or_masked | owner_manual | P2 |
| `binance_fees_en_global` | fees | public | P1 |
| `binance_proof_of_reserves_en_global` | proof_of_reserves | public | P1 |
| `binance_spot_en_global` | spot | public | P1 |
| `binance_p2p_direction_usd_usdt_en_global` | p2p_direction_usd_usdt | public | P1 |
| `binance_p2p_offer_terms_example_en_global` | p2p_offer_terms_example | public | P2 |
| `binance_p2p_escrow_mechanics_diagram_en_global` | p2p_escrow_mechanics_diagram | public (diagram) | P2 |
| `binance_card_buy_methods_en_global` | card_buy_methods | semi-automated | P2 |
| `binance_mobile_app_clean_en_global` | mobile_app_clean | public | P1 |
| `binance_kyc_overview_clean_en_global` | kyc_overview_clean | authenticated | P1 |

### PT-BR / Brazil (future)

| screenshotId | section | captureType | priority |
|--------------|---------|-------------|----------|
| `binance_bonus_landing_pt-BR_brazil` | bonus_landing_pt_br | public | P2 |
| `binance_p2p_brl_usdt_pt-BR_brazil` | p2p_brl_usdt | public | P2 |
| `binance_pix_payment_methods_pt-BR_brazil` | pix_payment_methods_if_verified | owner_manual | P3 |

### RU / global (future)

| screenshotId | section | captureType | priority |
|--------------|---------|-------------|----------|
| `binance_bonus_landing_ru_global` | bonus_landing_ru | public | P2 |
| `binance_registration_ru_global` | registration_ru | semi-automated | P2 |
| `binance_p2p_rub_usdt_ru_global` | p2p_rub_usdt_if_available_and_verified | public | P3 |

### TR / Turkey (future)

| screenshotId | section | captureType | priority |
|--------------|---------|-------------|----------|
| `binance_bonus_landing_tr_turkey` | bonus_landing_tr | public | P2 |
| `binance_p2p_try_usdt_tr_turkey` | p2p_try_usdt | public | P2 |
| `binance_local_payment_methods_tr_turkey` | local_payment_methods_if_verified | owner_manual | P3 |

All future variants are `planned` only; none may be published without a verified local capture and
ROLE 0 approval per §7.

---

## 9. Relationship with Existing Data

| File / dir | Relationship to the factory |
|------------|----------------------------|
| `src/data/exchange-intelligence/{exchange}.json` | **Upstream source.** ROLE 37's `screenshotTargets` seed the job matrix (target URLs, risk levels, masking notes). |
| `src/data/evidence/{exchange}.json` | **Claim anchor.** Each job's `claimSupported` ties to an evidence fact; the existing `screenshots` block continues to track per-slot status. |
| `src/data/content-overrides.json` | **Render control.** `contextualScreenshotSlots` remains the sole control for what renders on a page; the factory proposes, it does not write here. |
| `public/screenshots/` | **Approved asset home.** Final assets land here after ROLE 0 approval. |
| `reports/screenshots/` | **Candidate staging.** All candidates and authenticated captures stage here first. |
| `docs/SCREENSHOT_STANDARD.md` | **File conventions.** Path format, slot registry, quality rules; the factory's `expectedOutput` paths follow it exactly. |

The factory adds a *production lifecycle and job matrix* on top of the existing slot/evidence
system — it does not replace `evidence.{exchange}.json.screenshots` or the
`contextualScreenshotSlots` allowlist.

---

## 10. No-Autopublish Rule

No screenshot moves from `reports/` to `public/` without all three of:

1. **ROLE 33 — Screenshot Ethics / Privacy review** (no private/forbidden data; masking confirmed)
2. **ROLE 38 — Multilingual Screenshot Factory approval** (quality, correctness, right language/GEO)
3. **ROLE 0 — Chief Project Owner approval** (final publish authority)

Additional absolutes:
- No script may copy a candidate to `public/` or add it to `contextualScreenshotSlots` automatically.
- A change to any `src/data/screenshot-factory/*.json` file never triggers a public page change.
- Factory data changes do not require a deploy.
- A `forbidden` capture type is never produced, regardless of any approval.

---

*Document version 1.0 — 2026-06-08 — Sprint 06*
*Owner: Chief Project Owner (ROLE 0)*
*Role: ROLE 38 — Multilingual Screenshot Factory Lead*
*Companion: `docs/MULTILINGUAL_SCREENSHOT_FACTORY_ROLE.md`*
*Governance reference: `docs/SCREENSHOT_STANDARD.md`; `docs/EXCHANGE_INTELLIGENCE_PROFILE_STANDARD.md`; `docs/CBW_PROJECT_OWNER_AND_TEAM_STRUCTURE.md`*
