# Claim / Evidence Ledger Standard

**Version:** 1.0
**Created:** 2026-06-08
**Sprint:** Sprint 07
**Status:** ACTIVE — canonical schema for tracking every factual claim on a Gold Page
**Owner:** Chief Project Owner (ROLE 0)
**Primary roles:** ROLE 4 (Evidence Auditor), ROLE 16 (Offer Integrity Officer)

> The Claim / Evidence Ledger is the bridge between what a page *says* and what we can *prove*.
> Every factual statement on a Gold Page must have a ledger entry. The ledger is consumed at
> pipeline stages 4, 7, 9, and 10 of the Gold Page Operating System.

---

## 1. Purpose

A Gold Page makes dozens of factual claims: bonus amounts, fees, availability, KYC requirements,
P2P support, security posture, product features, market data. Each is a liability if wrong. The
ledger ensures:

- Every claim is **tracked** (no orphan statements)
- Every claim is **sourced** (links to the Source Registry)
- Every claim has a **confidence** and a **staleness clock**
- Every claim has **allowed and blocked wording** (so copy stays within what evidence supports)
- Every claim has a **status** in its review lifecycle

The ledger is what lets the Editorial Lead (ROLE 3) write safely and the Compliance Lead (ROLE 11)
verify quickly.

---

## 2. Recommended Data Location

```
src/data/claim-ledger/{exchange}.json   # array of claim entries for that exchange
```

This is **staging/planning data** — like the exchange-intelligence and screenshot-factory files, it
does not render public pages directly and never auto-updates rendering files (no-autopublish).

---

## 3. Claim Entry Schema

```json
{
  "claimId": "",
  "exchange": "",
  "page": "",
  "claimText": "",
  "claimType": "bonus|fees|availability|kyc|p2p|security|product|marketdata",
  "evidenceSources": [],
  "screenshotEvidence": [],
  "confidence": "high|medium|low",
  "lastChecked": "",
  "staleAfterDays": 0,
  "allowedWording": [],
  "blockedWording": [],
  "manualReviewRequired": true,
  "status": "approved|active_review|stale|rejected"
}
```

**Field notes:**
- `claimId` — unique; format `{exchange}_{claimType}_{slug}` (e.g. `binance_bonus_welcome_max`).
- `page` — the page route the claim appears on (e.g. `/exchanges/binance/`).
- `claimText` — the canonical claim in neutral form.
- `claimType` — one of the 8 controlled types.
- `evidenceSources` — array of `sourceId`s from the Source Registry (`SOURCE_REGISTRY_STANDARD.md`).
- `screenshotEvidence` — array of approved `assetId`s from the Screenshot Factory asset registry.
- `confidence` — `high` (P0/P1 source + current), `medium` (P2 or aging), `low` (P3+ or unverified).
- `staleAfterDays` — staleness clock; bonus claims short (14–30), structural claims longer (90+).
- `allowedWording` — phrasings copy MAY use for this claim.
- `blockedWording` — phrasings copy MUST NOT use (overclaims, guarantees, unverified specifics).
- `manualReviewRequired` — `true` forces human verification before the claim can be `approved`.
- `status` — lifecycle: `approved` → `active_review` (under recheck) → `stale` → `rejected`.

---

## 4. Confidence → Wording Coupling

| Confidence | Source backing | Wording posture |
|-----------|----------------|-----------------|
| `high` | ≥1 P0/P1 source, current, screenshot if applicable | Assertive ("verified against the official page on {date}") |
| `medium` | P2 source, or P0/P1 aging past half its stale window | Qualified ("as of {date}"; avoid superlatives) |
| `low` | P3+ only, or unverified, or `manualReviewRequired` unresolved | Cautious ("reported to be"; "under active review — verify on the official page") |

A claim's wording in published copy must match its confidence band. The Editorial Lead writes from
`allowedWording`; the Compliance Lead blocks anything in `blockedWording`.

---

## 5. Examples

### Example A — Binance bonus (high)
```json
{
  "claimId": "binance_bonus_welcome_max",
  "exchange": "binance",
  "page": "/exchanges/binance/",
  "claimText": "New users can receive a welcome bonus of up to 19,800 USDT.",
  "claimType": "bonus",
  "evidenceSources": ["binance_referral_landing_p0", "binance_referral_terms_p1"],
  "screenshotEvidence": ["binance_bonus_referral_landing_en_global"],
  "confidence": "high",
  "lastChecked": "2026-06-04",
  "staleAfterDays": 30,
  "allowedWording": [
    "up to 19,800 USDT",
    "welcome bonus of up to 19,800 USDT (task-based; full amount requires milestones)"
  ],
  "blockedWording": [
    "guaranteed 19,800 USDT",
    "free 19,800 USDT cash",
    "instant 19,800 USDT"
  ],
  "manualReviewRequired": false,
  "status": "approved"
}
```

### Example B — Bybit bonus (low / under review)
```json
{
  "claimId": "bybit_bonus_welcome_max",
  "exchange": "bybit",
  "page": "/exchanges/bybit/",
  "claimText": "New users can receive a welcome bonus of up to 30,000 USDT.",
  "claimType": "bonus",
  "evidenceSources": ["bybit_referral_landing_p0"],
  "screenshotEvidence": [],
  "confidence": "low",
  "lastChecked": "2026-05-20",
  "staleAfterDays": 30,
  "allowedWording": [
    "Bonus offer last checked on 2026-05-20. Current bonus terms are under active review — verify the latest offer on the official Bybit promotion page before registering."
  ],
  "blockedWording": [
    "verified 30,000 USDT bonus",
    "guaranteed 30,000 USDT"
  ],
  "manualReviewRequired": true,
  "status": "active_review"
}
```

### Example C — P2P availability (medium)
```json
{
  "claimId": "binance_p2p_availability_geo",
  "exchange": "binance",
  "page": "/exchanges/binance/",
  "claimText": "P2P availability and payment methods vary by country.",
  "claimType": "p2p",
  "evidenceSources": ["binance_p2p_help_p0"],
  "screenshotEvidence": ["binance_p2p_direction_usd_usdt_en_global"],
  "confidence": "medium",
  "lastChecked": "2026-06-08",
  "staleAfterDays": 60,
  "allowedWording": [
    "P2P availability and payment methods vary by country",
    "available payment methods depend on your region"
  ],
  "blockedWording": [
    "P2P available everywhere",
    "all payment methods available in every country"
  ],
  "manualReviewRequired": false,
  "status": "approved"
}
```

### Example D — Proof of Reserves (high)
```json
{
  "claimId": "binance_proof_of_reserves_published",
  "exchange": "binance",
  "page": "/exchanges/binance/",
  "claimText": "Binance publishes Proof of Reserves on an official page.",
  "claimType": "security",
  "evidenceSources": ["binance_por_p0"],
  "screenshotEvidence": ["binance_proof_of_reserves_en_global"],
  "confidence": "high",
  "lastChecked": "2026-06-04",
  "staleAfterDays": 90,
  "allowedWording": [
    "publishes Proof of Reserves",
    "Proof of Reserves is visible on the official page"
  ],
  "blockedWording": [
    "guarantees all funds are safe",
    "100% audited and risk-free"
  ],
  "manualReviewRequired": false,
  "status": "approved"
}
```

---

## 6. Lifecycle & Freshness

```
approved → (staleAfterDays elapses OR source changes) → active_review
active_review → (re-verified) → approved
active_review → (cannot verify / offer changed) → stale → rejected
```

- ROLE 25 (Freshness Editor) flags entries past `staleAfterDays`.
- ROLE 4 re-verifies; ROLE 16 confirms offer claims.
- A `stale` or `rejected` claim forces its page copy to cautious wording (or removal) until re-approved.

---

## 7. No-Autopublish

The ledger is a staging layer. A ledger change never auto-edits `content-overrides.json`,
`exchanges.json`, or `evidence/{exchange}.json`. Any public copy change driven by a ledger update
must be proposed in a report and approved by ROLE 0.

---

*Document version 1.0 — 2026-06-08 — Sprint 07*
*Owner: Chief Project Owner (ROLE 0)*
*Roles: ROLE 4 (Evidence Auditor), ROLE 16 (Offer Integrity Officer)*
*Governance reference: `docs/GOLD_PAGE_OPERATING_SYSTEM.md`; `docs/SOURCE_REGISTRY_STANDARD.md`*
