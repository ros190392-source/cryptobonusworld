# CBW Split 3 (P0) — Trusted Owner/Partner Confirmation Intake (v1)

Branch: `feat/cbw-split3-trusted-confirmation-intake-005`
Governing issue: #256 · Base: `master` @ `ebf9755` (PR #255 merged)
Status: implemented; Draft PR; **not merged**; **not deployed**. **Real posture: promo
code remains partner-confirmation-required; confirmation set is empty.**

## Objective

Replace the weak generic `OwnerConfirmationArtifact` with a claim-bound, value-bound,
time-bound, conflict-aware and revocable confirmation intake for partner-only offer
facts. A URL + a "confirmed" word is not proof: a confirmation must bind one exchange,
one claim, one assertion type, one exact normalized value, one recomputable value
digest, one trusted actor + role, one auditable source, one validity window and one
lifecycle state. A confirmation for another exchange, claim or value can never support
`bybit.promo_code`.

This task builds the intake contract + offline workflow only. It does **not** confirm
the real referral code, approve the packet, populate MarketProfiles, enable `/go/*`,
deploy, or change environments.

## ClaimConfirmationArtifact (`src/data/contracts/claimConfirmation.ts`)

Fail-closed contract. Fields: `confirmationId`, `exchangeId`, `claimId`,
`assertionType`, normalized `assertedValue`, `assertedValueDigest`, `confirmedBy`,
`confirmationRole`, strict `confirmedAt`, strict `validUntil`, strict `sourceEventAt`,
`sourceKind`, `sourceUrl | null`, immutable `sourceId`, redacted `sourceStatement`,
`sourceStatementDigest`, `status`, `replacesConfirmationId`, `revokesConfirmationId`,
`limitations`, optional bounded `note`, and the full `artifactDigest`.

All enums are **code-owned and closed** (unknown values rejected):

- assertion: `exact_referral_code_assignment`;
- role: `owner`, `partner`;
- lifecycle: `draft`, `validated`, `confirmed`, `revoked`, `expired`, `rejected`;
- source kind: `github_issue_comment`, `github_pr_review`, `github_review_comment`,
  `partner_dashboard_receipt`, `partner_email_receipt`.

Structural validation (`validateClaimConfirmation`) checks well-formedness only —
digests recompute, enums valid, strict timestamps with `validUntil > confirmedAt` and
`confirmedAt ≥ sourceEventAt`, bounded/redacted strings, recursive artifact-safety —
so a **draft template is structurally valid but non-authorizing**. Trust (actor,
source, statement binding, value === candidate), now-relative time and lifecycle are
enforced only by the authorizing evaluator.

## Digest subjects

- **Asserted-value digest** covers `exchangeId + claimId + assertionType + normalized
  assertedValue`. Changing the offer value, claim, exchange or assertion type
  invalidates it (`VALUE_DIGEST_MISMATCH`).
- **Source-statement digest** covers the normalized redacted statement.
- **Full artifact digest** covers every committed provenance / lifecycle / safety field
  (confirmedAt, validUntil, sourceEventAt, role, status, source id/url/statement,
  replacement/revocation links, limitations, note, …) except the digest itself.
  Tampering any of these fields fails `ARTIFACT_DIGEST_MISMATCH`.

## Code-owned Bybit promo-code policy

`BYBIT_PROMO_CODE_CONFIRMATION_POLICY` (immutable): exchange `bybit`, claim
`bybit.promo_code`, assertion `exact_referral_code_assignment`, candidate value
`CRYPTOBONUSW` (`candidateConfirmed: false`), `requiresPartnerProof: true`, trusted
owner identity `ros190392-source`, trusted partner identity `bybit-partner-official`,
owner sources = GitHub kinds, partner sources = partner receipt kinds, `maxValidityDays
180`. The packet declares none of this.

**Normalization** (`normalizeReferralCode`) is deterministic: trim outer whitespace,
canonical uppercase; reject empty, internal whitespace, control chars and any character
outside `[A-Z0-9]`; it never silently converts a materially different value.

## Trusted source policy

GitHub sources must be a repo-owned (`ros190392-source/cryptobonusworld`) issue-comment
/ PR-review / review-comment URL with an immutable numeric id that equals `sourceId`;
generic statements ("approved" / "looks good") are rejected — the normalized statement
must explicitly bind the exchange, the promo/referral code and the exact value. Partner
receipts use a separate typed kind, carry no URL, use a code-owned partner identity, and
must be concise redactions (full email/dashboard dumps, markup, headers, secrets, tokens
and cookies are rejected). CI validates committed normalized artifacts fully offline.

## Single canonical evaluator

`evaluateBybitPromoCodeConfirmations(artifacts, nowMs)` is the ONE authorizing decision.
It takes an explicit finite clock (no `Date.now()` fallback) and returns one structured
state: `confirmed`, `pending_partner_confirmation`, `missing`, `invalid`, `expired`,
`revoked`, `conflict`. Semantics: owner attestation alone → `pending_partner_confirmation`;
a synthetic trusted partner confirmation of the exact candidate → `confirmed`; wrong
value / claim / exchange / generic statement / untrusted actor never support; two
distinct active values → `conflict`; expired/revoked/draft/validated/rejected cannot
support; duplicate ids, unknown replacement/revocation targets and cycles fail closed.
There is no second, weaker algorithm.

## Manual, offline command

`npm run evidence:confirmation:bybit:promo-code -- --candidate CRYPTOBONUSW` writes a
**non-authorizing draft template** to a transient, gitignored path
(`scripts/evidence/out-bybit-promo-code-confirmation.json`). It never authenticates to
GitHub/Bybit/email, reads secrets, scrapes accounts, marks anything `confirmed`, adds
approver metadata, or modifies the real packet / `offers.ts`; an invalid template exits
non-zero and is never written. A separate `--validate <file>` mode validates a
user-supplied normalized receipt offline (structural + policy + informational evaluator
state) and never writes into product data.

## Real posture (unchanged)

`BYBIT_PROMO_CODE_CONFIRMATIONS` is `Object.freeze([])` — no real confirmation was
added. The derived `BYBIT_PROMO_CODE_CONFIRMATION_STATE` is `missing`; the candidate
`CRYPTOBONUSW` stays unconfirmed. `bybit.promo_code` remains
`requires_owner_partner_confirmation`; the Bybit packet remains `draft`; the packet's
`ownerConfirmations` stays empty; `offers.bybit.evidence` remains `null`;
`PUBLIC_MARKET_PROFILES` stays `Object.freeze([])`; `PUBLIC_CBW_CTA_MODE` untouched;
preview and public production-simulation homepages emit zero `/go/*`.

## Verification (all green)

```
npm run portal:contracts:test        # 434 passed, 0 failed  (396 baseline + 38 conf/*)
npm run ai-ops:validate:fixtures     # 43 passed, 0 failed
tsc --noEmit (contracts scope, +claimConfirmation + real module) # exit 0
npm run build                        # 109 pages
manual command (draft template + --validate)   # non-authorizing, gitignored
homepage Chromium QA (separate)      # 32/32 (preview + production-sim × desktop/mobile, keyboard)
preview homepage /go/                # 0
production-simulation homepage /go/   # 0
```

The 38 `conf/*` cases cover every mandatory item in Issue #256 (draft validity,
owner-only pending, synthetic partner positive, generic/wrong-exchange/claim/value
rejection, deterministic normalization, unsafe value rejection, value/statement/artifact
digest recomputation + tampering, source-policy + immutable-id checks, untrusted actor,
before-source-event + future + window rules, lifecycle denial, exact claim/value-only
support, conflict/duplicate/unknown-target/cycle, recursive safety, dump rejection,
manual draft-only behavior, unchanged real posture, zero public `/go/*`, frozen empty
registry, locale-invariant facts).

## Not authorized / not performed

No merge, no deploy, no Cloudflare publication, no environment/secret change,
`PUBLIC_CBW_CTA_MODE` untouched, `PUBLIC_MARKET_PROFILES` still empty, no real
owner/partner confirmation fabricated, no packet approval, no change to the promo-code
result or offer evidence, no capture for another exchange, no owner-authored files
touched.

## Remaining blockers

- A genuine, separately-supplied factual owner/partner receipt for `CRYPTOBONUSW`
  (the only thing that can move the state off `missing`).
- Wiring the confirmed state into an approved packet (future task) once a real receipt
  exists; evidence-backed MarketProfile population; the other exchange offer packets;
  legacy CTA migration; localized per-country routes; production activation.
