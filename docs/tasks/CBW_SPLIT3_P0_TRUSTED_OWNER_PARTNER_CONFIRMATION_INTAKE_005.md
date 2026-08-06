# CBW Split 3 (P0) — Trusted Owner/Partner Confirmation Intake 005

Governing issue: #256

Canonical base: `master` @ `ebf9755c2a3be22e4fb8770510e252b27943a3da`

Target branch: `feat/cbw-split3-trusted-confirmation-intake-005`

## Objective

Replace the weak generic `OwnerConfirmationArtifact` with a claim-bound, value-bound, time-bound, conflict-aware and revocable confirmation intake for partner-only offer facts.

This task builds the intake contract and offline workflow only. It does **not** confirm the real Bybit referral code, approve the Bybit packet, populate MarketProfiles, enable `/go/*`, deploy, or change environments.

## Immutable real-data posture

At task completion:

- `bybit.promo_code` remains `requires_owner_partner_confirmation`;
- the existing candidate value `CRYPTOBONUSW` remains unconfirmed;
- no real confirmation artifact is added without a separately supplied factual owner/partner receipt;
- the Bybit packet remains `draft`;
- `offers.bybit.evidence` remains `null`;
- `PUBLIC_MARKET_PROFILES` remains frozen and empty;
- preview and public production simulation remain zero `/go/*`.

## Required implementation

### 1. ClaimConfirmationArtifact

Introduce a canonical contract with at least:

- `confirmationId`;
- `exchangeId`;
- `claimId`;
- code-owned `assertionType`;
- normalized `assertedValue`;
- recomputable `assertedValueDigest`;
- `confirmedBy`;
- `confirmationRole`;
- strict `confirmedAt`;
- strict `validUntil`;
- typed source kind;
- source URL/reference and immutable source identifier where applicable;
- normalized source-statement digest;
- lifecycle status;
- optional replacement/revocation references;
- limitations and bounded safe notes;
- recomputable artifact digest.

Do not trust packet-declared policy or quorum.

### 2. Code-owned Bybit promo-code policy

Create an immutable policy for:

- exchange: `bybit`;
- claim: `bybit.promo_code`;
- assertion: exact active referral-code assignment;
- normalized value: uppercase canonical referral code;
- candidate currently displayed by CBW: `CRYPTOBONUSW`, explicitly unconfirmed;
- trusted identities, source kinds, validity limits and quorum rules.

Owner-only attestation must remain pending when the policy requires admissible partner proof.

### 3. Value binding

Digest subject must include:

- exchangeId;
- claimId;
- assertionType;
- normalized asserted value.

Changing the offer value, claim, exchange or assertion type must invalidate the confirmation.

### 4. Source binding

Support only code-owned source types, such as:

- GitHub issue comment;
- GitHub PR review;
- GitHub review comment;
- redacted partner dashboard receipt;
- redacted partner email receipt.

GitHub references must point to `ros190392-source/cryptobonusworld`, contain immutable IDs and bind the normalized statement to the exact claim/value.

Partner receipts must be concise and redacted. No full email/dashboard dumps, secrets, credentials, tokens, cookies or personal data.

CI remains fully offline.

### 5. Lifecycle and conflict evaluation

Require:

- exact timestamps;
- `validUntil > confirmedAt`;
- confirmation not before source event;
- confirmation not in the future relative to explicit evaluation clock;
- expired/revoked/rejected/draft/validated artifacts cannot support;
- replacement/revocation references resolve;
- replacement graph is acyclic;
- duplicate artifacts fail closed;
- conflicting active values return conflict.

### 6. Canonical evaluator

Implement one evaluator returning a structured state equivalent to:

- `confirmed`;
- `pending_partner_confirmation`;
- `missing`;
- `invalid`;
- `expired`;
- `revoked`;
- `conflict`.

A synthetic exact trusted partner confirmation may prove the positive path. No real positive artifact is authorized.

### 7. Manual draft-template command

Provide an offline-safe command such as:

```bash
npm run evidence:confirmation:bybit:promo-code -- --candidate CRYPTOBONUSW
```

Default output must be a non-authorizing draft template written only to a transient/gitignored location.

The command must not:

- authenticate to GitHub, Bybit or email;
- read secrets;
- scrape private accounts;
- set status to confirmed;
- modify the real packet;
- add approver metadata.

Invalid output must exit non-zero and must not be suggested for commit.

## Mandatory tests

Cover every matrix item in Issue #256, including:

- exact draft structural validation;
- owner-only pending state;
- synthetic trusted partner positive path;
- generic statement rejection;
- wrong exchange/claim/value rejection;
- deterministic normalization;
- unsafe value rejection;
- digest recomputation/tampering;
- source-policy and immutable-ID checks;
- untrusted actor rejection;
- source-statement digest mismatch;
- time-window rules;
- lifecycle state denial;
- exact claim/value-only support;
- conflicts, duplicates, unknown replacements and cycles;
- recursive artifact safety;
- full email/dashboard dump rejection;
- manual command draft-only behavior;
- unchanged real Bybit posture;
- zero public `/go/*` in both modes;
- frozen empty public MarketProfile registry;
- locale-invariant facts.

## Required gates

Run and report:

```bash
npm run portal:contracts:test
npm run ai-ops:validate:fixtures
# scoped strict TypeScript check
npm run build
# manual template command dry run
```

Also run:

- confirmation-focused offline tests;
- preview simulation;
- public production simulation;
- focused homepage Chromium desktop/mobile/keyboard QA;
- working-tree and artifact audit.

## Integration

After all gates pass:

1. Commit focused changes.
2. Push only the existing feature branch.
3. Open a Draft PR against `master` with `Closes #256`.
4. Inspect every GitHub Actions step.
5. Fix branch-local regressions.
6. Leave the PR Draft.

## Prohibitions

- no merge without later owner review;
- no deploy or Cloudflare publication;
- no environment/secret changes;
- no production CTA mode;
- no public MarketProfile population;
- no real confirmation fabrication;
- no real packet approval;
- no change to Bybit claim result or offer evidence;
- no capture for another exchange;
- no owner-authored file deletion/commit;
- do not begin the next task.

## Final report

Return:

- branch and HEAD;
- commits and exact changed files;
- confirmation contract and code-owned policy;
- value/source digest subjects;
- lifecycle/conflict evaluator results;
- synthetic positive proof;
- manual command behavior;
- explicit statement that no real confirmation was added;
- real Bybit posture;
- final test total and all gates;
- Chromium results;
- both public `/go/*` counts;
- Draft PR and CI status;
- confirmation of no merge/deploy/environment change;
- remaining blockers.
