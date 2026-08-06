# CBW Split 3 (P0) — Bybit Official Multi-Source Claim Evidence (v1)

Branch: `feat/cbw-split3-bybit-official-multisource-evidence-007`
Governing issue: #260 · Base: `master` @ `d107b83`
Status: implemented; **Draft**; **not merged**; **not deployed**. Real posture unchanged:
every target claim stays unsupported, the packet stays `draft`, promo stays
confirmation-gated, `offers.bybit.evidence` stays `null`.

## Objective

Capture, validate and commit bounded OFFICIAL public Bybit evidence for the seven
unresolved non-promo required claims (plus three optional claims when the same official
source covers them), using a code-owned claim/source plan, a reusable official-source
capture artifact, existing safe capture foundations and fully offline CI replay. Upgrade
a claim to `supported` ONLY when official evidence proves the exact current CBW assertion
at the required scope — otherwise `partially_supported` / `not_found` / `contradicted` /
`inaccessible`, fail-closed.

## What was added

1. **`src/data/contracts/officialSourceCapture.ts`** — a fail-closed, offline-replayable
   artifact for an anonymous capture of an official Bybit source, classified by SCOPE
   (`promotion_specific` … `ambiguous`) and CURRENCY (`current`/`historical`/`ambiguous`),
   with a deterministic OUTCOME matrix (only `content` may carry claim-supporting
   fragments), bounded claim-oriented fragments (claim IDs + assertion-component IDs +
   supports/contradicts stance), recomputable fragment + source digests, a safe HTTP
   receipt (no auth/cookies/proxy; body never committed) and recursive artifact safety.
2. **`src/data/contracts/bybitOfferClaimSourcePlan.ts`** — the immutable
   `BYBIT_OFFER_CLAIM_SOURCE_PLAN` (7 required + 3 optional claims, each once), the exact
   current CBW assertion + MATERIAL components per claim, per-component accepted scopes,
   entry-level insufficient scopes, preferred capture method, expected evidence type,
   freshness/currency rule, contradiction rule and single-vs-multiple-source rule; the
   code-owned `BYBIT_OFFICIAL_SOURCE_CANDIDATES` inventory; and the deterministic
   `assessOfferClaimEvidence` engine + `validateSourcePlanCoverage`. `bybit.promo_code`
   (confirmation-gated) and `bybit.realistic_value` (editorial) are excluded from
   source-based support and refused by the assessment.
3. **`scripts/evidence/capture-bybit-official-sources.mjs`** — a MANUAL, live-flagged
   (`--live --confirm-live`) anonymous multi-source capture command that probes only the
   code-owned official candidates, classifies each honestly, extracts bounded fragments
   only on a `content` outcome via a code-owned plan, validates every artifact, writes to
   a TRANSIENT gitignored path, exits non-zero on invalid output, prints a claim-by-claim
   summary, and offers an offline `--replay` mode (no network) that re-validates committed
   artifacts and recomputes every digest.

The Bybit `OfferEvidencePacket` gains an additive `officialSourceCaptures[]` array and two
new sourceRef kinds — `source:<id>` (audit/context only, never support) and
`source-fragment:<src>/<frag>` (admissible only on an official `content` capture whose
fragment binds the exact claim). The resolution-bridge raw-packet + resolution digests
now also cover the official-source digests.

## The critical scope rule (fail closed)

A general account-wide rule does NOT prove a promotion-specific assertion. Accepted scopes
are per-component: a general identity-verification page may prove only
`identity-verification-exists` for `bybit.kyc_required` — the promo-withdrawal components
require `promotion_specific`/`campaign_terms`, so the claim can reach at most
`partially_supported`, never `supported`, from general evidence.

## Capture outcome (this run)

Anonymous capture, 2026-08-06:

| source | declared → observed scope | outcome |
|---|---|---|
| `promo-new-user` | promotion_specific → account_wide_general | `redirect_only` (→ homepage) |
| `promo-welcome-gifts` | promotion_specific → account_wide_general | `redirect_only` (→ homepage) |
| `help-kyc-identity` | identity_verification_general | `spa_shell` (client-rendered) |

Both official promotion URLs redirect to the generic Bybit homepage (scope degrades to
`account_wide_general`, insufficient for promotion-specific claims); the identity help
article is a client-rendered shell. No promotion-specific or general offer-claim content
was server-observable to an anonymous capture.

## Claim-by-claim (before → after)

Every target claim was `inaccessible` at baseline and remains **`inaccessible`** — none
upgraded. `bybit.source_identity` stays `supported`; `bybit.promo_code` stays
`requires_owner_partner_confirmation`; `bybit.realistic_value` stays editorial `not_found`.

## Real posture (unchanged)

Packet `draft`; `offers.bybit.evidence` `null`; `BYBIT_PROMO_CODE_CONFIRMATIONS` frozen
empty; production partner trust empty; `PUBLIC_MARKET_PROFILES` frozen empty;
`PUBLIC_CBW_CTA_MODE` untouched; preview and public production-simulation homepages emit
zero `/go/*`; the production adapter remains non-authorizing.

## Verification

```
npm run portal:contracts:test        # 531 passed, 0 failed (491 baseline + 40 src/*)
npm run ai-ops:validate:fixtures     # 43 passed, 0 failed
tsc --noEmit (full CI-scoped incl. the 2 new contracts) # exit 0
npm run build                        # 109 pages
npm run portal:harness:resolution    # 5 passed, 0 failed
offline replay (--replay)            # 3/3 artifacts valid, digests recompute
homepage Chromium QA (separate)      # 32/32 (preview + production × desktop/mobile + keyboard)
preview homepage /go/*               # 0
production-simulation homepage /go/* # 0
```

## Not authorized / not performed

No merge, no deploy, no Cloudflare publication, no env/secret change, no trusted-partner
policy or promo receipt, no packet approval, no `offers.bybit.evidence` activation, no
MarketProfile population, no affiliate destination change, no other-exchange capture, no
owner-authored file mutation.

## Remaining blockers

Genuine promotion-specific official evidence is not observable to an anonymous capture
(promo pages redirect to the homepage; help articles are client-rendered). Upgrading any
claim needs either an official source that server-renders the exact current assertion at
the required scope, or an owner-authorized capture channel — plus, for promo, a trusted
partner receipt. The packet stays draft until then.
