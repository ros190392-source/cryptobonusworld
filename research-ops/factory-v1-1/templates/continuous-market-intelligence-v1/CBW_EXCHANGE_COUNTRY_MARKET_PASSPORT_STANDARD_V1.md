# CBW Exchange × Country Market Passport Standard V1

> Architecture standard. Non-production. **Owner Audit Correction 026:** suppression rules distinguish
> freshness from claim verification; corrected vocabularies. Back to
> [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).

Field structures: [data schema](../../schemas/continuous-market-intelligence-v1/CBW_MARKET_INTELLIGENCE_DATA_SCHEMA_V1.json)
and [claim/evidence/freshness model](../../schemas/continuous-market-intelligence-v1/CBW_CLAIM_EVIDENCE_FRESHNESS_MODEL_V1.json).

## 1. Global exchange core vs country market profile

Exchange core (GLOBAL) owns worldwide facts (legal entities, leadership, global history, global
security incidents) stored **once**. Country market profile (MARKET) owns country-scoped facts (legal
availability, local authorization, warnings, registration, KYC, product availability, payment rails,
fees, limits, restrictions, local affiliate offer). A market profile **MUST NOT** duplicate global
facts; global records **MUST NOT** absorb market facts.

## 2. Required passport sections

Each backed by a `Claim` with confidence, **verification state** (`SUPPORTED`/`CONFLICTED`/`UNDER_REVIEW`/`UNSUPPORTED`),
**freshness state** (`FRESH`/`DUE_SOON`/`STALE`/`EXPIRED`), limitations and effective dates:

1. Legal entities, leadership, global history (core).
2. Country legal availability, local authorization, official warnings.
3. Registration and KYC.
4. Per-product availability (`SPOT`, `MARGIN`, `FUTURES`, `OPTIONS`, `EARN`, `P2P`, `CARD`, `CONVERT`, `STAKING`).
5. P2P and direct fiat / payment rails.
6. Fees and limits as timestamped snapshots.
7. Security incidents, proof-of-reserves and outages.
8. Restrictions and sanctions.
9. Affiliate / referral offer status (see [affiliate standard](./CBW_AFFILIATE_OFFER_VERIFICATION_STANDARD_V1.md)).

## 3. Two independent quality dimensions

**Freshness** (how recently re-observed) and **verification** (how well evidenced) are **separate**.
A claim may be `FRESH` but `CONFLICTED`, or `SUPPORTED` but `STALE`. The passport shows both.

## 4. Public presentation surfaces

Public market-facts table (claim-bound cells with freshness/evidence indicators); direct answer block
(see [SEO standard](./CBW_SEO_QUICK_ANSWER_AND_SEARCH_INTENT_STANDARD_V1.md)); market timeline; source
methodology and visible change history; compact Top-10 card (section 7).

## 5. Required vs optional fields

**Required (present or explicit `UNKNOWN` with limitations):** market status, legal availability,
registration eligibility, KYC level, ≥1 payment-rail assessment, restriction summary, affiliate offer
status, overall confidence, verification state, freshness state.
**Optional:** granular fee snapshots, products beyond the core set, outages older than retention.

## 6. Fees and limits as snapshots

Stored as `FeeSnapshot`/`LimitSnapshot` with `observedAt` and an evidence claim; rendered with the
capture date and never as a permanent guarantee.

## 7. Compact Top-10 card contract

Exactly these claim-bound fields; nothing unbound:

| Card field | Bound to |
| --- | --- |
| Exchange name + logo | Exchange core identity |
| Availability badge | market `RegulatoryStatus` / market status claim |
| KYC badge | `KycRequirement` claim |
| Top payment rail | highest-confidence `PaymentRail` claim |
| Offer label ("up to …") | affiliate `OfferSnapshot` at `L2_OFFER_VISIBLE`+ |
| Freshness indicator | market profile `freshnessState` |
| CTA | affiliate `CTAState` (owner-gated) |

Ranking position and Top-10 membership are **owner-gated** and never changed autonomously.

## 8. Publication suppression rules (freshness vs verification separated)

Suppress or degrade a claim's surface when **any** hold — the trigger dimension is explicit:

- **freshness:** critical claim is `STALE` or `EXPIRED`;
- **verification:** claim is `UNDER_REVIEW`, `UNSUPPORTED`, or `CONFLICTED`;
- **affiliate offer:** status `LINK_BROKEN` → fail-safe CTA suppression; `GEO_NOT_ELIGIBLE` → GEO
  suppression; `OFFER_ENDED` → disabled; `CONFLICTED`/`SOURCE_UNAVAILABLE` → under review.

Suppression replaces the value with an explicit "under review" state rather than showing a stale or
unsupported critical fact. Bindings are defined in
[the publication binding model](../../schemas/continuous-market-intelligence-v1/CBW_PUBLICATION_BINDING_MODEL_V1.json).

## 9. Scaling to new countries

A new market profile reuses the exchange core and adds only country-scoped claims plus
source-dependency edges. See [source monitoring](./CBW_SOURCE_MONITORING_STANDARD_V1.md) and the
[implementation roadmap](./CBW_IMPLEMENTATION_ROADMAP_V1.md).
