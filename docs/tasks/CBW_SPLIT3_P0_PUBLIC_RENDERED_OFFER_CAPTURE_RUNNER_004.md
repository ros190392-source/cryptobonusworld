# CBW-SPLIT3-P0-PUBLIC-RENDERED-OFFER-CAPTURE-RUNNER-004

## Status
Prepared for execution on `feat/cbw-split3-public-rendered-capture-runner-004`.

## Canonical base
- `master` merge SHA: `25441e6388935e5d2e2316c8a185e00779bd04b8`
- PR #253 is merged.
- The real Bybit packet remains `draft`.
- `offers.bybit.evidence` remains `null`.
- `PUBLIC_MARKET_PROFILES` remains empty.

## Governing issue
Issue #254 is the complete owner authorization and acceptance contract. Read it fully before implementation.

## Objective
Implement a reusable, deterministic, public anonymous rendered-capture runner for official offer pages and execute one Bybit retry. The runner may observe public client-rendered content but must not authenticate, import browser state, use proxies, bypass CAPTCHA/geo restrictions, submit forms, register, deposit, perform KYC, or change production behavior.

## Mandatory safety boundary
The browser must use a fresh ephemeral context with:
- no persistent user-data directory;
- no storage-state import;
- no cookies at start;
- no proxy;
- no downloads;
- no file chooser;
- no form submission or commercial/account actions;
- no navigation outside the code-owned official-host allowlist;
- bounded redirects, runtime and extracted data;
- explicit wall/error classification rather than bypass.

Do not commit full HTML, full page text, HAR, video, browser cache, cookies, tokens, personal data, or large screenshots. Commit only bounded normalized claim-oriented fragments and deterministic metadata/digests.

## Required implementation

### 1. Rendered capture contract
Create a fail-closed contract covering identity, requested/final URLs, redirect chain, exact timestamp, browser/runtime version, ephemeral-context assertions, viewport/locale, status/content type, title, outcome, bounded fragments, warnings, limitations and digests.

Allowed outcomes:
- `rendered`
- `redirect_only`
- `login_wall`
- `captcha_or_bot_wall`
- `geo_restricted`
- `empty`
- `timeout`
- `network_error`
- `unsupported`

### 2. Manual runner + offline replay
Provide a manual live command for Bybit and an offline deterministic validator/replay path used by tests/CI. CI must not depend on network access.

### 3. Copyright-safe fragments
Every stored visible-text fragment must:
- be concise and bounded;
- identify its selector/semantic locator or structured metadata path;
- include a recomputable digest;
- contain no secrets, cookies, tokens, personal data or absolute paths;
- never reproduce a full page.

### 4. Bybit packet integration
Preserve the two merged HTTP probes. Add the rendered attempt as a structured capture record in the existing Bybit evidence packet and recompute packet integrity.

A claim result may improve only when the committed rendered artifact directly supports it through a valid source reference. Page load alone proves nothing. The referral code remains partner-confirmation-required in this task.

### 5. Real posture
The real packet must remain `draft`; `offers.bybit.evidence` must remain `null`. This task cannot approve evidence or populate MarketProfiles, even if some public claims become visible.

## Required tests
Implement all cases listed in Issue #254, including ephemeral-context enforcement, proxy/profile/cookie rejection, official-host/redirect safety, wall classification, bounded-fragment rules, fragment and manifest integrity, source binding, offline replay, preservation of existing probes, Outcome-B posture and public zero-`/go/*` invariants.

## Gates
Run:
- `npm run portal:contracts:test`
- `npm run ai-ops:validate:fixtures`
- contracts TypeScript check
- `npm run build`
- rendered-capture unit/replay tests
- one public anonymous Bybit rendered attempt
- preview simulation
- public production simulation
- focused Chromium desktop/mobile/keyboard QA
- working-tree and artifact audit

## Integration
After all gates pass:
- commit focused changes;
- push only the existing branch;
- create a Draft PR against `master` with `Closes #254`;
- inspect every GitHub Actions step;
- fix branch-local regressions;
- leave the PR Draft.

## Not authorized
- no merge;
- no deploy or Cloudflare production publication;
- no environment/secret changes;
- no `PUBLIC_CBW_CTA_MODE=production`;
- no `PUBLIC_MARKET_PROFILES` population;
- no real evidence approval;
- no `offers.bybit.evidence` activation;
- no other exchange capture;
- no owner-file mutation;
- no next task.

## Final report
Report branch/HEAD, commits, files, runner/contract design, exact live render outcome, requested/final URLs, redirect chain, timestamp, browser version, safety flags, committed fragments and digests, claim-result changes, packet digest, real draft/null posture, tests, build, Chromium, both public `/go/*` counts, Draft PR/CI state and remaining blockers.
