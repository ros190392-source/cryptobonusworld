# CryptoBonusWorld — Exchange Intelligence Profile Standard

**Version:** 1.0  
**Created:** 2026-06-08  
**Sprint:** Sprint 06  
**Status:** ACTIVE — defining the standard data format for every exchange intelligence profile  
**Owner:** ROLE 0 — Chief Project Owner  
**Role:** ROLE 37 — Exchange Intelligence Owner

> The exchange intelligence profile is the single source of truth for everything that is known
> about a specific exchange: its affiliate offer, products, availability, screenshots, risks,
> and content map. This document defines the standard format, schema, source confidence model,
> and no-autopublish rules that govern all 14 exchange profiles.

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Recommended Data Location](#2-recommended-data-location)
3. [Profile Schema](#3-profile-schema)
4. [Source Confidence Model](#4-source-confidence-model)
5. [Screenshot Source Map](#5-screenshot-source-map)
6. [No-Autopublish Rule](#6-no-autopublish-rule)
7. [Binance Pilot](#7-binance-pilot)
8. [Relationship with Existing Files](#8-relationship-with-existing-files)
9. [Implementation Roadmap](#9-implementation-roadmap)

---

## 1. Purpose

CryptoBonusWorld's content system relies on multiple JSON data files per exchange:
`exchanges.json`, `content-overrides.json`, `evidence/{exchange}.json`,
`exchange-availability/{exchange}.json`. These files serve specific rendering purposes —
they drive what appears on public pages.

The **exchange intelligence profile** is different. It is not a rendering file.
It is a **knowledge base** — a planning and audit resource that ROLE 37 maintains and that
every other role can query before beginning work on that exchange's pages.

**What the profile solves:**

- Every role that touches Binance pages has to re-discover the same URLs, fees, restrictions,
  and screenshot targets from scratch. The profile eliminates that re-discovery.
- Claims about fees, availability, and products often drift across files as individual roles
  update their own slice. The profile holds the canonical answer for planning purposes.
- Screenshot targets (which URL to visit, what to capture, what to mask) are scattered
  across notes and reports. The profile centralises the screenshot target map.
- Content gaps (pages that should exist but don't) are never systematically tracked.
  The profile introduces a content map section with future page opportunities.
- Risk and incident history (the 2019 Binance hack, regulatory settlements) affects trust copy
  but is never tracked in a structured form. The profile adds a risk/incidents section.

---

## 2. Recommended Data Location

Exchange intelligence profiles are stored in:

```
src/data/exchange-intelligence/
  binance.json        ← Pilot (Phase 2)
  bybit.json          ← Phase 3
  okx.json            ← Phase 3
  mexc.json           ← Phase 3
  bitget.json         ← Phase 4
  bingx.json          ← Phase 4
  gate-io.json        ← Phase 4
  kucoin.json         ← Phase 4
  htx.json            ← Phase 4
  coinbase.json       ← Phase 4
  coinex.json         ← Phase 5
  phemex.json         ← Phase 5
  bitunix.json        ← Phase 5
  lbank.json          ← Phase 5
```

**This directory is gitignored.** Intelligence profiles feed planning and War Room sessions.
They are not rendering data sources. They are not deployed to the VPS.

> If `src/data/exchange-intelligence/` is not yet in `.gitignore`, add it before committing
> any files to the directory. The directory must also be excluded from `npm run build`.

---

## 3. Profile Schema

The canonical JSON schema for every exchange intelligence profile.
Comments below explain each section — remove comments in actual JSON files.

```json
{
  "exchange": "binance",
  "lastUpdated": "2026-06-08",
  "ownerRole": "Binance Intelligence Owner",
  "schemaVersion": "1.0",

  "affiliate": {
    "primaryUrl": "https://www.binance.com/join?ref=CRYPTOBONUSW",
    "referralCode": "CRYPTOBONUSW",
    "promoCode": "CRYPTOBONUSW",
    "bonusAmount": "19,800",
    "bonusCurrency": "USDT",
    "bonusMaxNote": "Maximum ceiling — requires all task milestones to be completed",
    "bonusTermsUrl": "https://www.binance.com/en/activity/referral",
    "bonusTaskStructure": "tiered — KYC + deposit + trading volume milestones",
    "bonusExpiryDays": 30,
    "bonusVoucherType": "trading_fee_voucher",
    "bonusWithdrawableNote": "Vouchers are not withdrawable cash — only profits from trading with them can be withdrawn",
    "realisticEarningsNote": "Most users completing a standard deposit earn 50–200 USDT in the first week",
    "ownerApprovalRequiredForChanges": true,
    "immutableNote": "Affiliate URL and referral code are IMMUTABLE — changes require ROLE 0 explicit approval",
    "lastVerified": "2026-06-04",
    "lastVerifiedBy": "human",
    "confidenceScore": 0.85
  },

  "officialPages": {
    "home": "https://www.binance.com/",
    "registration": "https://www.binance.com/join?ref=CRYPTOBONUSW",
    "bonus": "https://www.binance.com/en/activity/referral",
    "fees": "https://www.binance.com/en/fee/schedule",
    "spot": "https://www.binance.com/en/trade/BTC_USDT",
    "futures": "https://www.binance.com/en/futures/BTCUSDT",
    "copyTrading": "https://www.binance.com/en/copy-trading",
    "p2p": "https://p2p.binance.com/",
    "earn": "https://www.binance.com/en/earn",
    "kyc": "https://www.binance.com/en/my/settings/profile",
    "kycGuide": "https://www.binance.com/en/support/faq/how-to-complete-identity-verification-360027287111",
    "proofOfReserves": "https://www.binance.com/en/proof-of-reserves",
    "security": "https://www.binance.com/en/security",
    "appDownload": "https://www.binance.com/en/download",
    "appIos": "https://apps.apple.com/app/binance-buy-bitcoin-crypto/id1436799971",
    "appAndroid": "https://play.google.com/store/apps/details?id=com.binance.dev",
    "supportedRegions": "https://www.binance.com/en-GB/support-region-list",
    "terms": "https://www.binance.com/en/terms",
    "announcements": "https://www.binance.com/en/support/announcement",
    "helpCenter": "https://www.binance.com/en/support"
  },

  "products": {
    "spot": {
      "available": true,
      "tradingPairsCount": 1400,
      "makerFee": 0.1,
      "takerFee": 0.1,
      "feeUnit": "%",
      "bnbDiscountAvailable": true,
      "bnbDiscountRate": "25%",
      "bnbDiscountedFee": 0.075,
      "sourceUrl": "https://www.binance.com/en/fee/schedule",
      "lastChecked": "2026-05-25",
      "confidenceScore": 0.76
    },
    "futures": {
      "available": true,
      "type": "USDT-margined perpetual",
      "maxLeverage": 125,
      "maxLeveragePair": "BTC/USDT",
      "makerFee": 0.02,
      "takerFee": 0.05,
      "feeUnit": "%",
      "riskNote": "Futures carry substantial risk of capital loss — not for beginners",
      "sourceUrl": "https://www.binance.com/en/fee/schedule",
      "lastChecked": "2026-05-25",
      "confidenceScore": 0.76
    },
    "copyTrading": {
      "available": true,
      "sourceUrl": "https://www.binance.com/en/copy-trading",
      "lastChecked": "2026-05-25",
      "confidenceScore": 0.80
    },
    "earn": {
      "available": true,
      "types": ["Simple Earn (flexible)", "Simple Earn (locked)", "Launchpool", "on-chain staking"],
      "sourceUrl": "https://www.binance.com/en/earn",
      "lastChecked": "2026-05-25",
      "confidenceScore": 0.80
    },
    "p2p": {
      "available": true,
      "platformFee": 0,
      "platformFeeNote": "0% platform fee — sellers set their own spread",
      "fiatCurrenciesApprox": 100,
      "paymentMethodsApprox": 700,
      "defaultLocaleRisk": "Platform may show CNY market by default depending on IP — P2P screenshots must use USD/USDT direction",
      "sourceUrl": "https://p2p.binance.com/",
      "lastChecked": "2026-05-25",
      "confidenceScore": 0.90
    },
    "cardBuy": {
      "available": "partial",
      "availabilityNote": "Card buy availability varies by country and issuing bank. Not universal.",
      "processorFeeRange": "1.8–3.5%",
      "processorFeeNote": "Fee set by processor (Simplex, Banxa, etc.) — not by Binance directly",
      "sourceUrl": "https://www.binance.com/en/buy-sell-crypto",
      "lastChecked": "2026-05-25",
      "confidenceScore": 0.65
    },
    "app": {
      "iosAvailable": true,
      "androidAvailable": true,
      "iosUrl": "https://apps.apple.com/app/binance-buy-bitcoin-crypto/id1436799971",
      "androidUrl": "https://play.google.com/store/apps/details?id=com.binance.dev",
      "availabilityCaveat": "Standard Binance app may not be available in US/UK App Store — not available where Binance.com is restricted",
      "downloadPageUrl": "https://www.binance.com/en/download",
      "lastChecked": "2026-05-25",
      "confidenceScore": 0.85
    }
  },

  "availability": {
    "supportedRegionsSource": "https://www.binance.com/en-GB/support-region-list",
    "supportedRegionsSourceDate": "2025-10-09",
    "supportedRegionsCount": 195,
    "restrictedRegionsSource": "https://www.binance.com/en/terms",
    "restrictedRegionsSourceNote": "Terms reference a prohibited-countries list but the URL (https://www.binance.com/en/legal/restricted-locations) returns HTTP 404 as of 2026-06-06",
    "confidence": "medium_high_for_app_supported_regions_only",
    "manualReviewRequired": true,
    "publiclyKnownRestrictions": {
      "unitedStates": "Binance.com does not serve US residents. Binance.US is a separate licensed entity.",
      "unitedKingdom": "Binance restricted from offering services in the UK under FCA guidance.",
      "canada": "Listed in app supported regions but also in Binance Pay B2C restriction list. General platform access requires monitoring.",
      "confidence": "high for US and UK restrictions; medium for Canada; low for full prohibited list"
    },
    "integrationFile": "src/data/exchange-availability/binance.json",
    "integrationStatus": "not_integrated_to_public_pages",
    "ownerApprovalRequired": true
  },

  "screenshotTargets": [
    {
      "screenshotId": "bonus_referral_landing",
      "targetUrl": "https://www.binance.com/join?ref=CRYPTOBONUSW",
      "section": "Bonus / Affiliate Offer",
      "claimSupported": "19,800 USDT new-user signup reward available via CRYPTOBONUSW",
      "captureType": "affiliate_public",
      "risk": "low",
      "maskingRequired": [],
      "currentStatus": "available",
      "publishAllowed": true,
      "ownerApprovalRequired": false,
      "notes": "Shows 19,800 USD + CRYPTOBONUSW attribution. Email field empty — do not submit form."
    },
    {
      "screenshotId": "registration_demo_state",
      "targetUrl": "https://www.binance.com/join?ref=CRYPTOBONUSW",
      "section": "Registration walkthrough",
      "claimSupported": "Registration referral flow correctly attributes CRYPTOBONUSW",
      "captureType": "affiliate_public",
      "risk": "low",
      "maskingRequired": [],
      "currentStatus": "available",
      "publishAllowed": true,
      "ownerApprovalRequired": false,
      "notes": "Pre-registration form state — email field empty, do not submit."
    },
    {
      "screenshotId": "fees",
      "targetUrl": "https://www.binance.com/en/fee/schedule",
      "section": "Fees",
      "claimSupported": "Spot 0.1% maker/taker; futures 0.02%/0.05%; BNB discount",
      "captureType": "public",
      "risk": "low",
      "maskingRequired": [],
      "currentStatus": "available",
      "publishAllowed": true,
      "ownerApprovalRequired": false
    },
    {
      "screenshotId": "proof_of_reserves",
      "targetUrl": "https://www.binance.com/en/proof-of-reserves",
      "section": "Trust / Security",
      "claimSupported": "Binance publishes Proof of Reserves monthly with Merkle tree verification",
      "captureType": "public",
      "risk": "low",
      "maskingRequired": [],
      "currentStatus": "available",
      "publishAllowed": true,
      "ownerApprovalRequired": false
    },
    {
      "screenshotId": "spot",
      "targetUrl": "https://www.binance.com/en/trade/BTC_USDT",
      "section": "Spot trading interface",
      "claimSupported": "Binance has full-featured spot trading interface with 1,400+ pairs",
      "captureType": "public",
      "risk": "low",
      "maskingRequired": [],
      "currentStatus": "available",
      "publishAllowed": true,
      "ownerApprovalRequired": false
    },
    {
      "screenshotId": "p2p",
      "targetUrl": "https://p2p.binance.com/en/trade/all-payments/USDT",
      "targetUrlNote": "Must load USD/USDT direction — not default CNY market",
      "section": "P2P trading",
      "claimSupported": "Binance P2P marketplace with 0% fee and 100+ fiat currencies",
      "captureType": "public",
      "risk": "medium",
      "maskingRequired": ["merchant_names", "merchant_usernames"],
      "currentStatus": "needs_manual_capture",
      "publishAllowed": false,
      "ownerApprovalRequired": true,
      "rejectionReason": "Previous capture showed CNY market (wrong locale). Must recapture using USD/USDT direction URL with merchant names blurred."
    },
    {
      "screenshotId": "mobile_app",
      "targetUrl": "https://www.binance.com/en/download",
      "section": "Mobile app",
      "claimSupported": "Binance has iOS and Android apps available for download",
      "captureType": "public",
      "risk": "low",
      "maskingRequired": [],
      "currentStatus": "needs_manual_capture",
      "publishAllowed": false,
      "ownerApprovalRequired": true,
      "rejectionReason": "Previous capture showed 'An Error Occurred' error state. Must recapture clean /en/download page."
    },
    {
      "screenshotId": "kyc",
      "targetUrl": "https://www.binance.com/en/my/settings/profile",
      "targetUrlNote": "Authenticated — Verification Center must be fully loaded",
      "section": "KYC / Identity Verification",
      "claimSupported": "Binance has tiered KYC system with Basic/Intermediate/Advanced levels",
      "captureType": "authenticated",
      "risk": "high",
      "maskingRequired": ["email", "username", "account_id", "phone", "personal_data"],
      "currentStatus": "needs_manual_capture",
      "publishAllowed": false,
      "ownerApprovalRequired": true,
      "rejectionReason": "Previous capture showed loading/unfinished Identification screen. Must recapture fully loaded Verification Center page with all personal data masked.",
      "authenticatedNote": "Owner manual capture required. Go to reports/authenticated-screenshots/ first — never directly to public/."
    },
    {
      "screenshotId": "deposit",
      "targetUrl": "https://www.binance.com/en/buy-sell-crypto",
      "section": "Deposit / Buy crypto",
      "claimSupported": "Binance offers multiple deposit/buy methods including card and crypto transfer",
      "captureType": "public",
      "risk": "medium",
      "maskingRequired": ["any_prefilled_amounts", "personal_data"],
      "currentStatus": "needs_manual_capture",
      "publishAllowed": false,
      "ownerApprovalRequired": true,
      "notes": "Capture method selection screen only — stop before any payment entry or card details. P2 priority."
    },
    {
      "screenshotId": "registration",
      "targetUrl": "https://www.binance.com/register",
      "section": "Registration (legacy)",
      "claimSupported": null,
      "captureType": "affiliate_public",
      "risk": "medium",
      "maskingRequired": [],
      "currentStatus": "outdated",
      "publishAllowed": false,
      "ownerApprovalRequired": true,
      "rejectionReason": "Shows generic 100 USD signup reward — not the CBW 19,800 USDT offer. Do not use. Use registration_demo_state instead (captured via CRYPTOBONUSW referral URL)."
    },
    {
      "screenshotId": "bonus",
      "targetUrl": "https://www.binance.com/en/activity/referral",
      "section": "Bonus (generic referral program page)",
      "claimSupported": null,
      "captureType": "public",
      "risk": "high",
      "maskingRequired": [],
      "currentStatus": "outdated",
      "publishAllowed": false,
      "ownerApprovalRequired": true,
      "rejectionReason": "Shows generic referral reward tiers (100 USD / 1,000 USD) — not the CBW partner offer. Superseded by bonus_referral_landing. Do not publish until recaptured showing 19,800 USDT context."
    }
  ],

  "riskAndIncidents": [
    {
      "date": "2019-05-07",
      "type": "hack",
      "summary": "Binance hot wallet security breach — approximately 7,000 BTC stolen by hackers using phishing, viruses, and other techniques. All affected users were fully reimbursed from the SAFU fund. No user lost funds.",
      "sourceUrl": "https://www.binance.com/en/support/announcement/binance-security-breach-update-7-2-2019-360028031711",
      "severity": "high_historical",
      "publicPageImpact": "SAFU mentioned in content as proof of user protection. The reimbursement outcome is a positive trust signal. Do not suppress — mention in trust/security sections."
    }
  ],

  "contentMap": {
    "mainReviewPage": "/exchanges/binance/",
    "bonusPage": "/bonuses/binance-bonus/",
    "bonusCodePage": "/bonus-codes/binance/",
    "p2pPage": null,
    "futuresPage": null,
    "copyTradingPage": null,
    "earnPage": null,
    "feesPage": null,
    "kycPage": null,
    "appPage": null,
    "comparisonPagesPublished": [
      "/compare/binance-vs-bybit/",
      "/compare/binance-vs-okx/",
      "/compare/binance-vs-mexc/",
      "/compare/binance-vs-bitget/",
      "/compare/okx-vs-binance/",
      "/compare/coinbase-vs-binance/"
    ],
    "futurePageOpportunities": [
      {
        "slug": "binance-p2p-guide",
        "title": "How to Use Binance P2P",
        "priority": "P1",
        "rationale": "P2P is a high-traffic topic; guide at /guides/how-to-use-binance-p2p/ exists — internal link to Binance page needed"
      },
      {
        "slug": "binance-fees",
        "title": "Binance Fees: Complete Guide",
        "priority": "P1",
        "rationale": "High search volume; currently only addressed in FAQ — dedicated page would capture more traffic"
      },
      {
        "slug": "binance-referral-code",
        "title": "Binance Referral Code CRYPTOBONUSW",
        "priority": "P1",
        "rationale": "High commercial intent; bonus-codes/binance/ exists but thin"
      },
      {
        "slug": "binance-for-beginners",
        "title": "Binance for Beginners",
        "priority": "P2",
        "rationale": "High search volume; currently addressed via best-exchanges-for/beginners/ only"
      },
      {
        "slug": "binance-alternatives",
        "title": "Binance Alternatives for US Users",
        "priority": "P2",
        "rationale": "High intent from US visitors who discover Binance.com restriction"
      }
    ],
    "internalLinkingGaps": [
      "Binance main page has zero /best-exchanges-for/ links — add ≥ 2",
      "P2P guide at /guides/how-to-use-binance-p2p/ should link to Binance main page",
      "P2P use-case page at /use-cases/p2p/ should feature Binance",
      "Futures guide should mention Binance futures fees"
    ]
  },

  "freshness": {
    "dailyChecks": [
      "affiliate_bonus_amount",
      "affiliate_url_integrity",
      "supported_regions_watcher_alerts"
    ],
    "weeklyChecks": [
      "fees.spot",
      "fees.futures",
      "products.p2p",
      "products.app",
      "screenshotTargets.status",
      "official_announcements"
    ],
    "monthlyChecks": [
      "content_gaps",
      "internal_linking",
      "comparison_pages",
      "screenshot_refresh_queue",
      "bonus_terms_full_review"
    ],
    "quarterlyChecks": [
      "terms_of_service",
      "legal_restricted_countries",
      "privacy_policy",
      "affiliate_program_terms",
      "licences"
    ],
    "lastFullReview": "2026-06-08",
    "nextScheduledReview": "2026-07-08"
  }
}
```

---

## 4. Source Confidence Model

All factual fields in the exchange intelligence profile must carry a source confidence level.
These levels align with the Evidence Auditor's confidence model in `src/data/evidence/{exchange}.json`.

| Level | Code | Definition | Public page use |
|-------|------|------------|----------------|
| 1 | `verified_official` | Directly confirmed from an official exchange page (terms, fee schedule, official FAQ) with a URL and date | May be asserted as fact. Monitor for change. |
| 2 | `official_but_partial` | From an official source but the claim is incomplete — e.g. fee schedule confirms spot fee but does not explicitly confirm futures fee | May be used with hedging language. Note what is not confirmed. |
| 3 | `official_product_specific` | From an official source for a specific product that does not represent the full platform — e.g. Binance Pay B2C restriction list for a specific payment product | Must NOT be used as a general platform availability claim. |
| 4 | `regulator_confirmed` | Confirmed by an official regulator notice (FCA, FinCEN, MAS, etc.) naming the exchange specifically | Strong evidence — use with ROLE 11 Compliance review |
| 5 | `reputable_media_signal` | Reported in Reuters, Bloomberg, CoinDesk, Decrypt | Signal only — requires P0 source confirmation before any page update |
| 6 | `manual_tester_evidence` | Confirmed by a human tester interacting with the exchange — authenticated session, support ticket, or direct observation | Valid supporting evidence when P0 source is absent. Confidence score limited to 0.65 without official source. |
| 7 | `unverified` | Stated without a source, or source is no longer accessible | May NOT be used on any public page. Flag for re-verification. |
| 8 | `blocked_public_claim` | Known to be a claim that cannot be made regardless of evidence (e.g. Binance US availability, Russia mention) | Hard blocked — requires ROLE 0 explicit approval before any use |

### Confidence score to public claim mapping

| Confidence score | Evidence requirement | Public page assertion |
|-----------------|---------------------|----------------------|
| ≥ 0.85 | Official source, recently verified | Assert as fact. No hedging required. |
| 0.70–0.84 | Official source, older or partial | Assert with note. Show last-checked date. |
| 0.50–0.69 | Official source but outdated or indirect | Assert with hedging language ("as of [date]", "typically"). |
| 0.27–0.49 | Evidence incomplete or conflicting | Assert only with explicit uncertainty. Flag for re-verification. No Product schema price. |
| < 0.27 | No current official source | Do not assert on any public page. |

---

## 5. Screenshot Source Map

Every exchange intelligence profile must list all potential screenshot capture targets with their source URLs.

> **Feeds the Multilingual Screenshot Factory (ROLE 38).** The `screenshotTargets` array is the
> upstream seed for the screenshot factory job matrix (`src/data/screenshot-factory/jobs/{exchange}.json`).
> ROLE 38 reads each target and turns it into one or more screenshot jobs — one per
> (language × GEO × section) combination CBW needs. ROLE 37 owns the target URLs, risk levels, and
> masking notes; ROLE 38 owns the resulting jobs, captures, and approved assets. ROLE 37 never edits
> the factory matrix; ROLE 38 never edits this profile. See
> `docs/MULTILINGUAL_SCREENSHOT_FACTORY_ROLE.md` and `docs/MULTILINGUAL_SCREENSHOT_FACTORY_STANDARD.md`.

The minimum set of URLs to track for each exchange:

| Section | Recommended URL pattern | Notes |
|---------|------------------------|-------|
| Home | `/{exchange}.com/` | Capture with no authentication |
| Registration | `/{exchange}.com/register` or `/join?ref=CODE` | Always use CBW referral URL for bonus screenshots |
| Bonus / Rewards | Official bonus/referral landing | Capture with CBW referral code in URL |
| Fee schedule | `/{exchange}.com/fee/schedule` | Or equivalent fee page |
| Spot trading | `/{exchange}.com/trade/BTC_USDT` | Clean trading interface |
| Futures trading | `/{exchange}.com/futures/BTCUSDT` | High-risk product — editorial only, no beginner recommendation |
| Copy Trading | Copy trading index page | If available |
| P2P marketplace | P2P listing page — use USDT/USD direction NOT CNY | GEO locale risk — must verify default currency |
| Payment methods | Buy/sell crypto method selection screen | Stop before entering any payment details |
| App download | Official app download page | Clean state — no error messages |
| KYC overview | Verification Center page | Authenticated — all personal data masked — owner manual only |
| Proof of Reserves | Official PoR page | Public page |
| Security | Security centre or security overview | Public page |
| Availability / Regions | Supported regions page | Public — if such page exists |

### Screenshot risk classification

| Risk level | Meaning | Approval required |
|-----------|---------|-------------------|
| `low` | Public page, no personal data, no offer-sensitive content | Screenshot Director (ROLE 5) |
| `medium` | Public page with variable content (P2P listings, prices), or capture near payment flow | Screenshot Director + ROLE 37 review |
| `high` | Authenticated session content; offer amounts that could contradict live claim; payment method entry screens | ROLE 5 + Chief Project Owner (ROLE 0) |
| `forbidden` | Wallet addresses, private keys, API keys, identity documents, QR codes, balance amounts, withdrawal confirmations | Never capture — absolute block |

---

## 6. No-Autopublish Rule

Exchange intelligence profiles feed reports and planning. They **may not automatically update public pages** without ROLE 0 approval.

**The intelligence profile is a staging layer — not a rendering source.**

Specifically:
- A change to `src/data/exchange-intelligence/binance.json` does NOT trigger or justify a change to `src/data/exchanges.json`, `src/data/content-overrides.json`, or `src/data/evidence/binance.json`.
- Any change to a public data file must be explicitly proposed in a report, reviewed by the relevant role (ROLE 4 for evidence, ROLE 11 for compliance, ROLE 16 for offer integrity), and approved by ROLE 0 before implementation.
- No script may read the intelligence profile and automatically update any rendering data file.
- Changes to the intelligence profile itself do not require a deploy.

**Allowed automated use of the intelligence profile:**
- Reading by War Room roles at the start of a Gold Page session (no write)
- Generating freshness reports that flag stale fields (no write to rendering files)
- Comparing the profile against `src/data/evidence/{exchange}.json` to surface discrepancies (no write)
- Informing the Chief SEO Architect brief with current affiliate data (no write)

---

## 7. Binance Pilot

The first exchange intelligence profile to implement is Binance, at:

**`src/data/exchange-intelligence/binance.json`**

### Data sources for the Binance pilot

The pilot profile should be populated **exclusively from already-known verified project data** — no web browsing required for the initial profile. The following data is already confirmed in the project:

**From `src/data/exchanges.json`:**
- Affiliate URL: `https://www.binance.com/join?ref=CRYPTOBONUSW`
- Promo code: `CRYPTOBONUSW`
- Bonus amount: `19800` USDT

**From `src/data/evidence/binance.json`:**
- Spot fees (0.1%/0.1%), futures fees (0.02%/0.05%), max leverage (125×)
- KYC required: true, confidenceScore 0.76
- P2P available: true, confidenceScore 0.90
- Proof of Reserves: true, confidenceScore 0.95
- All official source URLs (fees, KYC, bonus, restricted countries, terms, PoR, P2P, app iOS/Android, futures)
- Screenshot statuses: 5 available, 3 needs_manual_capture, 3 outdated

**From `src/data/exchange-availability/binance.json`:**
- 195 countries in supported regions list (Binance last updated 2025-10-09)
- notListedInAppSupportedRegions: US, China, India, Cuba, Iran, North Korea, Syria
- restrictedCountries.list is empty — official prohibited-countries URL is 404
- manualReviewRequired: true

**From `src/data/content-overrides.json`:**
- editorNote, longDescription, faqAppend (20 items)
- contextualScreenshotSlots: [bonus_referral_landing, registration_demo_state, fees, proof_of_reserves, spot]

**Known screenshot statuses from evidence:**
- ✅ available: registration_demo_state, bonus_referral_landing, fees, proof_of_reserves, spot
- ❌ needs_manual_capture: p2p (CNY locale), mobile_app (error state), kyc (loading state)
- ❌ outdated: registration (100 USD, wrong offer), bonus (generic tiers), futures
- ⬜ not captured: deposit

**Current content pages (from site structure):**
- `/exchanges/binance/` — main review page
- `/bonuses/binance-bonus/` — bonus page
- `/bonus-codes/binance/` — bonus code page
- `/compare/binance-vs-bybit/`, `/compare/binance-vs-okx/`, etc. — comparison pages
- `/guides/how-to-use-binance-p2p/` — Binance P2P guide (exists as guide)

The pilot profile schema shown in Section 3 is pre-populated with the Binance data above.

---

## 8. Relationship with Existing Files

The exchange intelligence profile sits above the rendering data files. It is a knowledge layer, not a rendering layer.

| Existing file | What it does | Relationship to intelligence profile |
|---------------|-------------|-------------------------------------|
| `src/data/exchanges.json` | Core exchange rendering data — name, slug, affiliateUrl, promoCode, bonusAmount, rating | Profile reads this for affiliate data. Profile cannot update this without ROLE 0 approval. |
| `src/data/content-overrides.json` | Editorial override layer — editorNote, longDescription, faqAppend, verdict, experience | Profile tracks what content sections exist and what gaps remain. Profile cannot update this without ROLE 0 approval. |
| `src/data/evidence/{exchange}.json` | Claims verification and screenshot registry — facts with confidence scores, screenshot statuses | Profile aggregates data FROM this file. ROLE 4 (Evidence Auditor) maintains this file. Profile cannot update it. |
| `src/data/exchange-availability/{exchange}.json` | Availability watcher data — supported regions, restriction intelligence | Profile reads this for availability section. ROLE 36 watcher updates this file. |
| `reports/` | Deploy reports, verification reports, screenshot review reports | Profile does not feed reports/ and is not fed by reports/. Reports are task-specific; profiles are rolling. |
| Future country pages (`/countries/{country}/`) | Country-specific exchange rankings | Profile's future page opportunities section identifies which country pages should feature each exchange. |
| Future comparison pages (`/compare/{pair}/`) | Head-to-head exchange comparisons | Profile's comparisonPagesPublished tracks current pages; contentMap.futurePageOpportunities tracks gaps. |

### Data flow diagram

```
[Official exchange pages] ──► [ROLE 36 Availability Watcher] ──► exchange-availability/{exchange}.json
[Official exchange pages] ──► [ROLE 4 Evidence Auditor]     ──► evidence/{exchange}.json
                                                                         │
                                                                         ▼
[exchanges.json]  ─────────────────────────────────────────► Exchange Intelligence Profile
[content-overrides.json]  ──────────────────────────────────►  (src/data/exchange-intelligence/)
[exchange-availability/binance.json]  ──────────────────────►        │
[evidence/binance.json]  ───────────────────────────────────►        │
                                                                       │
                                         ┌─────────────────────────────┤
                                         ▼                             ▼
                            Gold Page War Room             Freshness Reports
                            (planning + briefing)         (stale-data flags)
```

---

## 9. Implementation Roadmap

### Phase 1 — Governance documentation (Sprint 06)
- ✅ Create `docs/EXCHANGE_INTELLIGENCE_OWNER_ROLE.md`
- ✅ Create `docs/EXCHANGE_INTELLIGENCE_PROFILE_STANDARD.md` (this document)
- ✅ Update `docs/CBW_PROJECT_OWNER_AND_TEAM_STRUCTURE.md` — add ROLE 37 summary
- ✅ Update `docs/GOLD_PAGE_WAR_ROOM_AND_WEEKLY_TRAINING.md` — add ROLE 37 as source-of-truth provider
- ✅ Update `docs/EXCHANGE_AVAILABILITY_AND_RESTRICTED_COUNTRIES_WATCHER.md` — connect to intelligence profile

### Phase 2 — Binance pilot profile (Sprint 06 / Sprint 07)
- Create `src/data/exchange-intelligence/` directory
- Add `src/data/exchange-intelligence/` to `.gitignore`
- Create `src/data/exchange-intelligence/binance.json` using schema from Section 3, pre-populated from known project data (no web browsing required)
- Validate profile against all 14 schema sections
- Use profile in next Binance Gold Page War Room session as first input

### Phase 3 — Tier 1 expansion (Sprint 07 / Sprint 08)
- Create `bybit.json`, `okx.json`, `mexc.json`
- Source data from existing evidence JSON files for each exchange
- Identify affiliate link and bonus data from `exchanges.json`
- Flag known screenshot gaps per exchange
- Connect to next Gold Page sessions for Bybit and OKX

### Phase 4 — Tier 2 expansion (Sprint 08 / Sprint 09)
- Create profiles for Bitget, BingX, Gate.io, KuCoin, HTX, Coinbase
- Align with future Gold Page pipeline priorities

### Phase 5 — Tier 3 expansion (Sprint 09+)
- Create profiles for CoinEx, Phemex, Bitunix, LBank

### Phase 6 — Integration and connection
- Connect Binance intelligence profile to country page production
- Use profiles to drive comparison page accuracy checks
- Use profiles to seed the Chief SEO Architect brief automatically

---

*Document version 1.1 — 2026-06-08 — Sprint 06: Noted that `screenshotTargets` feed the ROLE 38 Multilingual Screenshot Factory job matrix*  
*Document version 1.0 — 2026-06-08 — Sprint 06*  
*Owner: Chief Project Owner (ROLE 0)*  
*Role: ROLE 37 — Exchange Intelligence Owner*  
*Governance reference: `docs/EXCHANGE_INTELLIGENCE_OWNER_ROLE.md`; `docs/CBW_PROJECT_OWNER_AND_TEAM_STRUCTURE.md`; `docs/MULTILINGUAL_SCREENSHOT_FACTORY_ROLE.md`*
