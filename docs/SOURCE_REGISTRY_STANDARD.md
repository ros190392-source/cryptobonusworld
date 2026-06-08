# Source Registry Standard

**Version:** 1.0
**Created:** 2026-06-08
**Sprint:** Sprint 07
**Status:** ACTIVE — canonical schema and quality tiers for all evidence sources
**Owner:** Chief Project Owner (ROLE 0)
**Primary roles:** ROLE 4 (Evidence Auditor), ROLE 37 (Exchange Intelligence Owner)

> The Source Registry is the catalogue of every source CBW relies on to back a claim. Each entry in
> the Claim / Evidence Ledger cites one or more `sourceId`s from this registry. A claim is only as
> strong as its best source tier. Consumed at pipeline stages 5 and 9 of the Gold Page Operating System.

---

## 1. Purpose

Not all evidence is equal. An official Binance fee page outranks a forum post; a regulator notice
outranks a press release. The Source Registry makes source quality **explicit and tiered**, so that:

- Every claim can be scored by the strength of its backing
- The Evidence Auditor can require a minimum tier per claim type
- Weak sources are visible and flagged, never silently relied upon
- Sources are tracked per language/GEO (an EN/global source does not back a localized claim)

---

## 2. Source Quality Tiers

| Tier | Meaning | Examples | Use |
|------|---------|----------|-----|
| **P0** | Official exchange pages | Fee schedule, bonus/referral landing, P2P page, PoR page, app download | Primary evidence; required for most claims |
| **P1** | Terms / legal / regulator | Exchange Terms of Use, restricted-country list, regulator licence registry/notice | Availability, KYC, legal, restriction claims |
| **P2** | Aggregators / stores | CoinGecko, CoinMarketCap, Apple App Store, Google Play | Market data (volume, pairs, trust score), app existence |
| **P3** | Reputable media | Established crypto/finance outlets with editorial standards | Context, corroboration; never sole backing for offers |
| **P4** | Manual tester evidence | CBW owner/tester first-hand capture (authenticated, masked) | Walkthrough states, UI confirmation |
| **P5** | Weak / unverified | Forums, social posts, unsourced blogs, affiliate marketing copy | Lead only; must be upgraded to P0–P2 before any claim |

**Minimum tier by claim type (default):**

| Claim type | Minimum acceptable source |
|------------|--------------------------|
| bonus | P0 (landing) + P1 (terms) preferred |
| fees | P0 |
| availability | P0 or P1 |
| kyc | P0 or P1 |
| p2p | P0 |
| security (PoR) | P0 |
| product | P0 |
| marketdata | P2 (with `lastChecked`) |

A claim backed only by P3–P5 is capped at `low` confidence and must use cautious wording (or be omitted).

---

## 3. Recommended Data Location

```
src/data/source-registry/{exchange}.json   # array of source entries for that exchange
```

Staging/planning data — no-autopublish; never auto-edits rendering files.

---

## 4. Source Entry Schema

```json
{
  "sourceId": "",
  "sourceType": "",
  "tier": "P0|P1|P2|P3|P4|P5",
  "url": "",
  "title": "",
  "exchange": "",
  "language": "",
  "geo": "",
  "lastChecked": "",
  "usedForClaims": [],
  "riskNotes": ""
}
```

**Field notes:**
- `sourceId` — unique; format `{exchange}_{topic}_{tier}` (e.g. `binance_referral_landing_p0`).
- `sourceType` — free text describing the source (e.g. `official_fee_schedule`, `regulator_notice`, `coingecko_exchange`).
- `tier` — one of P0–P5 (§2).
- `url` — canonical source URL.
- `language` / `geo` — the source's language and applicable GEO. **A source's GEO must match the
  claim's GEO** — an EN/global source does not back a BR/pt-BR localized claim.
- `lastChecked` — when the source was last accessed/verified.
- `usedForClaims` — array of `claimId`s in the Claim Ledger that cite this source (back-reference).
- `riskNotes` — caveats (e.g. "marketing page — amounts are campaign ceilings", "geo-routed content").

---

## 5. Examples

```json
{
  "sourceId": "binance_referral_landing_p0",
  "sourceType": "official_referral_landing",
  "tier": "P0",
  "url": "https://www.binance.com/join?ref=CRYPTOBONUSW",
  "title": "Binance — Referral / Sign-Up Rewards Landing",
  "exchange": "binance",
  "language": "en",
  "geo": "global",
  "lastChecked": "2026-06-04",
  "usedForClaims": ["binance_bonus_welcome_max"],
  "riskNotes": "Marketing landing — 19,800 USDT is a task-based maximum ceiling, not a guaranteed grant"
}
```

```json
{
  "sourceId": "binance_restricted_countries_p1",
  "sourceType": "official_restricted_list",
  "tier": "P1",
  "url": "https://www.binance.com/en/support/faq/...restricted...",
  "title": "Binance — Restricted Countries & Regions",
  "exchange": "binance",
  "language": "en",
  "geo": "global",
  "lastChecked": "2026-05-25",
  "usedForClaims": ["binance_availability_us", "binance_availability_uk"],
  "riskNotes": "Authoritative for restriction claims; re-check quarterly"
}
```

```json
{
  "sourceId": "binance_coingecko_p2",
  "sourceType": "coingecko_exchange",
  "tier": "P2",
  "url": "https://api.coingecko.com/api/v3/exchanges/binance",
  "title": "CoinGecko — Binance exchange data",
  "exchange": "binance",
  "language": "en",
  "geo": "global",
  "lastChecked": "2026-06-08",
  "usedForClaims": ["binance_marketdata_volume", "binance_marketdata_pairs"],
  "riskNotes": "Market data snapshot — re-pull monthly; values are point-in-time"
}
```

---

## 6. Relationship to Other Subsystems

- **Exchange Intelligence (ROLE 37):** the profile's `officialPages` and `screenshotTargets` seed
  P0/P1 source entries. ROLE 37 supplies URLs; ROLE 4 tiers and verifies them.
- **Claim Ledger (ROLE 4 + 16):** each claim's `evidenceSources` are `sourceId`s from this registry.
- **Screenshot Factory (ROLE 38):** P4 manual tester evidence often corresponds to an approved
  screenshot asset; cross-reference by `assetId` where applicable.

---

## 7. No-Autopublish

The Source Registry is staging data. Adding or re-tiering a source never auto-changes a public page;
any resulting copy change goes through the ledger → report → ROLE 0 approval path.

---

*Document version 1.0 — 2026-06-08 — Sprint 07*
*Owner: Chief Project Owner (ROLE 0)*
*Roles: ROLE 4 (Evidence Auditor), ROLE 37 (Exchange Intelligence Owner)*
*Governance reference: `docs/GOLD_PAGE_OPERATING_SYSTEM.md`; `docs/CLAIM_EVIDENCE_LEDGER_STANDARD.md`*
