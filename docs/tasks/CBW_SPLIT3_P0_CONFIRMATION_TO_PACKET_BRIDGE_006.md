# CBW Split 3 — P0 Confirmation-to-Packet Bridge 006

Issue: #258  
Branch: `feat/cbw-split3-confirmation-to-packet-bridge-006`  
Base: `master` @ `8d1eb059f65fd629fc607428db28ff7d5305057b`

## Objective

Build the single fail-closed bridge from the trusted Bybit promo-code confirmation evaluator into the Bybit `OfferEvidencePacket` resolution and adapter path.

This task must not add a real confirmation, approve the packet, populate `PUBLIC_MARKET_PROFILES`, activate production CTA, deploy, or change affiliate destinations.

## Immutable real posture

At completion:

- `BYBIT_PROMO_CODE_CONFIRMATIONS` remains frozen and empty;
- production partner trust remains unconfigured;
- `CRYPTOBONUSW` remains unconfirmed;
- raw `bybit.promo_code` remains `requires_owner_partner_confirmation`;
- raw Bybit packet remains `draft`;
- `offers.bybit.evidence` remains `null`;
- preview homepage `/go/*` remains `0`;
- public production simulation `/go/*` remains `0`;
- `PUBLIC_MARKET_PROFILES` remains frozen and empty;
- `PUBLIC_CBW_CTA_MODE` remains untouched.

## Required architecture

### 1. Retire the weak generic confirmation source

Remove or reject the legacy generic `OwnerConfirmationArtifact` / `ownerConfirmations` packet path.

Preferred final state:

- no `OwnerConfirmationArtifact` type in the authorizing packet contract;
- no `ownerConfirmations` field in the real packet JSON;
- no `owner-confirmation:` source-reference grammar;
- no generic owner string can support any claim.

### 2. Raw packet stays raw

The committed Bybit packet is an immutable evidence record.

Do not rewrite its promo-code result based on confirmation state.

Create a non-mutating resolved model from:

- validated raw packet;
- complete confirmation set;
- explicit finite evaluation clock;
- code-owned production confirmation policy;
- canonical offer promo-code value.

### 3. Canonical resolver

Implement one resolver equivalent to:

```ts
resolveBybitOfferPacketClaims(
  rawPacket,
  confirmationSet,
  nowMs,
  offerPromoCode,
)
```

Return a structured result containing:

- raw packet identity and integrity references;
- confirmation evaluator state and confirmed value;
- one resolved entry for every code-owned claim;
- raw result;
- resolved result;
- resolution provenance;
- blocking/unresolved required claim IDs;
- deterministic resolution digest;
- explicit failure reason when invalid.

No mutation of packet, confirmations, offer record, or policy.

### 4. Promo-code-only derivation

Only `bybit.promo_code` may use the confirmation evaluator.

Rules:

- product evaluator `confirmed` + exact candidate value → resolved `supported`;
- `missing` → pending/unresolved;
- `pending_partner_confirmation` → pending/unresolved;
- `expired` → expired/unresolved;
- `revoked` → revoked/unresolved;
- `invalid` → invalid/fail-closed;
- `conflict` → conflict/fail-closed;
- confirmed different value → conflict/invalid;
- confirmation data cannot modify any other claim.

### 5. Exact value binding

Use one canonical source for the current value: the Bybit offer record.

Require:

- deterministic normalization using the confirmation contract;
- exact equality with evaluator-confirmed value;
- no substring or prefix matching;
- packet prose/labels cannot define the value;
- changing `offers.bybit.promoCode` changes the resolution digest and prevents stale confirmation reuse.

### 6. Resolved adapter only

The authorizing packet adapter must consume the resolved claim model.

No raw-packet-only adapter may remain as a public authorizing path.

Requirements:

- every code-owned required claim must resolve `supported`;
- promo support can come only from the canonical confirmation evaluator;
- non-promo claims remain governed by raw capture evidence;
- unresolved promo or any other required claim blocks adaptation;
- packet approval, freshness, source, identity and digest requirements remain independent.

### 7. Resolution integrity

Create a deterministic resolution digest covering at least:

- packet ID;
- packet capture-manifest digest;
- rendered-capture artifact digests where present;
- raw claim inventory/results/source refs;
- normalized offer promo code;
- confirmation-set artifact digests in deterministic order;
- evaluation timestamp;
- evaluator state/value/confirmation ID;
- resolved claim inventory/results/provenance;
- blocking claim IDs.

Exclude only the resolution digest itself.

Changing any covered field must change or invalidate the digest.

### 8. Synthetic proof only

Synthetic positive tests may inject a test-only confirmation policy and test artifacts.

No synthetic policy, trusted partner, receipt, resolved packet, or supported promo claim may enter product data.

Required synthetic proofs:

1. Exact test partner confirmation resolves only promo claim.
2. Real inaccessible claims remain unchanged and continue blocking adaptation.
3. Fully supported synthetic raw packet plus exact promo confirmation can adapt.
4. Production empty set remains non-authorizing.

## Mandatory test matrix

1. Legacy `ownerConfirmations` path removed or rejected.
2. Raw packet remains byte/structure-equivalent after resolution.
3. Confirmation artifacts remain unchanged after resolution.
4. Empty real set → promo pending/unresolved.
5. Owner-only set → pending/unresolved.
6. Exact synthetic partner confirmation → promo resolved supported.
7. Wrong confirmed value → no support.
8. Prefix/substring value → no support.
9. Conflict → no support.
10. Expired → no support.
11. Revoked → no support.
12. Invalid → fail closed.
13. Confirmation cannot change bonus headline.
14. Confirmation cannot change KYC.
15. Confirmation cannot change deposit.
16. Confirmation cannot change availability/restrictions.
17. Confirmation cannot change reward type/terms.
18. Offer promo code is canonical bridge candidate.
19. Changing offer promo code invalidates prior resolution.
20. Claim inventory exactly matches code-owned policy.
21. Missing claim fails closed.
22. Duplicate claim fails closed.
23. Resolution digest recomputes.
24. Packet tampering changes/fails digest.
25. Confirmation-set tampering changes/fails digest.
26. Evaluation-clock change changes digest.
27. Resolved-result tampering fails digest.
28. Adapter rejects unresolved promo.
29. Adapter rejects another unresolved required claim.
30. Synthetic complete positive path adapts only in tests.
31. Real confirmation set frozen empty.
32. Real raw promo claim unchanged.
33. Real packet draft.
34. `offers.bybit.evidence` null.
35. Preview `/go/*` zero.
36. Production simulation `/go/*` zero.
37. `PUBLIC_MARKET_PROFILES` frozen empty.
38. Locale cannot change resolved facts.
39. No synthetic product data.

## Gates

Run:

- `npm run portal:contracts:test`
- `npm run ai-ops:validate:fixtures`
- scoped strict TypeScript check
- `npm run build`
- bridge/resolved-packet tests
- preview simulation
- public production simulation
- focused homepage Chromium desktop/mobile/keyboard
- working-tree and artifact audit

## Integration

After all gates pass:

1. Commit focused changes.
2. Push only the current feature branch.
3. Open a Draft PR against `master`.
4. Include `Closes #258`.
5. Inspect every GitHub Actions step.
6. Leave the PR Draft.

## Prohibitions

- no merge;
- no deploy;
- no environment/secret change;
- no production CTA activation;
- no MarketProfile population;
- no real confirmation or trusted partner configuration;
- no packet approval;
- no change to real promo claim or offer evidence;
- no other exchange work;
- no owner-file mutation;
- no next task.

## Final report

Return:

- branch and HEAD;
- commits;
- exact changed files;
- legacy confirmation-path removal result;
- raw/resolved model design;
- promo confirmation bridge states;
- exact value-binding results;
- resolution digest subject and tamper results;
- adapter positive/negative results;
- confirmation no real data changed;
- final contract-test total;
- fixtures/typecheck/build;
- Chromium result;
- preview and production-simulation `/go/*` counts;
- Draft PR number/state;
- GitHub Actions step outcomes;
- confirmation no merge/deploy/environment change;
- remaining blockers.
