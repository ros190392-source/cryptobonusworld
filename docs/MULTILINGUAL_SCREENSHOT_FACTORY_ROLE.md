# Multilingual Screenshot Factory — ROLE 38

**Version:** 1.0
**Created:** 2026-06-08
**Sprint:** Sprint 06
**Status:** ACTIVE — governing document for the Multilingual Screenshot Factory
**Branch:** `master`
**Owner:** Chief Project Owner (ROLE 0)
**Role:** ROLE 38 — Multilingual Screenshot Factory Lead

> This document defines ROLE 38 and the end-to-end screenshot production system for
> CryptoBonusWorld. It governs how screenshots are planned, captured, processed, approved,
> stored, refreshed, and reused across all exchanges, languages, GEOs, and content pages.
> It sits beside `docs/SCREENSHOT_STANDARD.md` (file/slot rules) and `docs/EXCHANGE_INTELLIGENCE_PROFILE_STANDARD.md`
> (source URL ownership). Companion data standard: `docs/MULTILINGUAL_SCREENSHOT_FACTORY_STANDARD.md`.

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Role Definition](#2-role-definition)
3. [Relationship with ROLE 37](#3-relationship-with-role-37)
4. [Responsibilities](#4-responsibilities)
5. [Capture Types](#5-capture-types)
6. [Language / GEO Model](#6-language--geo-model)
7. [Screenshot Approval Lifecycle](#7-screenshot-approval-lifecycle)
8. [Update Cadence](#8-update-cadence)
9. [Approval Powers](#9-approval-powers)
10. [Integration with Gold Pages](#10-integration-with-gold-pages)

---

## 1. Purpose

CryptoBonusWorld needs a controlled, repeatable screenshot production system because the
visual-evidence surface of the project is large and constantly changing:

- **Many exchanges** — 14 active exchanges today, more onboarding. Each has a registration page,
  bonus landing, fee schedule, spot/futures interfaces, P2P, app download page, proof of reserves,
  KYC overview, and more. That is 100+ potential screenshot slots before any language variant.
- **Many languages** — CryptoBonusWorld targets EN, RU, PT-BR, TR, ID, ES, PL, KK, UK and others.
  An exchange bonus landing in Portuguese for a Brazilian user is a *different screenshot* from the
  English global one — different currency, different offer, different payment methods.
- **Many GEOs** — Brazil, Turkey, Kazakhstan, Poland, India, Indonesia, Nigeria, and global.
  GEO determines currency (BRL, TRY, KZT, PLN), available products, P2P payment rails (PIX, Papara,
  Kaspi), and even whether the exchange is available at all.
- **Changing offers** — bonus amounts, promo campaigns, and reward ceilings change frequently. A
  screenshot that proved "19,800 USDT" is stale the moment the campaign changes. Stale offer
  screenshots are a trust and compliance liability.
- **Different product pages** — fees, P2P, spot, futures, earn, copy trading each tell a different
  story and live on different URLs with different capture and masking needs.
- **Public vs authenticated screenshots** — public pages (bonus landing, fees, PoR, app download,
  public P2P listing) can be fully automated. Authenticated pages (rewards center, KYC overview,
  account limits) require a logged-in session and must be staged in `reports/` first. Sensitive
  steps (email verification, KYC documents, payment examples) are owner-manual only.
- **Approval and masking requirements** — no screenshot reaches `public/` without ethics review
  (ROLE 33), factory approval (ROLE 38), and owner approval (ROLE 0). Personal data, balances,
  addresses, and codes must be masked or the capture is forbidden outright.

Without a factory, screenshots are captured ad-hoc, lack language/GEO discipline, go stale silently,
get reused on the wrong page, and occasionally leak sensitive data. The factory makes screenshot
production a **governed pipeline with a job matrix, an approval lifecycle, and a refresh schedule** —
the same way the evidence system governs factual claims.

---

## 2. Role Definition

### ROLE 38 — Multilingual Screenshot Factory Lead

**Mission:**
Maintain the end-to-end screenshot production pipeline for exchange pages, bonus pages, GEO pages,
comparison pages, and Gold Pages — turning approved target URLs into approved, reusable, correctly
classified, language/GEO-aware visual assets, while guaranteeing that no screenshot is ever
published without ethics review and owner approval.

ROLE 38 is the operational owner of:
- The **screenshot job matrix** (what to capture, in which language/GEO, at what priority)
- The **capture queues** (public / authenticated / owner_manual)
- The **approval lifecycle** (planned → … → active → stale → archived)
- The **asset registry** (approved public screenshots and where they are used)
- The **rejected archive** (why a screenshot failed and must not be reused)
- The **refresh schedule** (when each asset must be re-verified)

ROLE 38 does **not** own the facts behind screenshots (that is ROLE 37) and does **not** publish
without approval (that is ROLE 0 + ROLE 33). ROLE 38 is the production line; the facts come from
upstream and the publish decision comes from above.

---

## 3. Relationship with ROLE 37

ROLE 37 (Exchange Intelligence Owner) and ROLE 38 (Multilingual Screenshot Factory Lead) have a
clean producer/consumer relationship with no overlap of authority:

| Concern | ROLE 37 — Exchange Intelligence Owner | ROLE 38 — Screenshot Factory Lead |
|---------|---------------------------------------|-----------------------------------|
| Owns exchange facts | ✅ Yes — affiliate URL, bonus, fees, products | ❌ No — consumes them |
| Owns target URLs | ✅ Yes — `screenshotTargets` in the profile | ❌ No — consumes them as job seeds |
| Owns the screenshot job matrix | ❌ No | ✅ Yes |
| Decides what to capture, when, in which language/GEO | ❌ No | ✅ Yes |
| Captures / processes / classifies screenshots | ❌ No | ✅ Yes (via ROLE 5/17/18) |
| Approves public publish | ❌ No (proposes) | ❌ No (proposes) — ROLE 0 + ROLE 33 approve |

**The handoff:**
ROLE 37 maintains `src/data/exchange-intelligence/{exchange}.json`, including the
`screenshotTargets` array — every potential capture target with its source URL, risk level, and
masking notes. ROLE 38 reads `screenshotTargets` and **turns each approved target into one or more
screenshot jobs** — one per (language × GEO × section) combination that CBW actually needs for a
planned or live page. ROLE 38 then drives capture, processing, and approval, and writes the result
back to the factory's own data files (jobs, assets, rejected). ROLE 38 never edits the intelligence
profile; ROLE 37 never edits the factory job matrix.

If ROLE 38 discovers a target URL is wrong or missing, it files a note for ROLE 37 to update the
profile — it does not change the profile itself.

---

## 4. Responsibilities

ROLE 38 must manage all of the following:

1. **Screenshot job matrix** — the master list of every screenshot job across exchange × language ×
   GEO × section, each with status, priority, capture type, and refresh cadence.
2. **Language/GEO capture variants** — ensure each needed language/GEO combination has its own job;
   never assume the English/global screenshot is valid for another locale.
3. **Public capture queue** — jobs that can be fully automated (no login). Hand to ROLE 17 for
   Playwright capture.
4. **Owner_manual capture queue** — jobs requiring sensitive owner steps (email verification, KYC
   documents, payment examples). Coordinate with ROLE 0; never automate.
5. **Authenticated capture queue** — jobs requiring a logged-in session but no forbidden data
   (rewards center, KYC overview, account limits). Stage in `reports/` first.
6. **Masking / cropping rules** — define per job what must be masked (names, balances, codes) and
   the crop policy (URL bar hidden/cropped). Enforce via ROLE 18.
7. **Screenshot approval lifecycle** — move each job through the lifecycle states (§7); never skip
   ethics review or owner approval.
8. **Public asset promotion** — propose moving an approved candidate from `reports/` to `public/`;
   only ROLE 0 may authorise the move.
9. **Refresh schedule** — assign and run the per-asset refresh cadence; trigger recapture before
   an asset goes stale.
10. **Stale screenshot detection** — flag assets whose `lastApproved` or source offer has aged past
    `staleAfterDays`; move to `stale` and queue recapture.
11. **Rejected screenshot archive** — record every rejection with a reason so a bad capture is
    never silently reused.
12. **Screenshot usage map across pages** — track which approved asset is used on which page, so a
    single recapture can update every page that depends on it.

---

## 5. Capture Types

Every screenshot job is classified into exactly one capture type. The type determines automation
eligibility, staging path, and approval depth.

### `public`
- No login required.
- **Can be fully automated** (Playwright headless or owner-driven public browser).
- Examples: bonus referral landing, fee schedule, proof of reserves, app download page,
  public P2P listing, public help/FAQ pages, spot/futures public interface.

### `authenticated`
- Login required; shows account-context UI but **no forbidden data**.
- **Must save to `reports/` first** — never directly to `public/`.
- No private data may be published; balances/UID/email masked or cropped.
- Examples: rewards center / bonus hub, KYC overview (verification status + tiers),
  account limits page, public-safe earn dashboard.

### `owner_manual`
- Sensitive steps performed by the owner personally.
- Never automated; never driven by an agent.
- Examples: email verification screen, KYC document/selfie steps (overview only — never the
  document itself), payment examples (Revolut/bank transfer/PIX illustrative screens).

### `forbidden`
- Never captured under any circumstances, by anyone, regardless of approval.
- Hard, absolute block:
  - withdrawal screens
  - deposit addresses
  - wallet balances
  - passwords
  - verification codes
  - 2FA QR codes / secrets
  - identity documents
  - selfies
  - API keys
  - chats
  - real personal transaction details

A job classified `forbidden` exists in the matrix only to record that it must never be produced —
it is a guardrail, not a queue.

---

## 6. Language / GEO Model

Every screenshot job is uniquely identified by the combination of these dimensions:

| Dimension | Examples | Notes |
|-----------|----------|-------|
| **language** | `en`, `ru`, `pt-BR`, `tr`, `id`, `es`, `pl`, `kk`, `uk` | BCP-47 codes; the rendered UI language of the capture |
| **GEO** | `global`, `brazil`, `turkey`, `kazakhstan`, `poland`, `india`, `indonesia`, `nigeria` | Determines currency, products, payment rails, availability |
| **exchange** | `binance`, `bybit`, `okx`, … | Matches `exchanges.json` slug |
| **section** | `bonus_landing`, `registration`, `fees`, `p2p_direction`, `app_download`, … | The product/page area captured |
| **source URL** | from ROLE 37 `screenshotTargets` | The canonical capture URL for that language/GEO/section |
| **screenshotId** | `binance_bonus_landing_en_global` | `{exchange}_{section}_{language}_{geo}` |

**Hard rule:** language and GEO are independent and must both be verified. A `pt-BR` UI does not
guarantee a Brazil GEO offer; a Brazil GEO does not guarantee a Portuguese UI. Each
(language × GEO) needs its own job, its own capture, its own confidence mark, and its own owner
approval before public use.

---

## 7. Screenshot Approval Lifecycle

Every screenshot job has exactly one lifecycle state at any time. ROLE 38 owns these transitions.

| State | Meaning | Advances when |
|-------|---------|---------------|
| `planned` | Job created in the matrix; not yet captured | A capture is queued |
| `candidate_captured` | Raw candidate captured to `reports/` | Post-production begins |
| `processed` | Cropped, masked, converted per job rules | Submitted for review |
| `owner_review` | Awaiting ROLE 33 ethics + ROLE 0 owner review | Decision made |
| `approved` | Owner-approved; cleared for public asset creation | Asset file created |
| `public_asset_created` | File copied to `public/screenshots/…`; asset registry entry written | Page references it |
| `active_on_page` | Asset is live on at least one production page | Time / offer change |
| `stale` | Aged past `staleAfterDays`, or source offer changed | Recapture queued |
| `rejected` | Failed review (any reason in §5 of the Standard) | Archived |
| `archived` | Retired; retained for audit; never reused | — |

**Flow:**
```
planned → candidate_captured → processed → owner_review → approved
        → public_asset_created → active_on_page → (stale → planned → …)
                                               ↘ rejected → archived
```

A job may move backwards: an `active_on_page` asset that receives a compliance or ethics flag
reverts to `owner_review` (or `rejected`) and the live page must drop it until re-approved.

---

## 8. Update Cadence

ROLE 38 runs a tiered refresh rhythm. Cadence is assigned per job in the job matrix.

### Daily
- High-risk **bonus screenshots** (offer amounts change without notice)
- **Availability / support pages** that affect whether a screenshot is even valid for a GEO
- **Rejected-source watch** — confirm rejected captures have not been re-introduced anywhere

### Weekly
- **P2P screenshots** (prices, payment methods, available offers shift)
- **Fees** screenshots
- **App download** pages (store listings and version banners change)
- **Major exchange pages** (registration, bonus landing) for Tier 1 exchanges

### Monthly
- **Gold Page screenshot refresh review** — every Gold Page's screenshot inventory re-checked
- **Country / GEO screenshot review** — verify each GEO variant still matches local reality

### Quarterly
- **Legal / KYC / security screenshot audit** — confirm KYC overview, security, and any
  compliance-adjacent screenshots still reflect current exchange behaviour and policy

---

## 9. Approval Powers

### ROLE 38 MAY:
- Create screenshot jobs (any exchange × language × GEO × section)
- Request captures (assign to public / authenticated / owner_manual queues)
- Reject low-quality screenshots (error states, loading states, wrong GEO/currency, low resolution)
- Require masking / cropping before a candidate can advance
- Flag stale screenshots and move them to `stale`
- Propose public asset promotion (move from `reports/` to `public/`)

### ROLE 38 MAY NOT:
- Publish public assets without ROLE 0 approval
- Publish any screenshot containing private/forbidden data (absolute block)
- Modify affiliate links
- Modify legal / availability claims
- Bypass the Screenshot Ethics review (ROLE 33)

ROLE 38 is a production and quality authority, not a publishing authority. The publish gate stays
with ROLE 0; the ethics veto stays with ROLE 33.

---

## 10. Integration with Gold Pages

Every Gold Page must have a complete screenshot governance footprint owned jointly by ROLE 38
(production) and ROLE 5 (placement). Each Gold Page maintains:

1. **Screenshot map** — which sections of the page require visual evidence, and which screenshotId
   serves each.
2. **Approved screenshot inventory** — the asset registry entries currently approved and active.
3. **Rejected screenshot inventory** — every rejected capture for this page with its reason, so it
   is never re-introduced.
4. **Recapture queue** — jobs in `planned`/`stale` awaiting capture for this page.
5. **Public asset list** — the exact `public/screenshots/…` paths the page renders, used for QA
   grep checks (no `reports/` paths, no rejected paths).
6. **Stale screenshot watch** — assets approaching `staleAfterDays`, surfaced before they expire.

Before a Gold Page War Room session, ROLE 37 supplies the `screenshotTargets`; ROLE 38 converts
them into the page's job matrix and reports the current state of all six footprints above. A Gold
Page may not deploy if any active screenshot is `stale`, `rejected`, or unapproved.

---

*Document version 1.0 — 2026-06-08 — Sprint 06*
*Owner: Chief Project Owner (ROLE 0)*
*Role: ROLE 38 — Multilingual Screenshot Factory Lead*
*Companion: `docs/MULTILINGUAL_SCREENSHOT_FACTORY_STANDARD.md`*
*Governance reference: `docs/CBW_PROJECT_OWNER_AND_TEAM_STRUCTURE.md`; `docs/SCREENSHOT_STANDARD.md`; `docs/EXCHANGE_INTELLIGENCE_PROFILE_STANDARD.md`*
