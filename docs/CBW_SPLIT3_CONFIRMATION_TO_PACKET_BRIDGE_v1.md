# CBW Split 3 (P0) — Confirmation-to-Packet Bridge (v1)

Branch: `feat/cbw-split3-confirmation-to-packet-bridge-006`
Governing issue: #258 · Base: `master` @ `8d1eb05` (PR #257 merged)
Status: implemented + owner-review remediation R1–R9; Draft; **not merged until
conditions pass**; **not deployed**. **Real posture: promo stays partner-confirmation-
required; the confirmation set is empty; production partner trust is unconfigured.**

## Objective

One canonical, fail-closed bridge from the trusted ClaimConfirmation evaluator → a
deep-frozen, AUDIT-ONLY resolved Bybit `OfferEvidencePacket` view → the single
authorizing `EvidenceMetadata` entry point. The committed packet is the immutable raw
record; `bybit.promo_code` is never hand-edited to `supported`.

## Legacy generic confirmation path — removed

No `OwnerConfirmationArtifact` type; no `ownerConfirmations` field (deleted from the
real packet JSON; declaring it fails `LEGACY_FIELD_FORBIDDEN`); no `owner-confirmation:`
grammar. The raw packet also rejects `bybit.promo_code = supported`
(`PROMO_RAW_SUPPORT_FORBIDDEN`).

## Exactly one public product EvidenceMetadata entry point (R1/R2)

The ONLY public product function that can produce `EvidenceMetadata` is:

```ts
adaptBybitOfferToEvidence(rawPacket, confirmationSet, nowMs)
```

It performs, internally and in order: raw packet validation → canonical offer-identity
lookup → production confirmation evaluation → claim resolution → full resolution-
integrity construction → packet approval/freshness/source checks → required-claim
checks → EvidenceMetadata construction. Packet readiness, EvidenceMetadata construction
and the resolved→evidence step are PRIVATE. `evaluatePacketReadiness`,
`packetToEvidenceMetadata`, `adaptResolvedApprovedPacketToEvidence` and the raw-packet-
only adapter are **no longer exported** — a caller cannot recreate the readiness +
metadata steps without confirmation evaluation. There is **no** public function that
converts a caller-supplied resolved view into evidence: the adapter always takes the raw
authoritative inputs and recomputes the resolution internally.

## Canonical product offer identity (R3)

`getBybitOfferCommercialIdentity()` returns the immutable `{exchangeSlug:'bybit',
promoCode: getOffer('bybit').promoCode}`. The product resolver/adapter read it
internally — no caller may pass an offer-code argument
(`adaptBybitOfferToEvidence.length === 3`). The exchange slug must be `bybit`, the code
must normalize, and it must match the evaluator-confirmed value exactly. Changing the
real `offers.bybit.promoCode` changes the resolution and blocks stale confirmation reuse.

## Production policy fingerprint (R4)

Each resolution is bound to a policy fingerprint — `policyId`
(`cbw:bybit:promo-code-confirmation:v1`), `policyDigest` = sha256(canonical policy), and
`policyMode` (`production` when the digest equals the production policy digest, else
`test`). The product adapter is production-only; the isolated TEST adapter REFUSES the
production policy (`USE_PRODUCT_ADAPTER`). A test-policy resolution can never authorize
the product path.

## Full raw-packet + confirmation-set digests (R5/R6)

- `computeRawPacketDigest(packet)` covers every committed packet field (id, exchange,
  capturedAt, nextReviewAt, sourceUrl, primaryCaptureId, captureManifestDigest, method,
  tool, full captures, rendered-capture artifact digests, full raw claims, warnings,
  limitations, approval, approver). Tampering any field changes it. The resolution
  carries `rawPacketDigest` and holds **no mutable raw packet reference**.
- `computeConfirmationSetDigest(set)` covers the complete ordered set
  (confirmationId, artifactDigest, status, artifactIntent, replacement/revocation
  links), canonicalized by id. Adding/removing/replacing/revoking/modifying any
  artifact changes it (empty set → deterministic non-empty digest); reordering is
  canonicalized; an artifact with an invalid digest fails resolution.

## Resolution digest + audit snapshot (R7)

The `resolutionDigest` covers the schema id, policy id/digest/mode, `rawPacketDigest`,
`confirmationSetDigest`, offer-identity digest, evaluation clock, evaluator
state/value/confirmationId, ordered confirmation ids, every resolved claim + provenance,
and the exact blocking-required list. The resolved view is a **deep-frozen** audit
snapshot. `validateResolvedOfferPacket` recomputes the digest and enforces invariants:
blocking list equals the recomputed list; non-promo resolved == raw; supported promo
requires evaluator `confirmed` + value == offer code + a real confirmationId; unresolved
promo cannot carry confirmed provenance; every inventory item appears once.

## Isolated synthetic harness (R8)

`scripts/portal/test-support/offer-packet-resolution-harness.mjs` proves the algorithmic
positive path with a synthetic complete packet + a TEST-policy partner confirmation via
the TEST adapter. It is NOT imported by product code and is NOT in production exports;
the production adapter rejects its synthetic partner set (empty production trust), and
the TEST adapter refuses the production policy. Run with
`npm run portal:harness:resolution`.

## Real posture (unchanged)

`BYBIT_PROMO_CODE_CONFIRMATIONS` frozen empty; production `trustedPartnerIdentities`/
`trustedPartnerDomains` empty; state `missing`; `CRYPTOBONUSW` unconfirmed; raw
`bybit.promo_code` `requires_owner_partner_confirmation`; resolved real promo unresolved;
packet `draft`; `offers.bybit.evidence` `null`; `PUBLIC_MARKET_PROFILES` frozen empty;
`PUBLIC_CBW_CTA_MODE` untouched; preview and public production-simulation homepages emit
zero `/go/*`.

## Public API inventory

`offerPacketResolution` public exports: `getBybitOfferCommercialIdentity`,
`resolveBybitOfferPacketClaims` (audit), `resolveOfferPacketClaimsForTest` (harness),
`validateResolvedOfferPacket`, `computeRawPacketDigest`, `computeConfirmationSetDigest`,
`computeConfirmationPolicyDigest`, `computeResolutionDigest`, `canonicalResolution`,
`adaptBybitOfferToEvidence` (**the one product evidence producer**),
`adaptOfferToEvidenceForTest` (refuses the production policy), policy/schema id + digest
constants, and types. `offerEvidencePacket` no longer exports any EvidenceMetadata
adapter, readiness, or metadata helper.

## Verification (all green)

```
npm run portal:contracts:test        # 491 passed, 0 failed  (443 baseline + 48 bridge/*)
npm run ai-ops:validate:fixtures     # 43 passed, 0 failed
tsc --noEmit (contracts scope + offerPacketResolution) # exit 0
npm run build                        # 109 pages
npm run portal:harness:resolution    # 5 passed, 0 failed (isolated synthetic proof)
homepage Chromium QA (separate)      # 32/32 (preview + production-sim × desktop/mobile, keyboard)
preview homepage /go/                # 0
production-simulation homepage /go/   # 0
```

## Not authorized / not performed

No merge without owner review, no deploy, no Cloudflare publication, no environment/
secret change, `PUBLIC_CBW_CTA_MODE` untouched, `PUBLIC_MARKET_PROFILES` empty, no real
confirmation or trusted-partner configuration, no packet approval, no change to the real
promo claim or offer evidence, no other-exchange work, no owner-authored files touched.

## Remaining blockers

- A factual owner-authorized trusted-partner policy + a genuine partner receipt for
  `CRYPTOBONUSW` (the only things that let the product bridge resolve promo supported).
- A complete, approved raw packet whose non-promo required claims are genuinely capture-
  supported; evidence-backed MarketProfile population; the other exchange offer packets;
  legacy CTA migration; localized per-country routes; production activation.
