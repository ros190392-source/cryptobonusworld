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
`nextReviewAt: 2026-08-19T00:00:00Z` · `primaryCaptureId: probe-a` ·
`captureManifestDigest:
sha256:c494fba6783f931680f2a611c0eeb82c906044cf44a8288d2f617343ddc24887`
(recomputable over the 2-probe manifest) · `approval: draft`.

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

## Contracts (hardened, R1–R8)

`src/data/contracts/offerEvidencePacket.ts`. The packet is treated as untrusted
input; all authorization policy is **code-owned**:

- **R1 — code-owned claim policy.** `BYBIT_OFFER_CLAIM_POLICY` (immutable) defines
  the canonical 13-claim inventory and the 9 required claims. The packet inventory
  must match exactly (missing/duplicate/unknown → `PACKET_CLAIM_INVENTORY_INVALID`);
  the packet cannot declare `requiredForAuthorization` (rejected) — the adapter
  reads requirements only from the policy.
- **R2 — derived unsupported claims.** `unsupportedClaims` is removed from the
  packet and derived (`deriveUnsupportedClaims`); declaring it is rejected.
- **R3 — structured capture manifest.** `captures[]` records both probes with only
  observed facts (status, byte counts, body digests, `redirectLocation: null` since
  none was captured). Each capture: unique id, official HTTPS Bybit URL (no
  credentials), integer status 100–599, non-negative bytes, sha256 body digest,
  exact ISO `capturedAt`. `primaryCaptureId` must exist and its URL equals the
  packet `sourceUrl`.
- **R4 — claim→source binding.** Free-form `sourceRef` replaced by structured
  `sourceRefs` (`capture:<id>` / `owner-confirmation:<id>` / `editorial:<id>`);
  `capture:`/`owner-confirmation:` refs must resolve to declared artifacts. A
  **required supported** claim must cite a declared official capture or owner
  confirmation — never editorial. Partner confirmation uses a typed
  `ownerConfirmations[]` artifact.
- **R5 — recomputable digest.** `captureManifestDigest = sha256(canonical
  serialize(captures))`, recomputed and compared by validator/adapter; a look-alike
  or tampered manifest (status/bytes/bodyDigest change, add/remove capture) →
  `DIGEST_MISMATCH`. Node `crypto` is build/server-only (this module is not in the
  client bundle; the Astro build stays valid).
- **R6 — trusted approval.** Approved packets require `approvedBy` ∈
  `ALLOWED_OWNER_IDENTITIES` (`ros190392-source`), exact `approvedAt` with
  `capturedAt ≤ approvedAt < nextReviewAt` and `approvedAt ≤ now`, and a
  GitHub-format `approvalRef`. `approvedBy: "owner"`, unknown approver, pre-capture,
  future, post-deadline, or missing ref all fail closed. (Defense in depth — real
  owner review still required.)
- **R7 — recursive artifact safety.** Every string in the packet is scanned for
  secrets/cookies/tokens/absolute paths/browser-profile paths; URL userinfo
  credentials are rejected.
- **R8 — single evaluation.** `BYBIT_OFFER_EVIDENCE_DECISION` routes through one
  shared evaluator (`deriveBybitDecision`); the only path to `authoritative` is
  `adaptApprovedPacketToEvidence` succeeding, so the decision can never diverge
  from the adapter.

`src/data/evidence/offers/bybitOfferEvidence.ts` loads + validates the packet and
exposes `BYBIT_OFFER_EVIDENCE_DECISION = 'under_re_verification'` and
`bybitOfferEvidence = null`.

## Artifact safety

No secrets, cookies, tokens or personal data; no internal absolute filesystem
paths; no full copyrighted page reproduction — only concise normalized
observations, HTTP status and sha256 digests. The validator actively rejects
absolute paths and secret markers in any packet field.

## Verification (all green)

```
npm run portal:contracts:test        # 320 passed, 0 failed  (283 baseline + 37 pkt/*)
npm run ai-ops:validate:fixtures     # 43 passed, 0 failed
tsc --noEmit (contracts scope, +resolveJsonModule) # exit 0
npm run build                        # 109 pages
preview homepage /go/                # 0
production-simulation homepage /go/   # 0
Chromium homepage/disclosure QA      # 44/44 (preview + production-sim × desktop/mobile, keyboard)
```

The 33 required cases are covered under `pkt/*` (complete-canonical adapts;
missing KYC/restrictions/terms → inventory invalid; required→optional cannot
bypass; unknown/duplicate claim; declared unsupportedClaims rejected; unknown/
editorial/undeclared source refs rejected; complete official bindings accepted;
arbitrary/tampered/status/bodyDigest digest rejected; invalid status; URL
credentials; `approvedBy:"owner"`/unknown/pre-capture/future/post-deadline/
missing-ref approval rejected; recursive unsafe content rejected; real packet valid
+ under-re-verification + cannot adapt; `offers.bybit.evidence` null; both `/go/`=0;
registry empty; locale invariant) plus digest-recomputation, policy, derived-list
and two-probe sanity checks.

## Not authorized / not performed

No merge, no deploy, no Cloudflare publication, no environment/secret change,
`PUBLIC_CBW_CTA_MODE` untouched, `PUBLIC_MARKET_PROFILES` still empty, no affiliate
destinations modified, no evidence capture for the other five exchanges, no
MarketProfile population, no owner-authored files touched.

## Public rendered-capture runner (Issue #254)

A reusable, fail-closed **public anonymous rendered-capture runner** was added and
run once against both official Bybit promo URLs.

- **Contract** `src/data/contracts/publicRenderedCapture.ts` — `PublicRenderedCapture`
  with identity, requested/final URLs + redirect chain (all official HTTPS Bybit,
  no credentials/unsafe params), strict `capturedAt`, browser/runtime versions,
  six ephemeral-context assertions (each must be literally `false`), viewport,
  locale, status/content-type, `outcome` (one of nine allowed; unknown rejected),
  **bounded** copyright-safe fragments (max 300 chars, no full HTML / script /
  JSON dump, recomputable `fragmentDigest`), allowlisted scalar `structuredMetadata`,
  and a recomputable `normalizedArtifactDigest`. Recursive artifact-safety rejects
  secrets/cookies/tokens/absolute paths.
- **Runner** `scripts/evidence/capture-bybit-rendered.mjs` (`npm run
  evidence:capture:bybit:rendered -- --live --confirm-live`) — fresh ephemeral
  Chromium: no persistent profile, storage import, proxy, credentials, extensions,
  downloads, form submission, or non-official navigation; blocks downloads / file
  choosers / non-official popups; classifies walls/errors honestly without bypass.
  Manual only — never run in build/CI, transient output gitignored.
- **Offline CI** — CI validates the committed normalized artifacts and recomputes
  digests (`validatePublicRenderedCapture`); no browser/network in GitHub Actions.

**Live render outcome (2026-08-05):** both official URLs → `outcome:
network_error` (headless ephemeral navigation received no response; status `null`,
0 fragments, no redirect chain captured). No offer content rendered, so **no claim
changed**. The two rendered captures are added to `renderedCaptures[]` (each with
its own `normalizedArtifactDigest`); the two HTTP probes and the
`captureManifestDigest` are unchanged. `promo_code` remains
`requires_owner_partner_confirmation`; the packet remains `draft`;
`offers.bybit.evidence` remains `null`.

## Remaining blockers

- Owner/partner confirmation of the referral-code identity (`CRYPTOBONUSW`).
- A capture method that can observe the client-rendered/region-specific official
  offer terms (authenticated or rendered capture with an established safe policy).
- Evidence-backed MarketProfile population; the other five offer packets; legacy
  CTA migration; localized per-country routes; production activation.
