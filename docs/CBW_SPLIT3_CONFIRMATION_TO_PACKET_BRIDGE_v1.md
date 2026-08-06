# CBW Split 3 (P0) — Confirmation-to-Packet Bridge (v1)

Branch: `feat/cbw-split3-confirmation-to-packet-bridge-006`
Governing issue: #258 · Base: `master` @ `8d1eb05` (PR #257 merged)
Status: implemented; Draft PR; **not merged**; **not deployed**. **Real posture: promo
stays partner-confirmation-required; the confirmation set is empty; no real evidence.**

## Objective

One canonical, fail-closed bridge from the trusted ClaimConfirmation evaluator → a
NON-MUTATING resolved Bybit `OfferEvidencePacket` claim view → the authorizing
EvidenceMetadata adapter. The committed packet remains the immutable historical raw
evidence record; `bybit.promo_code` is never hand-edited to `supported`.

## Legacy generic confirmation path — retired

The weak generic `OwnerConfirmationArtifact` / `ownerConfirmations` path is removed
entirely: no `OwnerConfirmationArtifact` type, no `ownerConfirmations` field (declaring
it now fails `LEGACY_FIELD_FORBIDDEN`), no `owner-confirmation:` source-reference
grammar, and the field is deleted from the real packet JSON. No generic owner string
can support any claim. The ClaimConfirmation evaluator is the only confirmation source.

## Raw packet stays raw

`validateOfferEvidencePacket` now additionally rejects `bybit.promo_code` with result
`supported` (`PROMO_RAW_SUPPORT_FORBIDDEN`) — promo authority can never flow through
the raw packet. The committed `bybit.promo_code` result stays
`requires_owner_partner_confirmation`.

## Resolver (`src/data/contracts/offerPacketResolution.ts`)

```ts
resolveOfferPacketClaims(rawPacket, confirmationSet, nowMs, offerPromoCode, policy)
resolveBybitOfferPacketClaims(rawPacket, confirmationSet, nowMs, offerPromoCode) // production policy
```

Produces a resolved view WITHOUT mutating the packet, confirmation set, offer record or
policy: packet identity + `captureManifestDigest` + rendered-artifact digests, validated
raw claims, the confirmation evaluator result, one resolved entry per canonical claim
(raw result + resolved result + provenance), blocking required claim IDs, the normalized
offer promo code, the explicit evaluation clock, and a deterministic `resolutionDigest`
— or a structured failure reason.

## Promo-code-only bridge

Only `bybit.promo_code` is influenced by confirmation data; every other claim copies its
raw result (`raw_capture` provenance). Bridge states:

| Evaluator state | Resolved promo |
|---|---|
| `confirmed` + value === normalized offer code | **supported** (provenance: evaluator + confirmationId) |
| `confirmed` + value ≠ offer code | fail closed `CONFIRMED_VALUE_MISMATCH` |
| `missing` / `pending_partner_confirmation` | unresolved (pending) |
| `expired` | unresolved (expired provenance) |
| `revoked` | unresolved (revoked provenance) |
| `invalid` | fail closed `CONFIRMATION_INVALID` |
| `conflict` | fail closed `CONFIRMATION_CONFLICT` |

No substring/prefix matching — exact normalized equality only.

## Canonical value source

The bridge candidate comes from ONE product-data source — the Bybit `Offer.promoCode`
(`getOffer('bybit').promoCode` = `CRYPTOBONUSW`) — normalized via the code-owned
`normalizeReferralCode`. It is never derived from labels, prose, warnings, statements or
docs. Changing `offers.bybit.promoCode` changes the resolution digest and blocks stale
reuse (a confirmation of the old value → `CONFIRMED_VALUE_MISMATCH`).

## One adapter path

```ts
adaptResolvedApprovedPacketToEvidence(resolvedPacket, nowMs)   // the authorizing adapter
adaptBybitOfferToEvidence(rawPacket, confirmationSet, nowMs, offerPromoCode) // product wrapper
```

The resolved adapter re-checks packet readiness (approval, trusted approver, freshness,
official source, identity, review window) via the shared `evaluatePacketReadiness`,
requires the resolution digest intact and computed at the same clock, and requires every
code-owned required claim to resolve `supported`. The legacy raw-only
`adaptApprovedPacketToEvidence` is retained but structurally NON-AUTHORIZING: promo can
never be raw-supported, so it always blocks (`REQUIRED_CLAIM_UNSUPPORTED`). No exported
helper can force a claim to supported.

## Resolution digest

`resolutionDigest` covers packet ID, exchange ID, capture-manifest digest, rendered
artifact digests, raw claim inventory/results/sourceRefs, normalized offer promo code,
confirmation-set evaluation (state/value/confirmationId), the evaluation clock, every
resolved claim result + provenance, and blocking required claim IDs — everything except
the digest itself, with deterministic ordering. Tampering the packet, offer code,
confirmation set, clock, a resolved result or a provenance record all break it; a missing
or duplicated resolved claim fails closed.

## Synthetic positive proofs (test-only)

- **CASE A** — real packet + a synthetic exact TEST-policy partner confirmation → only
  `bybit.promo_code` resolves `supported`; the inaccessible required claims stay
  unchanged and keep blocking; the adapter still rejects.
- **CASE B** — a synthetic complete raw packet (all non-promo required supported, promo
  raw = partner-confirmation-required) + a synthetic exact promo confirmation, approved
  under a test fixture → all required claims resolve supported → the resolved adapter
  produces test-only `EvidenceMetadata`.

No synthetic policy, trusted partner, receipt, resolved packet or `EvidenceMetadata`
enters product data. Product uses the production policy (empty partner trust), so the
real path is non-authorizing.

## Real posture (unchanged)

`BYBIT_PROMO_CODE_CONFIRMATIONS` frozen empty; production partner trust empty;
confirmation state `missing`; `CRYPTOBONUSW` unconfirmed; raw `bybit.promo_code`
`requires_owner_partner_confirmation`; resolved real promo unresolved; raw packet `draft`;
`offers.bybit.evidence` `null`; `PUBLIC_MARKET_PROFILES` frozen empty; `PUBLIC_CBW_CTA_MODE`
untouched; preview and public production-simulation homepages emit zero `/go/*`.

## Verification (all green)

```
npm run portal:contracts:test        # 478 passed, 0 failed  (441 baseline + 2 pkt + 39 bridge, minus none)
npm run ai-ops:validate:fixtures     # 43 passed, 0 failed
tsc --noEmit (contracts scope + offerPacketResolution) # exit 0
npm run build                        # 109 pages
homepage Chromium QA (separate)      # 32/32 (preview + production-sim × desktop/mobile, keyboard)
preview homepage /go/                # 0
production-simulation homepage /go/   # 0
```

## Not authorized / not performed

No merge, no deploy, no Cloudflare publication, no environment/secret change,
`PUBLIC_CBW_CTA_MODE` untouched, `PUBLIC_MARKET_PROFILES` empty, no real confirmation or
trusted-partner configuration, no packet approval, no change to the real promo claim or
offer evidence, no other-exchange work, no owner-authored files touched.

## Remaining blockers

- A factual, owner-authorized trusted-partner policy + a genuine partner receipt for
  `CRYPTOBONUSW` (the only things that let the bridge resolve promo supported in
  production).
- A complete, approved raw packet whose non-promo required claims are genuinely
  supported by capture evidence; evidence-backed MarketProfile population; the other
  exchange offer packets; legacy CTA migration; localized per-country routes; production
  activation.
