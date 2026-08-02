# CBW Portal Factory — Split 2 Closeout (v1)

Branch: `feat/cbw-portal-components-contracts-052b`
Status: complete, committed, **not pushed** (no PR / merge / deploy — owner action).

Split 2 delivers a conversion-oriented but fail-closed commercial layer on top of
the Portal Factory contracts: gated CTAs, evidence freshness, accessibility,
localization, public-route emission guarantees, and a visible evidence
disclosure — all wired into the real Homepage Top-10 surface without weakening
any factual/ranking safeguard.

---

## 1. Contracts introduced / extended

| File | Purpose |
|---|---|
| `src/data/contracts/portalFactory.ts` | Core validators (extended: evidence-freshness policy + `assessEvidenceFreshness` + `validateRankingSnapshot(input, { now })`). |
| `src/data/contracts/portalCta.ts` | Gated commercial CTA model + `resolveCommercialCta` (extended with optional evidence-freshness gate). |
| `src/data/contracts/portalCtaI18n.ts` | Localized CTA microcopy + gate-reason text (en/ru/kk) + `pickLocalized` deterministic fallback. |
| `src/data/contracts/portalDisclosure.ts` | Fail-closed, localized evidence-disclosure model (`resolveDisclosure`). |
| `src/data/contracts/portalRouteGuards.ts` | Review/public route guard (existing; now covered by tests). |
| `src/data/contracts/portalPublication.ts` | `emitPublicRankingRoutes` — the composed, fail-closed public-route emission path. |
| `src/data/portalCtaMode.ts` | Central public CTA-mode resolver (`resolvePublicCtaMode`). |
| `src/data/homepageTop10Cta.ts` | Binds real Top-10 rows to the gated CTA contract (facts derived from real records). |

Components: `src/components/home/HomepageTop10.astro` (gated CTA + disclosure),
`src/components/home/Top10Disclosure.astro` (progressive disclosure).

## 2. Validators & fail-closed rules (unchanged safeguards retained)

- HTTPS-only sources; `sha256:` digest; no-evidence → reject; contradiction +
  approved → reject; unknown-confidence + approved → reject.
- Market profile: approved requires known availability; local offer eligibility
  requires an approved profile; review window must be forward.
- Ranking: contiguous positions, no duplicate exchange, approved ranking is
  non-empty and requires an approver.
- **New — evidence freshness** (`EVIDENCE_FRESHNESS_POLICY`: 45-day max age,
  60-min future skew): with an explicit clock, an approved ranking on stale /
  future / invalid evidence is rejected. Deterministic and timezone-safe;
  malformed dates are never coerced to "now". Clock is opt-in so structural
  validation and build fixtures stay time-independent (never rot).

## 3. CTA gating rules

A live affiliate `/go/{slug}` target is emitted **only** when ALL hold:
`mode === 'production'` · commercial intent · availability available|limited ·
offer eligibility `approved` · profile approval `approved` · evidence fresh (when
a clock is supplied) · slug matches pattern. Otherwise the CTA falls back to an
internal review target; restricted/unavailable markets render a genuine disabled
`<button>` (not a JS-suppressed anchor). Affiliate anchors carry
`rel="sponsored nofollow noopener"` + `target="_blank"`.

## 4. Public CTA mode (owner-gated)

`resolvePublicCtaMode()` reads `PUBLIC_CBW_CTA_MODE`, **fail-closed to `preview`**.
Live homepage affiliate links require the owner to set `PUBLIC_CBW_CTA_MODE=production`
at build/deploy time. Default build → homepage emits **zero** `/go/` links.
Production build → `/go/` only for verified, offer-eligible rows.

## 5. Route guards & publication

`emitPublicRankingRoutes` composes ranking + profile validation and the route
guard. Guarantees: a non-approved / invalid / stale snapshot emits **zero**
public routes; a row without an approved+available profile or an
approved+indexable route is excluded; the published list never contains a blocked
exchange; presentation locale never changes the published set.

## 6. Localization

CTA labels, gate reasons and microcopy localized for **en / ru / kk**. Deterministic
missing-translation fallback (`pickLocalized`) returns the English base — never a
raw key — and throws only if the English base itself is missing (build-time
fail-closed). Locale changes wording only; it never changes approval /
availability / eligibility / evidence facts.

## 7. Disclosure behavior

Each Top-10 row shows a compact evidence disclosure: tone (verified / preview /
research / review / missing), freshness ("Checked: …" only when a real date
exists), and a `<details>` progressive panel with the affiliate note (only for a
live affiliate CTA), an HTTPS source link (`rel="nofollow noopener noreferrer"`,
only when a real HTTPS URL exists — never invented) and an internal methodology
link. Unknown/absent evidence fails closed to a `missing` state. No internal
paths or raw payloads are exposed.

## 8. Preview safety & advisory CI

- Preview-safety invariant: no `/go/*` target may appear on a preview surface;
  enforced by build-time guards and the runnable contracts test.
- Advisory CI `.github/workflows/cbw-portal-contracts-advisory.yml`
  (non-blocking, read-only): typecheck contracts, ai-ops fixtures,
  `portal:contracts:test`, fail-closed build.

## 9. Local verification (exact commands)

```
node scripts/portal/contracts-test.mjs          # 91 passed, 0 failed
npm run ai-ops:validate:fixtures                # 43 passed, 0 failed
node_modules/.bin/tsc --noEmit --strict --skipLibCheck \
  --moduleResolution bundler --module esnext --target es2022 \
  src/data/contracts/portal*.ts src/data/portalCtaMode.ts \
  src/data/homepageTop10Cta.ts src/data/exchangePreview/cta-contract.ts   # exit 0
npm run build                                    # 103 pages, exit 0
# Production preview of live affiliate posture (owner action):
PUBLIC_CBW_CTA_MODE=production npm run build
```

Lint: no lint script is configured in this repo; `tsc --noEmit` is the static gate.

## 10. Known limitations

- The homepage renders in a single published locale (`ctaLocale = 'en'`); the
  ru/kk label paths are contract-ready and QA-verified but the site has no
  per-locale homepage routing yet.
- The CTA freshness gate is wired at the contract level; the homepage does not
  feed it a machine timestamp (offer `lastChecked` is a human string), so
  homepage rows gate on approval/eligibility/availability. Verified offers are
  fresh by editorial policy.
- Exchange detail / directory / promo pages carry their own pre-existing
  affiliate CTAs — outside Split-2 scope and unchanged here.

## 11. Production / deployment exclusions

No push, PR, merge or deploy was performed. Enabling live homepage affiliate
links (`PUBLIC_CBW_CTA_MODE=production`) and any production deploy require owner
credentials and owner action.

## 12. Commits (Split 2, on `feat/cbw-portal-components-contracts-052b`)

```
93e49e7 finish Split 2 — gated CTA states + named-state fixtures + advisory CI
28353d2 harden affiliate rel + complete CTA interaction states
2a7b02c runnable fail-closed contracts test + wire into advisory CI
16b5ecc gate Top-10 primary CTA through fail-closed commercial contract
52b2700 deterministic evidence-freshness gate for rankings + CTA
9404379 accessible names, AA contrast and interaction pass on Top-10 CTAs
a3690f5 localize CTA microcopy + gate reasons (en/ru/kk) + deterministic fallback
8064c11 prove public route emission is fail-closed (route guards + publication)
f1d0ee8 governed evidence-disclosure component on Top-10 rows
(+ this closeout doc)
```
