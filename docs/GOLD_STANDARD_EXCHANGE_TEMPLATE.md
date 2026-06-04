# Gold Standard Exchange Page Template

**Version:** 1.0  
**Created:** 2026-06-03  
**Sprint:** Sprint 01 — Production Foundation  
**Task:** 05.5 — Extract Gold Standard Exchange Template Audit  
**Status:** APPROVED FOR REFERENCE — do not refactor template yet  
**Branch:** `master`

> This document defines the reference specification for a Gold Standard exchange review page on
> CryptoBonusWorld.com. It is derived from the current Bybit implementation as the furthest-advanced
> page in the site. It is a **specification and audit tool** — not an implementation directive.
> Do not refactor `[slug].astro` based on this document alone.

---

## 1. Executive Summary

### 1.1 What Makes Bybit the Current Gold Standard

Bybit is the only exchange page that currently meets all six gold-standard criteria simultaneously:

| Criterion | Bybit | Binance | MEXC | OKX | Bitget | BingX |
|---|---|---|---|---|---|---|
| Evidence JSON present | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| EMS score ≥ 70 | ✅ 73 | ❌ 65 | ❌ 67 | ❌ 66 | ❌ 66 | ❌ 65 |
| Screenshots on disk ≥ 5 | ✅ 7 | ✅ 8 | ❌ 0 | ❌ 0 | ❌ 0 | ❌ 0 |
| Visual walkthroughs | ✅ 4 flows | ❌ | ❌ | ❌ | ❌ | ❌ |
| Full content overrides | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Evidence-aware trust copy | ✅ (Task 05) | ✅* | ✅* | ✅* | ✅* | ✅* |

> *Evidence-aware trust copy was implemented in Task 05 as a template-level feature
> (applies to all 14 exchanges automatically based on `_bonusTrustOutdated` flag).
> Since all 14 exchanges currently have `bonus_amount.conflictStatus === "outdated"`,
> all 14 pages now display the softened trust language.

**The three factors that elevate Bybit above other exchanges:**
1. **Visual walkthroughs** — 4 complete step-by-step flows with 30+ screenshots (registration, KYC, P2P, deposit, futures). No other exchange has this.
2. **Higher EMS (73/100)** — best evidence maturity score on the site, driven by: 11 sources, 7 screenshots on disk, zero unverified facts, fresh `updatedAt: 2026-06-01`.
3. **Comprehensive content overrides** — 13 editorial FAQs, full verdict block, 6-category experience grid, realistic bonus expectation copy, and a detailed `longDescription`.

### 1.2 What Is Reusable Across All Exchanges

The following template features are already present and reusable for all 14 exchanges — they activate automatically when the required data exists:

| Feature | Data Source | Activates When |
|---|---|---|
| Evidence-aware trust bullet | `ev?.facts`, `bonus_amount.conflictStatus` | Always (added in Task 05) |
| FactCheckPanel | `evidence/[slug].json` | Exchange has evidence JSON |
| EvidenceVerificationBlock (fallback) | `exchanges.json` | No evidence JSON exists |
| ExchangeVerdictBlock | `content-overrides.json verdict` | Override has `verdict` key |
| ExchangeExperienceGrid | `content-overrides.json experience` | Override has `experience` key |
| OfferRealism | `exchanges.json offerConfidenceScore` or `realisticUserExpectation` | Either field is non-null |
| Bonus tiers | `exchanges.json bonusTiers` | Array has at least one entry |
| Referral code section | `exchanges.json promoCode` | Field is non-empty |
| FeeSnippetBlock | `exchanges.json spotMakerFee` or `futuresMakerFee` | Either field is defined |
| Key Facts table | `exchanges.json founded` or `licences` or `spotMakerFee` | Any of these present |
| GeoRegulatoryNote | `exchanges.json excludedCountries` | At least one country code |
| WalkthroughFlows | `exchange-walkthroughs.ts getFlowsBySlug()` | Exchange has registered flows |
| PromoCodeBox | `exchanges.json promoCode` | Field is non-empty |
| AlternativesBlock | `exchanges.json` (all) | Always |
| FAQ + FAQSchema | `content-overrides.json faqAppend` + generated FAQs | Always (at least generated FAQs) |

### 1.3 What Is Bybit-Specific and Must NOT Be Blindly Copied

| Element | Where | Why Bybit-Only |
|---|---|---|
| 4 visual walkthrough flows | `exchange-walkthroughs.ts` | Requires ~30 real account screenshots; not available for other exchanges yet |
| Mid-CTA text "Following this guide on Bybit?" | `[slug].astro` line ~703 | **Hard-coded Bybit name** — this is a template bug: CTA text contains "Bybit" literally. Must be parameterized when walkthroughs exist for other exchanges. |
| `promoCode: "CRYPTOBONUSW"` | `exchanges.json` | Bybit's specific affiliate code; each exchange has its own code |
| `offerConfidenceScore: 72` | `exchanges.json` | Editorially set per-exchange; do not copy Bybit's value to others |
| 11 evidence sources | `evidence/bybit.json` | Bybit-specific official pages; each exchange needs its own sources |
| `realisticUserExpectation` and `bonusConditionSummary` | `exchanges.json` | Bybit-specific editorial content |

> **Critical bug identified:** Line ~703 of `[slug].astro` contains the hardcoded string
> `"Following this guide on Bybit?"` and `"Open Bybit ↗"` in the mid-flow CTA block.
> This text will display for any future exchange that has walkthrough flows. It must be
> parameterized as `ex.name` before walkthroughs are enabled for a second exchange.
> **Track as Task 05.6 — do not activate walkthroughs for other exchanges until fixed.**

---

## 2. Required Exchange Page Blocks

The following is the complete, ordered block map of the current `[slug].astro` template.
Status shows the minimum data requirement for the block to render.

### 2.1 Pre-Layout (Above Main Content)

| # | Block | Component | Data Source | Required? | Notes |
|---|---|---|---|---|---|
| 1 | Breadcrumbs | `Breadcrumbs` | Auto-computed | Always | Home → Exchanges → {Name} |
| 2 | Affiliate Disclosure | `AffiliateDisclosure` | — | Always | Compact variant |
| 3 | Author Card | `AuthorCard` | Hardcoded reviewer | Always | **Hardcoded: Oleksandr Shadurskyi** — must be parameterized in Sprint 02 for multi-author |
| 4 | Freshness Labels | `FreshnessLabel` ×2 | `lastVerified`, `offerLastChecked` | Always | Review date + offer date |
| 5 | Exchange Hero | `ExchangeHero` | `exchanges.json` | Always | h1, bonus, first CTA |
| 6 | Editor Summary | `EditorSummary` | `exchanges.json` + overrides | Always | Verdict, best-for, feature badges |
| 7 | Reviewer Block | `ReviewerBlock` | `reviewers.ts` | Always | Person schema JSON-LD |
| 8 | Trust Details | `<details>` | `ev` + `exchanges.json` | Always | Evidence-aware since Task 05 |

### 2.2 Main Column (Left Column of Two-Column Layout)

| # | Block | Component | Data Source | Renders When | Gold Standard? |
|---|---|---|---|---|---|
| 9 | FactCheckPanel | `FactCheckPanel` | `evidence/[slug].json` | Exchange has evidence | ✅ Required |
| 9b | Evidence Fallback | `EvidenceVerificationBlock` | `exchanges.json` | No evidence JSON | ⚠️ Legacy only |
| 10 | Verdict Block | `ExchangeVerdictBlock` | `content-overrides.json` | Override has `verdict` | ✅ Required |
| 11 | Experience Grid | `ExchangeExperienceGrid` | `content-overrides.json` | Override has `experience` | ✅ Required |
| 12 | Offer Realism | `OfferRealism` | `exchanges.json` | `offerConfidenceScore` or `realisticUserExpectation` | ✅ Required |
| 13 | Bonus Tiers | inline | `exchanges.json bonusTiers` | Array non-empty | ✅ Required |
| 14 | Deposit Methods | `GeoPaymentBlock` | `exchanges.json` | Always | ✅ Required |
| 15 | Referral Code | inline + `PromoCodeBox` | `exchanges.json promoCode` | Field non-empty | ✅ Required (if exchange has code) |
| 16 | Key Bonus Conditions | inline grid | `exchanges.json` | Always | ✅ Required |
| 17 | Fee Snippet | `FeeSnippetBlock` | `exchanges.json` fees | `spotMakerFee` defined | ✅ Required |
| 18 | How to Claim | `RequirementsBlock` | `exchanges.json requirements` | Always | ✅ Required |
| 19 | Visual Walkthroughs | `WalkthroughFlow` | `exchange-walkthroughs.ts` | Exchange has flows | 🏆 Gold only (Bybit) |
| 20 | Safety Paragraph | inline `<p>` | `exchanges.json` | Founded/licences/users present | ✅ Required |
| 21 | Key Facts Table | inline `<table>` | `exchanges.json` | Founded/licences/fees present | ✅ Required |
| 22 | Long Description | inline `<p>` | `content-overrides.json longDescription` | Always (fallback to exchange data) | ✅ Required |
| 23 | Editorial Note | `EditorialNote` | `content-overrides.json editorNote` | Override has note > 30 chars | ✅ Required |
| 24 | People Also Compare | `PeopleAlsoCompare` | `compare-pairs.json` | Exchange has compare pairs | ✅ Required |
| 25 | Pros & Cons | `ProsConsBlock` | `exchanges.json pros/cons` | Always | ✅ Required |
| 26 | Country Availability | `CountryAvailability` + `GeoRegulatoryNote` | `exchanges.json countries/excludedCountries` | Always | ✅ Required |
| 27 | Country Cross-Links | `CountryCrossLinksBlock` | `countries.json` | Exchange listed in country guides | ✅ Required |
| 28 | Bonus Category Links | `RelatedCategoriesBlock` | computed | Exchange in categories | ✅ Required |
| 29 | Related Guides | `RelatedGuidesBlock` | `guides.json` | Guides exist for exchange | ✅ Required |
| 30 | Use-Case Links | inline chips | `exchanges.json useCases` | Use cases defined | ✅ Required |
| 31 | Related Next Reads | `RelatedNextReads` | Compare pairs + guides | Any compare pairs exist | ✅ Required |
| 32 | Bonus Page Link | inline strip | `ex.slug` | Always | ✅ Required |
| 33 | Bonus Code Cross-Link | inline strip | `ex.promoCode` | Has promo code | ✅ Required |
| 34 | Coin Chips | inline chips | `exchanges.json coins` | Coins defined | ✅ Required |
| 35 | How We Evaluate | `HowWeEvaluate` | — | Always (compact) | ✅ Required |
| 36 | FAQ Block | `FAQBlock` | `content-overrides.json faqAppend` + generated | Always | ✅ Required |

### 2.3 Sidebar (Right Column)

| # | Block | Data Source | Notes |
|---|---|---|---|
| S1 | Bonus Summary | `ex.bonusAmount`, `ex.bonusCurrency`, `ex.bonusTitle` | Always. Shows "Up to X USDT" |
| S2 | Stats Chips | `ex.kycRequired`, `ex.depositRequired`, `ex.rating` | KYC / deposit / rating |
| S3 | Founded/Users/HQ Meta | `exchanges.json` | Shown if any of the three present |
| S4 | Promo Code | `ex.promoCode` | Only if non-empty |
| S5 | CTAButton | `ex.affiliateUrl` | Label adapts: "Claim — No KYC" if no KYC |
| S6 | Terms Link | `ex.termsUrl` | Only if present |
| S7 | Risk Notes | `ex.riskNotes` | Always |
| S8 | Trust List | Inline — founded, users, regions, licences | Conditional per field presence |

### 2.4 Full-Width (Below Two-Column)

| # | Block | Notes |
|---|---|---|
| F1 | AlternativesBlock | Shows all 14 exchanges except current |
| F2 | Compare vs Section | Compare pair cards; requires `compare-pairs.json` entries |
| F3 | RiskDisclaimer | Always — affiliate/risk disclaimer |

### 2.5 Schema Output (JSON-LD in `<head>`)

The template emits up to 4 schema objects:

| Schema | Builder | When | Notes |
|---|---|---|---|
| `Product` | `buildProductSchema()` | Always | Exchange as product offering |
| `ReviewPage` | `buildReviewPageSchema()` | Always | Review with author attribution |
| `FinancialService` | `buildFinancialServiceSchema()` | Always | Licences, areaServed, serviceType |
| `FAQPage` | `buildFAQSchema()` | `faqItems.length > 0` | All FAQ items; `HowTo` embedded via walkthroughs |

**WalkthroughFlow** emits its own `HowTo` schema inline per flow (when walkthrough data exists).

---

## 3. Evidence-Aware Copy Rules

These rules define what copy to display based on the current state of the exchange's evidence JSON.
All rules use fields from `evidence/[slug].json` accessed via the `ev` variable in `[slug].astro`.

### 3.1 Trust Details Block (Task 05 — Already Implemented)

| Evidence Condition | Display |
|---|---|
| `bonus_amount.conflictStatus === "outdated"` OR `bonus_amount.manualReviewRequired === true` | "**Bonus offer last checked** on {date}. Current bonus terms are under active review — verify the latest offer on the official {name} promotion page before registering." |
| All other states (ok, conflict) | "**Bonus conditions verified** against the official {name} promotion page. Bonus amounts, expiry periods and tier conditions were checked on {date}." |

> **Current state (2026-06-03):** All 14 exchanges show the "under active review" variant
> because all 14 have `bonus_amount.conflictStatus === "outdated"`.

### 3.2 ExchangeHero Bonus Display (Not Yet Fully Implemented)

| Evidence Condition | Recommended Display |
|---|---|
| Live verification `matchStatus === "match"` AND `confidenceScore >= 0.75` | ✅ Show exact amount with "Up to" prefix. No qualifier needed. |
| Live verification `matchStatus === "match"` AND `confidenceScore 0.50–0.74` | Show amount with "Up to" + add footnote: "Offer verified {date} — terms may change." |
| `bonus_amount.conflictStatus === "ok"` AND `confidenceScore >= 0.50` | Show "Up to X USDT" without special qualifier. |
| `bonus_amount.conflictStatus === "outdated"` | Show "Up to X USDT" + `bonusNote` field. Avoid presenting as confirmed. |
| `manualReviewRequired === true` | Show "Up to X USDT" + add: "Bonus terms subject to change — check the official page for current offer." |
| `confidenceScore < 0.50` | Show bonus amount with explicit qualifier: "Last recorded offer: up to X USDT. Verify current offer before registering." |
| `confidenceScore < 0.30` | Show only the bonus type (e.g., "Welcome bonus available") without a specific amount. |
| Live verification `matchStatus === "mismatch"` | Show detected amount as primary; show recorded amount as secondary with note: "Our records show X USDT but the live page shows Y — terms may have changed." |
| Live verification `matchStatus === "not_detected"` | Show only: "Welcome bonus available — see current offer on the official page." |
| Live verification `matchStatus === "blocked"` OR `"technical_error"` | Same as `not_detected`. Do not show a specific amount. |
| No live verification data | Use `bonus_amount.conflictStatus` rules above. |

### 3.3 Sidebar Bonus Amount Display

The sidebar currently always shows `ex.bonusAmount` with "Up to" prefix. This is acceptable
for the current state since:
- All exchanges use `bonusDisplayMode: "up-to"` 
- `riskNotes` field provides the disclaimer
- The `OfferRealism` component in the main column adds the full qualification

**Rule:** The sidebar MUST show "Up to X {currency}" format (never "X USDT confirmed").
The `bonusDisplayMode` field in `exchanges.json` controls the format string.

### 3.4 OfferRealism Component Thresholds

| `offerConfidenceScore` | Label | Color | Meaning |
|---|---|---|---|
| 80–100 | High Confidence | Green | Strong evidence; show full amount |
| 60–79 | Moderate Confidence | Yellow | Some uncertainty; include caveat |
| 40–59 | Variable Offer | Orange | Significant uncertainty; prominent caveat |
| < 40 | Unverified | Red | Do not show specific amount in OfferRealism |
| Not set | (block does not render) | — | Falls back to raw `bonusAmount` display |

**Bybit's current state:** `offerConfidenceScore: 72` → "Moderate Confidence" (yellow).
This is appropriate given `bonus_amount.confidenceScore: 0.27` in evidence.

### 3.5 FAQ Schema Safety Rules

| Condition | FAQ Rule |
|---|---|
| Any FAQ mentions a bonus amount | Must include "up to" prefix or explicit uncertainty qualifier |
| Any FAQ references bonus claim steps | Must include timeframe disclaimer: "within {X} days of registration" |
| Any FAQ states bonus is "guaranteed" | Blocked — all bonuses are task-based and conditional |
| FAQ mentions specific referral code | Add: "Code pre-filled via referral link — must be entered before account creation" |
| FAQ discusses country availability | Must reference `excludedCountries` if any are excluded |

### 3.6 Screenshot Evidence Rules

| Condition | Copy Rule |
|---|---|
| Screenshot `status: "available"` | Can reference screenshot in walkthrough/trust copy |
| Screenshot `status: "needs_manual_capture"` | Do not reference screenshot; omit section if screenshot-dependent |
| Screenshot `status: "available"` but file missing from disk | ⚠️ Registry error — do not render image; log as P1 issue |
| Screenshot path is `.jpg` (should be `.webp`) | Render as-is but flag for re-capture; do not rename manually |
| No screenshots for exchange | Fall back to icon-based content; walkthrough section is silently suppressed |

### 3.7 Source Evidence Rules

| Condition | Copy Rule |
|---|---|
| Fact has `officialSourceKey` or `officialSourceUrl` | Fee source link rendered by `FeeSnippetBlock` |
| Fee fact has no official source | Do not link to fee page; show fee without source attribution |
| KYC fact has official source | FactCheckPanel shows source link |
| Bonus fact `officialSourceUrl` present | Show "View official bonus terms →" link |
| Bonus fact has no source | Do not claim "verified" — use softer "recorded as of {date}" |

---

## 4. CTA Rules

### 4.1 Hero CTA (ExchangeHero Component)

| Condition | Label | Note |
|---|---|---|
| `!kycRequired && !depositRequired` | "Get Bonus — No KYC, No Deposit" | Highest conversion label |
| `!kycRequired && depositRequired` | "Get Bonus — No KYC Required" | |
| `kycRequired && !depositRequired` | "Claim {Name} Bonus" | Default |
| `kycRequired && depositRequired` | "Claim {Name} Bonus" | Default |
| `bonus_amount.confidenceScore < 0.30` | "Check Current Offer" | Do not say "Claim" for unverified bonus amounts |
| Live verification `matchStatus === "mismatch"` | "Check Current Offer" | |
| `excludedCountries` includes visitor's country | CTA blocked; show "Not available in your region" | Handled by GeoRegulatoryNote |

### 4.2 Mid-Page CTA (Within Walkthrough Flows)

| Condition | Label | Placement |
|---|---|---|
| Exchange has walkthrough flows | "Open {exchange name} ↗" | After step defined by `midCtaAfterStep` in flow data |
| Body text | "Following this guide on {exchange name}? Open your account in a new tab to complete steps as you read." | Inline in walkthrough section |

> **⚠️ Current bug:** Text is hardcoded as "Bybit" — must be parameterized as `ex.name` before
> walkthroughs are activated for a second exchange. See Section 8, Task 05.6.

### 4.3 Sidebar CTA

| Condition | Label | Note |
|---|---|---|
| `!kycRequired && !depositRequired` | "Get {Name} Bonus" | |
| `!kycRequired` | "Claim — No KYC" | Conversion-optimized for no-KYC exchanges |
| Default | "Claim {Name} Bonus" | |
| `bonus_amount.confidenceScore < 0.30` | "Check Current Offer" | **Not yet implemented** — should be added |

### 4.4 Walkthrough Flow CTA (Bottom of Each Flow)

| Condition | Label |
|---|---|
| Exchange has promoCode | "Open {Name} with Code {code}" |
| No promo code | "Open {Name} Account →" |

### 4.5 Bonus Page CTA (Cross-Link Strip)

- Always renders as: "How to Claim the {Name} Bonus → Claim Guide →"
- Links to `/bonuses/{slug}-bonus/`
- Does not display specific bonus amount (safe for all evidence states)

### 4.6 Bonus Amount in CTA Label

| Evidence State | Include Amount in CTA? | Example |
|---|---|---|
| `confidenceScore >= 0.50` AND `conflictStatus === "ok"` | ✅ Yes | "Claim Up to 30,000 USDT Bonus" |
| `conflictStatus === "outdated"` OR `confidenceScore < 0.50` | ❌ No | "Claim {Name} Bonus" |
| Live verification `matchStatus === "mismatch"` | ❌ No | "Check Current Offer" |
| `confidenceScore < 0.30` | ❌ No | "Check Current Offer" |

> **Current state:** No exchange currently meets the "include amount in CTA" threshold.
> CTA labels should use generic forms until at least one exchange achieves bonus publish-safe status.

---

## 5. SEO Rules

### 5.1 FAQ Requirements

Minimum FAQ items for a gold-standard page:
- ✅ Is {exchange} safe? (legitimacy, licences, history)
- ✅ What is the {exchange} referral code for {year}?
- ✅ How does the {exchange} welcome bonus work?
- ✅ Does {exchange} require KYC?
- ✅ What are {exchange}'s trading fees?
- ✅ What is the minimum deposit?
- ✅ Is {exchange} available in my country?
- ✅ Does {exchange} have a mobile app?
- ✅ Does {exchange} have proof of reserves?
- ✅ How long does KYC take?

All 14 exchanges currently have ≥ 9 FAQ items via `content-overrides.json faqAppend`.
Bybit has 11 items + 2 overrides = 13 total; this is the target for gold-standard coverage.

### 5.2 HowTo Schema Requirements

The `WalkthroughFlow` component emits `HowTo` schema inline when `schemaSteps` is passed.
Requirements for schema validity:
- Each step must have `name` and `text` (stripped of HTML, max 300 chars)
- Each step should have `image` URL (absolute URL with domain)
- Step `position` must be sequential starting at 1
- `HowTo.name` should match the flow title (e.g., "How to Register on Bybit")

### 5.3 Product Schema Safety

`buildProductSchema()` is called for all 14 exchanges and includes:
- `offers.price` → `ex.bonusAmount` (numeric, not string)
- `offers.priceCurrency` → `ex.bonusCurrency`
- This is **potentially problematic** if `bonusAmount` is outdated

**Rule:** When `bonus_amount.conflictStatus === "outdated"`, the Product schema's `offers.price`
should reflect the uncertainty. Ideally, `offers.priceSpecification` should note the "up to"
qualifier. **This is a Sprint 02 schema safety task.**

### 5.4 ReviewPage Schema Safety

`buildReviewPageSchema()` includes `reviewRating.ratingValue` from `ex.rating`.
This is safe — rating is separate from bonus amount.

### 5.5 Bonus Amount Phrasing Rules

| Context | Required Phrasing | Forbidden |
|---|---|---|
| Hero h1 / page title | "Up to X USDT" | "Get X USDT" / "Earn X USDT" / "X USDT bonus" without qualifier |
| FAQ answer about bonus | "up to X USDT across all tasks" | "X USDT guaranteed" / "receive X USDT" |
| Sidebar bonus amount | "Up to X {currency}" | "X USDT for free" |
| CTA labels | "Claim Bonus" or "Check Current Offer" | Specific amounts in CTAs when confidence < 0.50 |
| Schema `offers.price` | Numeric value only (X USDT) | No qualifier in schema — qualifier belongs in `offers.description` |
| Content body | "up to X USDT" + realistic expectation | "you will receive X USDT" |

### 5.6 Country Availability Phrasing

Required elements:
- "Available in {N}+ countries" (from `ex.countries.length`)
- Explicit exclusion: "Not available to residents of {excluded countries}"
- GeoRegulatoryNote renders visitor-country-specific text automatically

Forbidden:
- "Available worldwide" without noting exclusions
- Omitting US/UK/Canada exclusion when those countries are in `excludedCountries`

### 5.7 Bonus Terms May Change Wording

The following disclaimer variants are **required** in at least one location per page:

| Location | Required Wording |
|---|---|
| Trust-details block (for outdated evidence) | "Current bonus terms are under active review — verify the latest offer on the official page before registering." |
| OfferRealism footer | "Conditions verified by CryptoBonusWorld editorial team." |
| Sidebar risk notes | Exchange-specific risk note from `ex.riskNotes` (e.g., "Bonus terms may change without notice…") |
| RiskDisclaimer (full-width) | Always rendered at page bottom |
| FAQ answer for bonus claim | "All tasks must be completed within {X} days of registration. Bonus vouchers cannot be withdrawn directly." |

---

## 6. Screenshot and Evidence Rules

### 6.1 Required Screenshot Categories

For a gold-standard page, the following 10 screenshot categories should be present in
`evidence/[slug].json` with `status: "available"`:

| Category | Auth Required | Priority | Notes |
|---|---|---|---|
| `registration` | PUBLIC | P1 | Sign-up form showing promo code field |
| `kyc` | AUTH_SAFE | P1 | KYC level selection / document upload screen |
| `bonus` | PUBLIC | P1 | Welcome bonus / promotion page |
| `deposit` | AUTHED | P1 | Deposit crypto screen (no wallet addresses visible) |
| `p2p` | PUBLIC | P2 | P2P marketplace listing view |
| `spot` | PUBLIC | P2 | Spot trading interface |
| `futures` | PUBLIC | P2 | Futures contract page |
| `fees` | PUBLIC | P1 | Official fee schedule page |
| `mobile_app` | PUBLIC | P2 | App store listing or in-app screenshot (no personal data) |
| `proof_of_reserves` | PUBLIC | P2 | PoR page or report |

**Bybit current coverage:** 7/10 (missing: `fees`, `mobile_app`, `proof_of_reserves`)  
**Binance current coverage:** 8/10 (missing: `kyc`, `deposit`)

> **Note:** A discrepancy exists between the governance report (shows Binance 0/10) and
> the screenshot registry audit (shows 8 Binance files on disk). The screenshot registry
> audit is the authoritative source. The governance report may have a counting bug for
> Binance. Track as Task 07 investigation item.

### 6.2 When Screenshot Is Missing

| Situation | Action |
|---|---|
| Category has `status: "needs_manual_capture"` | Section relying on that screenshot silently suppresses. OK — no broken image. |
| Category has `status: "available"` but `path` is null | Template renders nothing (path null check exists). |
| Category has `status: "available"` AND `path` non-null AND file not on disk | 🚨 P1 Error — file referenced but not present. Breaks rendering or shows broken image. Fix immediately. |
| Walkthrough `step.src` points to missing file | 🚨 P1 Error — Astro will reference the path at build time; broken images in production. |
| No screenshot registry entry for category | Warning only — capture URLs can be added without affecting rendering. |

### 6.3 Screenshot Path Mismatch (jpg vs webp)

**Current Bybit issue:** `evidence/bybit.json` bonus screenshot references
`global-desktop-2026-06.jpg` but registry expects `.webp` convention.
The file exists on disk as `.jpg`. The screenshot registry marks this as P1 error.

**Rules:**
- ✅ DO render the `.jpg` file as-is — it exists and will display correctly
- ❌ DO NOT rename the file manually (breaks the evidence JSON reference and git history)
- ✅ DO add a `notes` field in evidence JSON: "File is .jpg — recapture as .webp in next cycle"
- ✅ DO recapture as `.webp` in the next screenshot harvest cycle
- ✅ DO update both the evidence JSON path AND the disk file in the same operation

### 6.4 Screenshot Re-Capture Requirements

A screenshot should be re-captured when any of the following are true:
- File is `.jpg` format (convention requires `.webp`)
- `capturedAt` is more than 90 days ago
- The exchange's UI has materially changed since capture
- The bonus amount shown in the screenshot differs from current `bonus_amount.currentValue`
- Evidence `bonus_amount.conflictStatus === "outdated"` — bonus page may show different amount

**Do not re-capture:**
- Screenshots of fee schedules unless fees have changed
- Registration screens unless the form layout has changed
- KYC screens unless the flow has changed

### 6.5 What Must Not Be Renamed Manually

- Any screenshot file in `public/screenshots/` must not be renamed manually unless the
  `evidence/[slug].json` `screenshots.{category}.path` is updated in the same operation
- The `capture-registry.ts` expected output paths must align with both disk files and evidence paths
- If a file is renamed: update evidence JSON → rebuild → run `npm run screenshots:registry:audit` → verify 0 errors

---

## 7. Application Plan to Other Exchanges

### 7.1 Priority Exchange Matrix

| Exchange | EMS | Screenshots | Bonus Conf | Walkthroughs | Verdict/FAQ | Missing Blocks | Priority | Recommended Next Action |
|---|---|---|---|---|---|---|---|---|
| **Binance** | 65 | 8/10 ✅ | 0.41 ⚠️ | ❌ | ✅ full | walkthroughs, `offerConfidenceScore`, `realisticUserExpectation`, `bonusConditionSummary`, `verificationLastChecked` | **P1** | Add 5 missing `exchanges.json` fields to activate OfferRealism block. No walkthroughs until bug fixed. |
| **MEXC** | 67 | 0/10 ❌ | 0.44 ⚠️ | ❌ | ✅ full | all screenshots, walkthroughs, `offerConfidenceScore`, realism fields | **P1** | Screenshot harvest (`npm run screenshots:harvest:mexc`) — 0 files on disk is the primary gap. Then add realism fields. |
| **OKX** | 66 | 0/10 ❌ | 0.41 ⚠️ | ❌ | ✅ full | all screenshots, walkthroughs, `offerConfidenceScore`, realism fields | **P1** | Screenshot harvest (`npm run screenshots:harvest:okx`). Note: OKX mystery box mechanic may need custom `bonusDisplayMode: "mystery_box"` |
| **Bitget** | 66 | 0/10 ❌ | 0.44 ⚠️ | ❌ | ✅ full | all screenshots, walkthroughs, `offerConfidenceScore`, realism fields | **P2** | Screenshot harvest. 3 manual review flags need clearing before realism block is trustworthy. |
| **BingX** | 65 | 0/10 ❌ | 0.44 ⚠️ | ❌ | ✅ full | all screenshots, walkthroughs, 2 unverified facts, `offerConfidenceScore` | **P2** | Screenshot harvest. Clear 2 unverified facts and 3 manual review flags before realism block. |

### 7.2 Per-Exchange Detailed Analysis

#### Binance (Priority: P1)

| Item | State | Action |
|---|---|---|
| EMS | 65/100 (Fair) | Addressable — 4 outdated bonus facts, needs-check on licences |
| Screenshots | 8 disk files (8/10) | Best coverage after Bybit. Add `kyc`, `deposit` to reach 10/10 |
| Bonus confidence | 0.41 — below 0.50 threshold | Need source re-verification. All 4 bonus facts outdated. |
| `offerConfidenceScore` | Not in exchanges.json | Add field to activate OfferRealism block |
| `realisticUserExpectation` | Not in exchanges.json | Add — typical user earns 50–200 USDT, not 19,800 |
| `bonusConditionSummary` | Not in exchanges.json | Add — "KYC + first deposit + futures volume, 30-day window" |
| `verificationLastChecked` | Not in exchanges.json | Add — maps to `offerLastChecked` field |
| Walkthroughs | None | Blocked until Task 05.6 (hardcoded "Bybit" bug fixed) |
| FactCheckPanel | ✅ Active (evidence exists) | No action needed |
| Trust copy | ✅ "Under review" variant active | Correct — bonus_amount is outdated |

**Evidence note:** Binance has `licences: ["Multiple regional licences"]` with `conflictStatus: "needs-check"`.
This is the only exchange with a `needs-check` fact. Needs clarification before publishing.

#### MEXC (Priority: P1)

| Item | State | Action |
|---|---|---|
| EMS | 67/100 (Fair) | Addressable — 3 outdated, 1 unverified, 2 manual review |
| Screenshots | 0 disk files | **Critical gap** — run `npm run screenshots:harvest:mexc` |
| Bonus confidence | 0.44 — below 0.50 | `bonus_requires_deposit: false` is key differentiator (no deposit needed) |
| `offerConfidenceScore` | Not in exchanges.json | Add after screenshot coverage reached |
| No-KYC feature | `kyc_required: false` | This is MEXC's key differentiator — sidebar CTA will show "Claim — No KYC" automatically |
| Unverified fact | 1 (`bonus_requires_deposit` possibly) | Needs source link added |
| Walkthroughs | None | Blocked until Task 05.6 |
| Special note | No-KYC flow makes registration screenshot especially valuable | Capture registration screenshot showing no ID requirement |

#### OKX (Priority: P1)

| Item | State | Action |
|---|---|---|
| EMS | 66/100 (Fair) | 4 outdated, 1 manual review flag |
| Screenshots | 0 disk files | Run `npm run screenshots:harvest:okx` |
| Bonus confidence | 0.41 — below 0.50 | Mystery box mechanic is unusual — `bonus_amount: 5000 USDT` may be misleading (typical is $5–$50) |
| `bonusDisplayMode` | Likely "up-to" but should be reviewed | Consider `"mystery_box"` display mode for accurate representation |
| `offerConfidenceScore` | Not set | Add — should be lower than Bybit (mystery box inherently uncertain) |
| Manual review | 1 fact | Clear before activating OfferRealism |
| Special note | OKX publishes probability table for mystery box — should be reflected in FAQ and OfferRealism content | Content-only change, no template change needed |

#### Bitget (Priority: P2)

| Item | State | Action |
|---|---|---|
| EMS | 66/100 (Fair) | 3 outdated, 1 unverified, 1 needs-check, 3 manual reviews |
| Screenshots | 0 disk files | Run `npm run screenshots:harvest:bitget` |
| Bonus confidence | 0.44 — below 0.50 | All 3 main bonus facts outdated |
| Manual review flags | 3 | Highest among P2 exchanges — clear before activating OfferRealism |
| `offerConfidenceScore` | Not set | Add after clearing manual review flags |
| Copy trading | Bitget's key differentiator (90,000 signal traders) | Ensure FAQ and editorNote reflect this prominently |
| Evidence gap | `bonus_requires_deposit` and `bonus_expiry_days` both outdated | Re-verify via live verification before publishing |

#### BingX (Priority: P2)

| Item | State | Action |
|---|---|---|
| EMS | 65/100 (Fair) | 3 outdated, 2 unverified, 3 manual review flags |
| Screenshots | 0 disk files | Run `npm run screenshots:harvest:bingx` |
| Bonus confidence | 0.44 — below 0.50 | |
| Unverified facts | 2 | Need source links — these are the only unverified non-bitunix facts |
| Manual review | 3 | Highest among P2 group after bitget |
| Special note | BingX grid trading is a differentiator; no walkthrough yet — consider adding grid trading screenshots once screenshot harvest done | |

### 7.3 Evidence Actions Required Before OfferRealism Can Activate

The `OfferRealism` block requires `offerConfidenceScore` to be non-null in `exchanges.json`.
None of Binance, MEXC, OKX, Bitget, or BingX currently have this field.

**Formula to set `offerConfidenceScore` for new exchanges:**
```
If bonus_amount.conflictStatus === "ok" AND bonus_amount.confidenceScore >= 0.70: score = 80
If bonus_amount.conflictStatus === "ok" AND bonus_amount.confidenceScore 0.50–0.69: score = 65
If bonus_amount.conflictStatus === "outdated" AND bonus_amount.confidenceScore >= 0.50: score = 55
If bonus_amount.conflictStatus === "outdated" AND bonus_amount.confidenceScore < 0.50: score = 35
If manualReviewRequired === true: score max = 50
```

Based on current evidence, these would be the starting `offerConfidenceScore` values:
- Binance: ~35 (outdated, 0.27 confidence)
- MEXC: ~35 (outdated, 0.27 confidence)
- OKX: ~35 (outdated, 0.27 confidence) — additionally reduce for mystery box uncertainty
- Bitget: ~35 (outdated, 0.27 confidence)
- BingX: ~35 (outdated, 0.27 confidence)

---

## 8. Refactor Recommendation

### 8.1 Current Template Assessment

`src/pages/exchanges/[slug].astro` is:
- **1,898 lines** — large but well-organized with clear section comments
- **Conditionally rendered** — almost every block is guarded by `{condition && (...)}` 
- **Data-layer driven** — blocks activate via data fields, not code changes
- **Stable** — serves 14 production pages with 207 total builds; no known rendering bugs

### 8.2 Recommendation: Keep Current Template — Extract Later

**Do NOT refactor `[slug].astro` in Sprint 01 or Sprint 02.**

**Rationale:**

1. **Premature extraction creates risk without reward.** The template currently works correctly for all 14 exchanges. Extraction would require rebuilding all 14 pages from scratch to verify no regressions. The risk/reward ratio is unfavorable at this stage.

2. **Only one exchange is at gold standard.** Component extraction should happen when at least 3–4 exchanges follow the same structure with the same blocks. Currently only Bybit has walkthroughs. If we extract a `<WalkthroughSection>` component now, it will serve 1 exchange and add complexity without reuse benefit.

3. **The existing conditional rendering is the correct pattern.** Every block being guarded by a data condition is exactly the right design for a shared template. This is preferable to a per-exchange template system.

4. **The real gap is data, not template architecture.** MEXC, OKX, Bitget, and BingX are missing screenshots and `offerConfidenceScore`. Adding those data fields will immediately improve all 4 pages without any template changes.

**The extraction trigger should be:** When 3 or more exchanges have walkthrough flows AND the mid-CTA hardcoded "Bybit" text (Task 05.6) is a production bug that has been reported.

### 8.3 Specific Refactor Items (Defer to Sprint 03+)

| Item | Why Defer | When to Do |
|---|---|---|
| Extract `<WalkthroughSection>` component | Only 1 exchange uses it now | After 3+ exchanges have walkthroughs |
| Parameterize mid-CTA exchange name | **Task 05.6 — Do this in Sprint 02** | Needed before enabling walkthroughs for a 2nd exchange |
| Parameterize `AuthorCard` reviewer | Hardcoded "Oleksandr Shadurskyi" | Sprint 02 multi-author implementation |
| Extract sidebar as component | Sidebar is 80 lines; extraction adds no value yet | Sprint 03+ |
| Type-safe `(ex as any)` casts | ~30 `as any` casts in template | Sprint 03 — needs `exchanges.json` TypeScript schema update |
| Extract trust-details as component | Trust-details is 40 lines | Only when it diverges significantly across exchanges |

---

## 9. Next Implementation Tasks

### Task 05.6 — Fix Hardcoded "Bybit" in Mid-Flow CTA (Sprint 02, P1)

**File:** `src/pages/exchanges/[slug].astro`, lines ~702–713  
**Issue:** CTA text reads `"Following this guide on Bybit?"` and `"Open Bybit ↗"` — hardcoded.  
**Fix:** Replace with `ex.name` dynamic interpolation.  
**Before enabling walkthroughs for any second exchange, this fix is mandatory.**  
**Risk:** LOW — a 3-line template change; build will verify all 14 pages.

### Task 07 — Screenshot Harvest for P1 Exchanges (Sprint 02, P1)

**Scope:** MEXC, OKX, Binance (complete gaps), Bybit (fees, mobile_app, proof_of_reserves)  
**Commands:**
```
npm run screenshots:harvest:mexc
npm run screenshots:harvest:okx  
npm run screenshots:harvest:binance
```
**Outcome:** Raises screenshot coverage from 15/152 to ~50+/152.  
**Prerequisite:** None — can run immediately.  
**Risk:** LOW — read-only screenshot capture, no data modification.

### Task 08 — OfferRealism Activation for P1 Exchanges (Sprint 02, P1)

**Scope:** Add to `exchanges.json` for Binance, MEXC, OKX, Bitget:
- `offerConfidenceScore` (integer 0–100)
- `realisticUserExpectation` (string)
- `bonusConditionSummary` (string)
- `verificationLastChecked` (date)

**Prerequisite:** Task 07 (screenshots) should be complete; evidence state should be understood before setting confidence scores.

### Task 09 — Bonus Verification Re-Run (Sprint 02, P1)

**Scope:** Run `npm run bonus:verify:all --write` to get fresh live verification snapshots for all 14 exchanges.  
**Outcome:** Clears `conflictStatus: "outdated"` for any exchange where live verification confirms the current bonus amount. Unlocks the strong "Bonus conditions verified" trust copy for verified exchanges.  
**Current blockage:** Bybit live verification gives `ERR_HTTP2_PROTOCOL_ERROR` — retry needed.

### Task 10 — Schema Safety Audit for Product Offers (Sprint 02, P2)

**Scope:** Review `buildProductSchema()` to ensure `offers.price` handling is evidence-aware.  
**Issue:** Schema emits `offers.price: 30000` for Bybit even though bonus_amount is outdated.  
**Fix:** When `conflictStatus === "outdated"`, emit `offers.description` with qualifier instead of relying on `price` alone.

### Task 11 — Multi-Exchange Content Brief Generation (Sprint 02, P2)

**Scope:** Run `npm run articles:brief` for MEXC, OKX, Bitget, BingX, Binance.  
**Outcome:** Generates editorial content briefs identifying content gaps for each exchange page.

### Task 12 — bitunix Evidence Triage (Sprint 02, P1)

**Scope:** 8 unverified facts, 7 manual review flags — worst evidence state in the dataset.  
**Action:** Manual verification of all 8 unverified facts against official bitunix pages.  
**This is the highest-urgency evidence task in the entire dataset.**

---

## Appendix A: Full Exchange Readiness Scorecard

| Exchange | EMS | Disk Screenshots | Bonus Conf | Has OfferRealism | Has Walkthroughs | Has Full Overrides | Template Readiness |
|---|---|---|---|---|---|---|---|
| **bybit** | 73 ✅ | 7 ✅ | 0.41 ⚠️ | ✅ (72/100) | ✅ 4 flows | ✅ | 🏆 Gold Standard |
| **binance** | 65 ⚠️ | 8 ✅ | 0.41 ⚠️ | ❌ | ❌ | ✅ | 🥈 Near-Gold (add realism fields) |
| **mexc** | 67 ⚠️ | 0 ❌ | 0.44 ⚠️ | ❌ | ❌ | ✅ | 🥉 Good (needs screenshots) |
| **okx** | 66 ⚠️ | 0 ❌ | 0.41 ⚠️ | ❌ | ❌ | ✅ | 🥉 Good (needs screenshots) |
| **bitget** | 66 ⚠️ | 0 ❌ | 0.44 ⚠️ | ❌ | ❌ | ✅ | ⚠️ Needs work (3 manual reviews) |
| **bingx** | 65 ⚠️ | 0 ❌ | 0.44 ⚠️ | ❌ | ❌ | ✅ | ⚠️ Needs work (2 unverified facts) |
| **kucoin** | 68 ⚠️ | 0 ❌ | 0.45 ⚠️ | ❌ | ❌ | ✅ | ⚠️ Moderate |
| **coinbase** | 73 ✅ | 0 ❌ | 0.53 ⚠️ | ❌ | ❌ | ✅ | ⚠️ High EMS but 0 screenshots |
| **gate-io** | 67 ⚠️ | 0 ❌ | 0.44 ⚠️ | ❌ | ❌ | ✅ | ⚠️ Moderate |
| **htx** | 66 ⚠️ | 0 ❌ | 0.44 ⚠️ | ❌ | ❌ | ✅ | ⚠️ Moderate |
| **coinex** | 65 ⚠️ | 0 ❌ | 0.45 ⚠️ | ❌ | ❌ | ✅ | ⚠️ Moderate |
| **phemex** | 65 ⚠️ | 0 ❌ | 0.44 ⚠️ | ❌ | ❌ | ✅ | ⚠️ Moderate |
| **lbank** | 64 ⚠️ | 0 ❌ | 0.43 ⚠️ | ❌ | ❌ | ✅ | ⚠️ Moderate |
| **bitunix** | 59 ❌ | 0 ❌ | 0.42 ⚠️ | ❌ | ❌ | ✅ | 🔴 Needs triage (8 unverified) |

---

## Appendix B: Data Fields Required for Gold Standard (exchanges.json)

The following `exchanges.json` fields must be populated for a page to reach Gold Standard:

**Core (already present on all exchanges):**
- `slug`, `name`, `rating`, `bonusAmount`, `bonusCurrency`, `bonusTitle`
- `affiliateUrl`, `kycRequired`, `depositRequired`
- `pros[]`, `cons[]`, `requirements[]`, `bonusTypes[]`
- `countries[]`, `paymentMethods[]`

**Standard (present on Bybit, missing on some others):**
- `offerLastChecked` — date of last manual bonus page check
- `lastVerified` — date of last full page review
- `spotMakerFee`, `spotTakerFee` — required for FeeSnippetBlock
- `futuresMakerFee`, `futuresTakerFee` — required for futures fee display
- `promoCode` — required for PromoCodeBox and referral section
- `excludedCountries[]` — required for geo restriction display
- `bonusTiers[]` — required for bonus breakdown block
- `longDescription` — required (or via content-overrides)
- `riskNotes` — required for sidebar disclaimer

**Gold Standard (Bybit has all; others are missing some):**
- `offerConfidenceScore` (0–100) — required for OfferRealism block
- `realisticUserExpectation` — required for OfferRealism copy
- `bonusConditionSummary` — required for OfferRealism conditions text
- `verificationLastChecked` — required for OfferRealism verification date
- `bonusDisplayMode` — controls "up-to" vs "fixed" vs other bonus display variants
- `bonusNote` — optional bonus caveat shown in hero
- `headquarters` — required for Key Facts table and trust paragraph
- `founded` — required for Key Facts table and trust paragraph
- `users` — required for Key Facts table and trust paragraph
- `licences[]` — required for trust paragraph and FinancialService schema
- `proofOfReserves` (boolean) — required for "Is safe?" paragraph

---

## Appendix C: Evidence JSON Fields Required for Gold Standard

**Required for FactCheckPanel:**
- At minimum: `bonus_amount`, `spot_maker_fee`, `spot_taker_fee`, `kyc_required`, `p2p_available`
- Recommended: `proof_of_reserves`, `restricted_us`, `futures_available`

**Required for FeeSnippetBlock source URL:**
- `sources.fees.url` — official fee schedule URL

**Screenshot section minimum:**
- At least 5 categories with `status: "available"` and valid disk paths

**Source coverage minimum:**
- At least 8 sources for `sources` score to reach 10/10

---

*End of Gold Standard Exchange Page Template v1.0*  
*Generated for Sprint 01 — Production Foundation*  
*Next update: After Task 07 (screenshots harvest) — update Appendix A readiness scores*  
*See also: `docs/CBW_SPRINT_01_IMPLEMENTATION_PLAN.md`, `reports/evidence-governance-report.md`*
