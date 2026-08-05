# CBW Split 3 (P0) — Bybit Offer Evidence Capture Pilot (v1)

Branch: `feat/cbw-split3-bybit-offer-evidence-capture-003`
Governing issue: #252 · Base: `master` @ `b1b8008` (PR #251 merged)
Status: implemented; Draft PR; **not merged**; **not deployed**. **Outcome B — under re-verification.**

## Objective

Prove the offer-evidence acquisition chain on **Bybit only** before any real offer
becomes authorizing: a URL + access time is not proof of the individual offer
claims CBW displays. This task produces one **auditable capture packet** with an
explicit per-claim verification result, a fail-closed `OfferEvidencePacket`
contract, and a deterministic adapter to `EvidenceMetadata` — and then makes an
honest data decision.

## What was captured (real, no fabrication)

Method: `http_probe_no_auth_no_cookies` (anonymous GET, `redirect=manual`, 20 s
timeout, no session/cookies/proxy). Official sources:

| Source | Observed |
|---|---|
| `https://www.bybit.com/en/promo/new-user/` | **HTTP 302**, 0 bytes, empty body (`sha256:e3b0c442…b855`) |
| `https://www.bybit.com/en/promo/global/welcome-gifts/` | **HTTP 302**, 261-byte redirect stub, no offer content (`sha256:48e9c3fe…4247`) |

Both official promo pages **redirect and serve no server-rendered offer content**
to an anonymous capture (client-rendered SPA and/or geo/region-dependent). Per the
official-source policy this is recorded as an explicit limitation — facts were not
filled from memory.

Packet: `src/data/evidence/offers/bybit-new-user-2026-08-05.json`
`packetId: bybit-new-user-20260805` · `capturedAt: 2026-08-05T19:10:09Z` ·
`nextReviewAt: 2026-08-19T00:00:00Z` · `contentDigest:
sha256:7c16953b0fa9e501215bfdebfc2615c3aa59b6a79c91bc680f8678d77df95155` ·
`approval: draft`.

## Bybit claim matrix (13 claims)

| # | Claim | Result | Required? |
|---|---|---|---|
| 1 | Exchange / source identity | **supported** | yes |
| 2 | Promo / referral code (`CRYPTOBONUSW`) | **requires_owner_partner_confirmation** | yes |
| 3 | Maximum reward (Up to 30,000 USDT) | **inaccessible** | yes |
| 4 | Realistic-value wording | **not_found** (editorial) | no |
| 5 | Fee-discount wording | **inaccessible** | no |
| 6 | KYC requirement | **inaccessible** | yes |
| 7 | Deposit requirement | **inaccessible** | yes |
| 8 | Minimum-deposit wording | **inaccessible** | no |
| 9 | Offer availability wording | **inaccessible** | yes |
| 10 | Restricted-country wording | **inaccessible** | yes |
| 11 | Reward type & withdrawal limitations | **inaccessible** | yes |
| 12 | Task / voucher expiry wording | **inaccessible** | no |
| 13 | Terms-summary accuracy | **inaccessible** | yes |

Only the **official-domain identity** is supported. Every other required claim is
inaccessible, and the referral code is partner-only. Page availability was **not**
treated as proof of any individual claim.

## Decision — Outcome B (under re-verification)

Because required claims are inaccessible / partner-only, the packet is `draft` and
**cannot authorize**. `offers.bybit.evidence` stays **`null`**. No optimistic
fallback. The homepage Bybit row remains "Under re-verification" and the public
homepage still emits **zero `/go/*`** in both modes (no country profile exists
either). When a future approved, complete packet exists, the same adapter derives
authorizing `EvidenceMetadata` deterministically.

## Contracts

- `src/data/contracts/offerEvidencePacket.ts` — `OfferEvidencePacket` +
  `validateOfferEvidencePacket` (strict calendar timestamps, canonical identity,
  HTTPS, sha256 digest, per-claim structure, artifact-safety scan for
  secrets/absolute paths, approver-metadata rules) + `isOfficialBybitSource` +
  `adaptApprovedPacketToEvidence`. Reuses the strict timestamp, HTTPS, digest and
  central freshness rules — no duplicated thresholds.
- Adapter fails closed unless: packet valid · `exchangeId === bybit` · official
  HTTPS source · capture fresh (central policy) · review future · **every required
  claim `supported`** · no `contradicted` claim · `approval === approved` with
  valid approver metadata. Draft/validated packets can never authorize.
- `src/data/evidence/offers/bybitOfferEvidence.ts` — loads + validates the packet,
  exposes `BYBIT_OFFER_EVIDENCE_DECISION = 'under_re_verification'` and
  `bybitOfferEvidence = null`.

## Artifact safety

No secrets, cookies, tokens or personal data; no internal absolute filesystem
paths; no full copyrighted page reproduction — only concise normalized
observations, HTTP status and sha256 digests. The validator actively rejects
absolute paths and secret markers in any packet field.

## Verification (all green)

```
npm run portal:contracts:test        # 310 passed, 0 failed  (283 baseline + 27 pkt/*)
npm run ai-ops:validate:fixtures     # 43 passed, 0 failed
tsc --noEmit (contracts scope, +resolveJsonModule) # exit 0
npm run build                        # 109 pages
preview homepage /go/                # 0
production-simulation homepage /go/   # 0
Chromium homepage/disclosure QA      # 44/44 (preview + production-sim × desktop/mobile, keyboard)
```

The 26 required cases are covered under `pkt/*` (draft/validated cannot authorize;
approved-complete adapts; missing/invalid digest; inexact/stale/future/overdue;
non-HTTPS/non-official; exchange mismatch; missing/partial/contradicted/
inaccessible/partner-only required claim blocks; unsupported maximum not silently
verified; offer.status alone cannot authorize; human month string rejected; bybit
identity throughout; both `/go/`=0; registry empty; en/ru/kk facts invariant; no
secrets/absolute paths).

## Not authorized / not performed

No merge, no deploy, no Cloudflare publication, no environment/secret change,
`PUBLIC_CBW_CTA_MODE` untouched, `PUBLIC_MARKET_PROFILES` still empty, no affiliate
destinations modified, no evidence capture for the other five exchanges, no
MarketProfile population, no owner-authored files touched.

## Remaining blockers

- Owner/partner confirmation of the referral-code identity (`CRYPTOBONUSW`).
- A capture method that can observe the client-rendered/region-specific official
  offer terms (authenticated or rendered capture with an established safe policy).
- Evidence-backed MarketProfile population; the other five offer packets; legacy
  CTA migration; localized per-country routes; production activation.
