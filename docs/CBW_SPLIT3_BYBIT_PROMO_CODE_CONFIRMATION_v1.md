# CBW Split 3 (P0) — Trusted Owner/Partner Confirmation Intake (v1)

Branch: `feat/cbw-split3-trusted-confirmation-intake-005`
Governing issue: #256 · Base: `master` @ `ebf9755` (PR #255 merged)
Status: implemented + owner-review remediation R1–R9; **not merged until conditions pass**;
**not deployed**. **Real posture: promo code remains partner-confirmation-required; the
production confirmation set is empty and its trusted-partner policy is unconfigured.**

## Objective

Replace the weak generic `OwnerConfirmationArtifact` with a claim-bound, value-bound,
time-bound, conflict-aware and revocable confirmation intake for partner-only offer
facts. A confirmation binds ONE exchange / claim / assertion type / exact normalized
value / value digest / trusted actor + role / auditable source / validity window /
lifecycle state, with optional replacement/revocation links and a full recomputable
`artifactDigest`. A confirmation for another exchange, claim or value can never support
`bybit.promo_code`. This task builds the intake contract + offline workflow only.

## One authorizing path (R1)

`evaluatePromoCodeConfirmations(artifacts, nowMs, policy)` is the **sole** authorization
decision; the product wrapper `evaluateBybitPromoCodeConfirmations(artifacts, nowMs)`
always injects the production policy. There is no per-artifact "supports" shortcut:
`isActiveAdmissibleConfirmed` is a private detail (never exported) that does **not**
itself represent quorum satisfaction. The only convenience helper,
`promoCodeSetConfirmsValue(artifacts, nowMs, policy, value)`, takes the complete set,
delegates to the evaluator, and returns `true` only when `state === 'confirmed'` and the
evaluator value equals the requested normalized value.

## Unconfigured production partner trust (R2)

The **production** `BYBIT_PROMO_CODE_CONFIRMATION_POLICY` has
`trustedPartnerIdentities: []` and `trustedPartnerDomains: []` — no factual partner
identity/domain has been supplied, so a partner artifact can never be authorized in
production and the real state stays `missing`. A self-declared
`confirmedBy: 'bybit-partner-official'` is untrusted → the evaluator returns `invalid`.
The positive algorithmic path is proven only with an explicitly **TEST-ONLY**
`TEST_ONLY_PROMO_CODE_POLICY` fixture (`test-partner-fixture` / `partner.test`), which
never enters product exports or real artifacts.

## Structured source assertion (R4)

Authorization uses a structured `sourceAssertion` — `{exchangeId, claimId,
assertionType, assignmentState, assertedValue}` — that must mirror the artifact subject
exactly, with a code-owned `assignmentState`. Only `active` is a POSITIVE assignment;
`inactive` / `revoked` / `historical` / `not_assigned` are non-positive and cannot
authorize. `sourceStatement` remains bounded explanatory text and never authorizes via
substring matching.

## Structured partner receipt provenance (R3)

Partner sources carry a typed `partnerReceipt` — `{issuerId, issuerDomain, receiptKind,
receiptId, issuedAt, normalizedAssertion, normalizedReceiptDigest, redactionVersion}`.
Issuer identity + domain must match the injected policy; `receiptKind` equals the
partner `sourceKind`; `receiptId` is an immutable bounded slug bound to `sourceId`;
`issuedAt` is strict and binds to `sourceEventAt`; `normalizedAssertion` equals the
canonical `sourceAssertion`; `normalizedReceiptDigest` recomputes (tampering issuer /
domain / receiptId / assertion / issuedAt breaks integrity). GitHub owner sources forbid
a `partnerReceipt`; partner sources require one. No dashboard/email dumps, credentials,
tokens, cookies or personal data.

## Fail closed on active-invalid (R5)

A purported ACTIVE (`confirmed`) artifact that fails policy — wrong exchange / claim /
assertion, untrusted actor or source, non-positive assignment, or malformed partner
provenance — fails the **whole set closed** (`invalid`); it is never silently discarded.
A clean empty set → `missing`; a clean owner-only set → `pending_partner_confirmation`.

## Replacement / revocation semantics (R6)

Code-owned `artifactIntent` — `attestation` / `replacement` / `revocation`. Attestation
carries no links; replacement carries exactly one `replacesConfirmationId`; revocation
carries exactly one `revokesConfirmationId`; an artifact cannot do both. Targets must
exist, share exchange + claim, and the action must occur strictly after its target;
self-references and cycles are rejected. An active replacement suppresses the replaced
artifact and its predecessor chain (a new value therefore does not create an old+new
conflict); an active revocation removes its target from the active quorum and does not
itself assert a value (revocation alone → `revoked`, never `confirmed`).

## Deterministic statement normalization (R7)

`normalizeStatement` trims outer whitespace, normalizes line endings, collapses internal
whitespace runs to single spaces, enforces bounds, rejects control chars and dumps; the
stored `sourceStatement` must already equal this normalization, and its digest is
computed from the normalized value.

## Digest subjects

- **asserted-value digest** → `exchangeId + claimId + assertionType + normalized value`.
- **source-statement digest** → normalized statement.
- **partner-receipt digest** → issuer/domain/receiptKind/receiptId/issuedAt/assertion.
- **full artifact digest** → every provenance / lifecycle / safety field (incl.
  `artifactIntent`, `sourceAssertion`, `partnerReceipt`, links) except itself.

## Single evaluator states + explicit clock (R8)

The evaluator returns `confirmed` / `pending_partner_confirmation` / `missing` /
`invalid` / `expired` / `revoked` / `conflict`, and takes an explicit finite clock — a
non-finite clock returns `invalid`; there is **no** `Date.now()` fallback.

## Manual, offline command (R8)

`npm run evidence:confirmation:bybit:promo-code -- --candidate CRYPTOBONUSW` writes a
non-authorizing draft template to a transient, gitignored path. `--validate <file>
--evaluate-at <ISO>` runs a full offline evaluation at an explicit strict clock (missing
or non-strict `--evaluate-at` exits non-zero). `--structural <file>` validates shape only
without any lifecycle evaluation or clock. The command never authenticates to
GitHub/Bybit/email, reads secrets, marks anything `confirmed`, adds approver metadata, or
modifies the real packet / `offers.ts`; invalid output exits non-zero and is never
written into product data.

## Real posture (unchanged)

`BYBIT_PROMO_CODE_CONFIRMATIONS` is `Object.freeze([])`; the derived
`BYBIT_PROMO_CODE_CONFIRMATION_STATE` is `missing`; the candidate `CRYPTOBONUSW` stays
unconfirmed (`candidateConfirmed: false`). `bybit.promo_code` remains
`requires_owner_partner_confirmation`; the Bybit packet remains `draft`; its
`ownerConfirmations` stays empty; `offers.bybit.evidence` remains `null`;
`PUBLIC_MARKET_PROFILES` stays `Object.freeze([])`; `PUBLIC_CBW_CTA_MODE` untouched;
preview and public production-simulation homepages emit zero `/go/*`.

## Verification (all green)

```
npm run portal:contracts:test        # 441 passed, 0 failed  (396 baseline + 45 conf/*)
npm run ai-ops:validate:fixtures     # 43 passed, 0 failed
tsc --noEmit (contracts scope)        # exit 0
npm run build                        # 109 pages
manual command: draft template + --validate (explicit clock) + --structural
homepage Chromium QA (separate)      # 32/32 (preview + production-sim × desktop/mobile, keyboard)
preview homepage /go/                # 0
production-simulation homepage /go/   # 0
```

## Not authorized / not performed

No merge without owner review, no deploy, no Cloudflare publication, no
environment/secret change, `PUBLIC_CBW_CTA_MODE` untouched, `PUBLIC_MARKET_PROFILES`
empty, no real owner/partner confirmation fabricated, no packet approval, no change to
the promo-code result or offer evidence, no other-exchange capture, no owner-authored
files touched.

## Remaining blockers

- A factual trusted-partner identity/domain policy (owner-authorized) plus a genuine
  partner receipt for `CRYPTOBONUSW` — the only things that can move the state off
  `missing`.
- Wiring the `confirmed` state into an approved packet (future task) once a real receipt
  exists; evidence-backed MarketProfile population; the other exchange offer packets;
  legacy CTA migration; localized per-country routes; production activation.
