# CBW Region Resolver and Offer Gate Architecture — v1

- Task: CBW-GLOBAL-COUNTRY-LOCALE-SITE-ARCHITECTURE-V3-001 · corrected by owner reviews 002 (market-first URLs) and 003 (per-market defaults; explicit country-switch fallback) · 2026-07-23
- Status: **ARCHITECTURE_V3_OWNER_APPROVED_COMMITTED** (owner-approved committed architecture authority — initial architecture commit `a3dea7e451d046d5f01515bf085962f6f92a9fa7` on branch `feat/cbw-global-site-architecture-v3`; implementation and production remain separately unauthorized)
- Companion: [CBW_REGION_RESOLVER_AND_OFFER_GATE_ARCHITECTURE_v1.json](CBW_REGION_RESOLVER_AND_OFFER_GATE_ARCHITECTURE_v1.json)
- Defers to: MI Brain v1 (decision outputs), MI↔GEO Reconciliation Standard v1 (canonical record,
  ownership, commercial separation), First Screen Standard v1 (rendering rules).

## 1. RegionResolver (service contract)

One resolver, used by every commercial surface. Input: request/URL context + user prefs + IP hint.
Output: `{ countryCode | GLOBAL, resolutionSource: URL|MANUAL|SAVED|IP|GLOBAL, confidence,
ipCaveat: boolean }`. Precedence: **explicit country in URL** (market-first routes
`/{countrySlug}/{languageCode}/…` pin the country) → manual → saved → IP (labeled hint;
IP ≠ residence) → GLOBAL. Explicit URL always wins; no hard redirects of indexed URLs by IP or
browser language (dismissible suggestions only). The resolver never redirects, never writes to MI, never influences facts — it only picks
which canonical decision record a surface asks for. Country and language resolve independently
(locale doc); language resolution ends in the market's `marketDefault` language, then its English
fallback (per MarketLanguageMatrix `fallbackPriority`) — English is never assumed to be a market's
default (LOCALE24). Country switching follows the explicit order: (1) preserve the current language
when the target pair AND that page's PageLocaleCoverage are LIVE, then (2) the target market's LIVE
marketDefault, then (3) the target market's LIVE English fallback, then (4) an explicit
unavailable/resolver state — always with a visible fallback notice; unsupported URLs never silently
serve another language (LOCALE19/LOCALE20). MI facts are identical across language siblings of the
same market page (LOCALE13).

## 2. RegionAvailabilityModule (UI contract)

On every commercial page family: renders the resolved region + resolution source ("Availability
shown for Kazakhstan — change"), the MI decision surface (state badge, verdict, notices, checked
date + confidence, reason-code-driven copy), drives **all** OfferSurface instances on the page
(one state, top and bottom, no drift), exposes the manual country switcher, and degrades honestly:
no decision record → UNKNOWN presentation, zero commercial controls, never a guess. The module owns
no facts (renderer per the reconciliation standard).

## 3. Region-aware offer system — the offer gate chain

An offer (code + Copy + Claim/registration CTA) renders **only** when every link holds:

```
1 MI availability          state AVAILABLE, or AVAILABLE_WITH_LIMITS approved
2 MI registration          registration eligible for the resolved market
3 MI promo eligibility     offer current + country-applicable evidence
4 referral compatibility   referralCompatibilityVerified = true for the market
5 offer registry           route + code exist and are authoritative (implementation facts only)
6 affiliate authorization  AFFILIATE_ACTIVATION_AUTHORIZED for this surface
7 publication              page/surface publication authorized (owner)
8 freshness                no STALE decision inputs; no unresolved critical conflict
```

Any broken link degrades the surface to its state-correct non-commercial presentation
(Check Eligibility / View Available Alternatives / Check Availability per the standard). The chain
is evaluated in one shared gate function — never re-implemented per page. GLOBAL fallback renders
globally advertised offers only with explicit non-local labeling and never claims local eligibility.

## 4. States (canonical, rendered)

MI cell statuses `AVAILABLE / AVAILABLE_WITH_LIMITS / RESTRICTED / UNAVAILABLE / UNDER_REVIEW /
CONFLICTING / UNKNOWN / STALE` map to four UI treatments: green commercial, amber
limited (± verified referral compatibility), red restricted (informational + alternatives), neutral
non-commercial (under-review/unknown/conflicting/stale/unavailable — distinct copy via reason
codes, identical commercial clamp). `availability`, `rankingEligibility`, `ctaEligibility`,
`promoEligibility` remain separate fields end-to-end.

## 5. Market Intelligence boundary

Canonical MI cells/decisions → versioned read-only adapters → surfaces. UI never writes MI, never
re-derives eligibility, never merges sources; staging/RECOVERED/UNVERIFIED research packages never
bind to any surface; GEO-legacy production path frozen until per-pair MIGRATION_7; prototypes bind
visibly-marked mock data only. Decision changes reach pages only through the MI lifecycle
(monitor → … → owner approval → repository update), never through page code.

## 6. Affiliate registry boundary

Offer registry stores implementation facts only (route `/go/{exchange}`, code, terms refs) — never
eligibility evidence. `/go/**` exists only on fully authorized production surfaces; prototypes and
design routes have zero `/go/**` and inert CTAs. `affiliateInfluencesRanking: false` is a CI-enforced
invariant; affiliate data lives outside ranking inputs. Affiliate activation is a separate
per-surface owner gate, after page migration and publication gates.
