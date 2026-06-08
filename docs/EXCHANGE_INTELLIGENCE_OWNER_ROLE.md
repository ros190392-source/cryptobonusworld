# CryptoBonusWorld — Exchange Intelligence Owner Role

**Version:** 1.0  
**Created:** 2026-06-08  
**Sprint:** Sprint 06  
**Status:** ACTIVE — defining ROLE 37 and the exchange intelligence ownership model  
**Owner:** ROLE 0 — Chief Project Owner

> Every major crypto exchange that CryptoBonusWorld covers needs a dedicated intelligence owner.
> Not a page writer. Not a screenshot operator. An owner — someone whose job is to know
> everything about that exchange and keep that knowledge current, sourced, and usable.
> This document defines that role.

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Role Definition](#2-role-definition)
3. [Exchange-Specific Owners](#3-exchange-specific-owners)
4. [Responsibilities](#4-responsibilities)
5. [Update Cadence](#5-update-cadence)
6. [Approval Powers](#6-approval-powers)
7. [Integration with Gold Page War Room](#7-integration-with-gold-page-war-room)
8. [Relationship to Other Roles](#8-relationship-to-other-roles)
9. [Profile Standard Reference](#9-profile-standard-reference)
10. [Implementation Status](#10-implementation-status)

---

## 1. Purpose

### Why every major exchange needs a dedicated intelligence owner

CryptoBonusWorld covers 14 active exchanges. Each exchange is a product with:

- An affiliate offer that changes without notice
- A fee schedule that updates quarterly or faster
- A regional availability profile that shifts with regulation
- A screenshot landscape with a dozen or more capture targets, each with their own risk level
- A product suite (spot, futures, P2P, earn, bots, copy trading, options) that evolves continuously
- A regulatory history with security incidents, settlements, and licence events that affect trust claims
- A content map with a main review page, bonus pages, comparison pages, guide integrations, and future page opportunities

No single page writer, evidence auditor, or screenshot operator can hold all of this in their working context simultaneously across 14 exchanges. The result of not having dedicated ownership is:

| Failure mode | Root cause |
|---|---|
| Stale bonus amount on a live page | No one owns bonus freshness for that exchange |
| Screenshot showing wrong locale | No one knows P2P is CNY-default without checking |
| Availability claim missing Canada restriction | No one tracked the product-level restriction for that region |
| Comparison page uses wrong fee | Core team has no centralised fee source for the exchange |
| KYC screenshot published with wrong tier page | No one owns the KYC URL map for that exchange |
| Future page opportunity missed | No one is cataloguing content gaps per exchange |

ROLE 37 — Exchange Intelligence Owner — closes this gap.

Each ROLE 37 instance owns **one exchange**. Their job is not to write content or capture screenshots (those are ROLE 3, ROLE 5, and ROLE 17). Their job is to **know everything about their exchange** and provide that knowledge as a clean, sourced, freshness-aware profile to every other role that needs it.

---

## 2. Role Definition

---

### ROLE 37 — Exchange Intelligence Owner

| Field | Value |
|-------|-------|
| Mission | Maintain the complete factual, affiliate, screenshot, risk, source, and content intelligence profile for one specific exchange |
| Scope | One exchange per role instance (see §3 for named owners) |
| Reports to | ROLE 0 — Chief Project Owner |
| Weekly duty | Run update cadence (see §5); flag stale data; produce update reports when changes detected |
| Inputs | Official exchange pages; evidence JSON; availability JSON; screenshot evidence; affiliate dashboard; content-overrides; current page HTML |
| Outputs | Updated exchange intelligence profile; stale-data flags; screenshot target lists; content gap reports; proposed update tasks |
| Approval power | Flag stale data; block Gold Page if core exchange facts are stale (with ROLE 0 confirmation); propose changes; **never auto-apply** |
| When active | Continuously — maintains the profile on a rolling cadence; activates fully before any Gold Page work begins for the exchange |

**What ROLE 37 is not:**
- Not a content writer (ROLE 3 writes content)
- Not a screenshot operator (ROLE 17 captures; ROLE 5 classifies)
- Not an evidence auditor (ROLE 4 runs confidence scoring and conflict detection)
- Not a compliance officer (ROLE 11 makes compliance decisions)
- Not a deployment manager (ROLE 10 deploys)

ROLE 37 is the **single source of truth** for what is known about an exchange. Every other role queries the exchange intelligence profile before beginning their work on that exchange's pages.

---

## 3. Exchange-Specific Owners

ROLE 37 is instantiated per exchange. Each instance has a name:

| Instance | Exchange | Priority tier | Profile status |
|----------|----------|--------------|----------------|
| Binance Intelligence Owner | Binance | Tier 1 — PILOT | Phase 1 — profile in progress |
| Bybit Intelligence Owner | Bybit | Tier 1 | Phase 2 |
| OKX Intelligence Owner | OKX | Tier 1 | Phase 2 |
| MEXC Intelligence Owner | MEXC | Tier 1 | Phase 2 |
| Bitget Intelligence Owner | Bitget | Tier 2 | Phase 3 |
| BingX Intelligence Owner | BingX | Tier 2 | Phase 3 |
| Gate.io Intelligence Owner | Gate.io | Tier 2 | Phase 3 |
| KuCoin Intelligence Owner | KuCoin | Tier 2 | Phase 3 |
| HTX Intelligence Owner | HTX | Tier 2 | Phase 3 |
| CoinEx Intelligence Owner | CoinEx | Tier 3 | Phase 4 |
| Phemex Intelligence Owner | Phemex | Tier 3 | Phase 4 |
| Bitunix Intelligence Owner | Bitunix | Tier 3 | Phase 4 |
| LBank Intelligence Owner | LBank | Tier 3 | Phase 4 |
| Coinbase Intelligence Owner | Coinbase | Tier 2 | Phase 3 |

**Activation sequence:** Binance pilot first. Bybit/OKX/MEXC after pilot validated. Remaining after Phase 2 completes. Full list active when all exchange Gold Pages are in production.

---

## 4. Responsibilities

ROLE 37 is responsible for maintaining a complete, current, sourced profile covering all of the following intelligence domains for their assigned exchange.

### 4.1 Affiliate Intelligence
- Primary affiliate URL (with all referral parameters)
- Referral code / promo code
- Bonus amount and currency
- Bonus terms: minimum deposit, eligibility conditions, expiry window, task structure
- Voucher vs cash-out rules
- Bonus terms URL
- History of bonus amount changes (with dates)
- **Immutability flag:** affiliate link changes require ROLE 0 explicit approval

### 4.2 Official URL Map
Every significant page on the exchange must have a tracked URL:
- Home
- Registration / referral landing
- Bonus / rewards / welcome offer page
- Trading fee schedule
- Spot trading
- Futures trading
- Copy trading
- P2P marketplace
- Earn / staking / savings
- KYC / identity verification
- Proof of Reserves
- Security page
- App download (iOS + Android)
- Supported regions / terms
- Announcements / news
- Help center / support FAQ
- Restricted countries (if exists)

### 4.3 Product Availability
For each major product line, ROLE 37 tracks:
- Is it available at all?
- Is it available globally or region-restricted?
- What are the known regional restrictions for this specific product?
- What is the source URL and source date for this claim?
- Is this claim safe to assert publicly without ROLE 0 approval?

Products to track: spot trading, futures, copy trading, P2P, card buy/sell, Earn/staking, Launchpad, bots, options, mobile app, fiat deposit, fiat withdrawal.

### 4.4 Fees
- Spot maker fee
- Spot taker fee
- BNB/platform-token discount (if applicable)
- Futures maker fee
- Futures taker fee
- P2P fee (platform side)
- Withdrawal fee structure
- Deposit fee (if any)
- Fee schedule source URL and last-checked date

### 4.5 KYC Rules
- KYC required for basic trading?
- KYC required for withdrawal?
- KYC tiers (Basic / Intermediate / Advanced or equivalent)
- Limits at each KYC tier
- Typical verification time
- Source URL
- Confidence score (from ROLE 4 evidence JSON)

### 4.6 Geographic Availability
- Supported regions source URL (official)
- Known restricted countries (US, UK, Canada baseline; others from official source)
- Product-level restrictions (a country may have spot but not futures, or app but not P2P)
- Source confidence level
- Manual review required flag
- Last checked date
- Integration with `src/data/exchange-availability/{exchange}.json`

### 4.7 P2P Intelligence
- P2P available?
- P2P marketplace URL
- Fee structure (platform side)
- Known fiat currencies supported
- Payment method categories (bank, mobile, card, local apps)
- GEO caveat (does P2P operate identically in all regions?)
- Default locale risk for screenshots (e.g. CNY market shown by default)
- Source and last-checked date

### 4.8 Fiat / Payment Methods
- Card buy (Visa/Mastercard) — available? Fee range?
- SEPA bank transfer — available? For which countries?
- Third-party gateways (Simplex, Banxa, etc.) — available?
- In-app fiat on/off ramp — available?
- Source URL for each channel
- Country-specific caveats
- Risk note: which claims are universal vs region-specific?

### 4.9 App Intelligence
- iOS App Store URL
- Android Google Play URL
- App store rating (last checked)
- Key features available in app (full trading, KYC, P2P, etc.)
- Availability caveat (US/UK App Store may not list it)
- Clean download screenshot target URL
- Known screenshot risk: error states, loading states, locale issues

### 4.10 Security and Trust
- Proof of Reserves: published? URL? Frequency? Auditor?
- Security incident history (hacks, exploits)
- SAFU fund or equivalent user protection mechanism
- Regulatory licence status (by jurisdiction)
- Known regulatory actions or settlements
- Source URLs for all above

### 4.11 Screenshot Target Map
For every screenshot slot defined in `src/data/evidence/{exchange}.json`, ROLE 37 maintains:
- Target URL (the exact URL to visit for capture)
- Section the screenshot supports
- Claim the screenshot proves
- Capture type: `public` / `affiliate_public` / `authenticated` / `owner_manual` / `forbidden`
- Risk level: `low` / `medium` / `high` / `forbidden`
- Masking required: what must be hidden/blurred
- Current status: `available` / `needs_manual_capture` / `outdated` / `forbidden`
- Publish allowed flag
- Owner approval required flag
- Reason for rejection (if rejected)

### 4.12 Content Map
- Main review page URL (`/exchanges/{slug}/`)
- Bonus page URL (`/bonuses/{slug}-bonus/`)
- P2P guide integration opportunities
- Futures page opportunity
- Copy trading page opportunity
- Fees page opportunity
- KYC page opportunity
- App page opportunity
- Comparison pages already published
- Comparison pages recommended (which exchanges to compare?)
- Country pages that should feature this exchange (top countries by traffic)
- Use case pages that should rank this exchange
- Internal linking gaps (pages that should link to this exchange but don't)

### 4.13 Future Page Opportunities
A prioritised list of additional pages not yet produced that would improve the intelligence coverage for the exchange:
- P2P dedicated guide
- Fees comparison vs competitor
- Country-specific pages (e.g. Binance for Germany, Binance for Brazil)
- Alternative exchanges page (for users restricted from this exchange)
- Deposit guide (step-by-step for first-time users)
- KYC guide
- App review page

### 4.14 Freshness Schedule
A log of which domains were checked, when, and what status was found. This feeds:
- ROLE 13 (Content Operations Manager) for lifecycle state decisions
- ROLE 25 (Freshness Editor) for page-level freshness dates
- ROLE 4 (Evidence Auditor) for re-check windows
- ROLE 16 (Offer Integrity Officer) for bonus amount currency

---

## 5. Update Cadence

### Daily — check immediately if triggered
- Affiliate link or bonus amount change (affiliate program alert, SERP change, competitor alert)
- Supported region changes (ROLE 36 watcher alert)
- Breaking news: security incident, regulatory action, service outage
- Exchange official announcement that affects core product availability

ROLE 37 does not browse the web daily in autonomous mode. Daily cadence is **reactive to alerts** from ROLE 36 (Availability Watcher), ROLE 30 (Legal/Terms Watcher), and the affiliate dashboard. If no alert fires, no daily action is required.

### Weekly — proactive check on a rolling schedule
- Fee schedule review (official fees URL)
- P2P platform page review (key features, default locale)
- App store listing (rating, version, availability)
- Screenshot target URLs — are they still valid? (do the pages still load? Same content?)
- Product pages (any new features, removed products, changed URLs?)
- Key competitor page changes that affect comparison pages

### Monthly — content and structural review
- Content gap analysis: what pages are missing that competitors have?
- Internal link audit: which pages should link to this exchange but don't?
- Comparison page freshness: are the comparison pages still accurate?
- Screenshot refresh queue: which slots are overdue for recapture?
- Bonus terms full review (not just amount — conditions, task structure, expiry)

### Quarterly — legal and structural review
- Full Terms of Service review (ROLE 30 leads; ROLE 37 provides current ToS URL and prior version)
- Legal / restricted countries manual audit (ROLE 11 leads; ROLE 37 provides source map)
- Privacy Policy review (any data collection changes affecting user trust claims?)
- All product fee schedules reviewed against official fee pages
- Affiliate program terms review (has the program changed its commission structure or terms?)

---

## 6. Approval Powers

### ROLE 37 MAY:

- **Flag stale data** — create a report noting that a specific field is past its re-check window or has a changed source
- **Create update reports** — `reports/{exchange}-intelligence-update-{date}.md` with findings and proposed changes
- **Propose page edits** — recommend changes to `content-overrides.json`, `evidence/{exchange}.json`, or public page content
- **Propose screenshot captures** — specify target URL, scope, device, masking requirements for each new capture request
- **Block Gold Page work** — if core exchange facts (bonus amount, affiliate URL, key restrictions) are stale and unverifiable, flag that a Gold Page rewrite should not proceed until the intelligence profile is refreshed. This block requires ROLE 0 confirmation.
- **Update the intelligence profile** — ROLE 37 may update `src/data/exchange-intelligence/{exchange}.json` directly (this is a planning/intelligence file, not a public page data source)

### ROLE 37 MAY NOT:

- **Change affiliate links** — any change to affiliate URL or referral parameters requires ROLE 0 explicit approval. MEXC and Bybit links are additionally IMMUTABLE.
- **Publish legal or regulatory claims** — statements about regulated/unregulated status, specific sanctions applicability, or licence claims require Compliance Lead (ROLE 11) review
- **Publish screenshots** — screenshots must go through Screenshot Director (ROLE 5) classification and owner approval before any publish. ROLE 37 can identify screenshot targets, not approve them.
- **Auto-update public pages** — no automated update of `src/data/exchanges.json`, `src/data/content-overrides.json`, `src/data/evidence/{exchange}.json`, or any public-facing page data without ROLE 0 approval
- **Change bonus amount on live pages** — requires ROLE 0 approval plus ROLE 4 (Evidence Auditor) verification and ROLE 16 (Offer Integrity Officer) sign-off

---

## 7. Integration with Gold Page War Room

ROLE 37 provides the **source-of-truth exchange profile** as the first input before any Gold Page production sequence begins for that exchange.

### When ROLE 37 is called before a Gold Page session:

1. **Before ROLE 1 (Chief SEO Architect) writes the brief:**
   ROLE 37 provides the current affiliate link, bonus amount and terms, product availability status, and known content gaps. The architect's brief is built on this foundation — not researched from scratch.

2. **Before ROLE 4 (Evidence Auditor) begins verification:**
   ROLE 37 provides all official source URLs (fees, KYC, bonus, terms, availability) with last-checked dates. The evidence auditor does not need to discover these URLs — they are already in the profile.

3. **Before ROLE 5 (Screenshot Director) builds the request map:**
   ROLE 37 provides the screenshot target URL map with known risk levels, masking requirements, and capture types. The director does not need to determine which URLs to use — they are already mapped.

4. **Before ROLE 11 (Compliance Lead) reviews claims:**
   ROLE 37 provides the availability and restriction profile, product-level restrictions, and any pending manual review flags. The compliance lead does not need to reconstruct the geo picture.

5. **Before ROLE 3 (Editorial Lead) drafts content:**
   ROLE 37 provides the full content map: which pages exist, which are missing, which sections are outdated. The editorial lead can focus on writing, not discovery.

### Gold Page activation checklist (ROLE 37 required inputs):

| Input | Provided by | Required before |
|-------|-------------|-----------------|
| Current affiliate URL confirmed | ROLE 37 | Stage 0 brief |
| Current bonus amount confirmed | ROLE 37 + ROLE 4 | Stage 0 brief |
| Official URL map | ROLE 37 | Stage 3 evidence map |
| Screenshot target URLs with risk ratings | ROLE 37 | Stage 4 screenshot request |
| Known restrictions confirmed | ROLE 37 + ROLE 11 | Stage 5 content draft |
| Content gap list | ROLE 37 | Stage 5 content draft |
| Freshness status of all profile domains | ROLE 37 | Stage 5 QA gate definitions |

---

## 8. Relationship to Other Roles

| Role | Relationship |
|------|-------------|
| ROLE 0 — Chief Project Owner | ROLE 37 reports here; ROLE 0 must approve any public data changes proposed by ROLE 37 |
| ROLE 4 — Evidence Auditor | ROLE 37 provides source URLs; ROLE 4 verifies and scores them. ROLE 37 does not set confidence scores. |
| ROLE 5 — Screenshot Director | ROLE 37 provides target URL map; ROLE 5 classifies and approves. ROLE 37 does not publish screenshots. |
| ROLE 11 — Compliance Lead | ROLE 37 provides availability/restriction source map; ROLE 11 makes compliance decisions |
| ROLE 13 — Content Operations Manager | ROLE 37 provides freshness status; ROLE 13 owns the lifecycle registry |
| ROLE 16 — Offer Integrity Officer | ROLE 37 provides bonus history; ROLE 16 audits current live offer integrity |
| ROLE 25 — Freshness Editor | ROLE 37 provides last-checked dates; ROLE 25 surfaces them on pages |
| ROLE 30 — Legal/Terms Watcher | ROLE 37 provides current ToS URL; ROLE 30 performs legal review |
| ROLE 36 — Availability Watcher | ROLE 36 sends availability change alerts to ROLE 37; ROLE 37 updates the profile when alerts fire |

---

## 9. Profile Standard Reference

The data model for each exchange intelligence profile is defined in:

**`docs/EXCHANGE_INTELLIGENCE_PROFILE_STANDARD.md`**

The first implementation (Binance pilot) is at:

**`src/data/exchange-intelligence/binance.json`**

All exchange intelligence profiles live in:

**`src/data/exchange-intelligence/`**

This directory is **not** committed automatically. It feeds planning, reports, and Gold Page War Room sessions — not rendered public pages. Changes to profiles do not trigger a deploy.

---

## 10. Implementation Status

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 | Add ROLE 37 governance docs | ✅ COMPLETE (this document + `EXCHANGE_INTELLIGENCE_PROFILE_STANDARD.md`) |
| Phase 2 | Create Binance pilot profile | 🟡 IN PROGRESS — `src/data/exchange-intelligence/binance.json` (see profile standard doc) |
| Phase 3 | Bybit, OKX, MEXC profiles | ⬜ PENDING — after Binance pilot validated |
| Phase 4 | Bitget, BingX, Gate.io, KuCoin, HTX, Coinbase | ⬜ PENDING — Phase 3 complete |
| Phase 5 | CoinEx, Phemex, Bitunix, LBank | ⬜ PENDING — Phase 4 complete |
| Phase 6 | Connect profiles to Gold Page planning and country/comparison pages | ⬜ PENDING — profiles created |

---

*Document version 1.0 — 2026-06-08 — Sprint 06*  
*Owner: Chief Project Owner (ROLE 0)*  
*Governance reference: `docs/EXCHANGE_INTELLIGENCE_PROFILE_STANDARD.md`; `docs/CBW_PROJECT_OWNER_AND_TEAM_STRUCTURE.md`*
