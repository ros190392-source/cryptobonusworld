# CBW-SPLIT3-P0-POST-MERGE-TEST-AUTHORITY-SURFACE-REMOVAL-008

## Status
Prepared owner task. Not implemented. Not merged. Not deployed.

## Governing issue
GitHub Issue #262.

## Canonical base
- Repository: `ros190392-source/cryptobonusworld`
- Base branch: `master`
- Required base SHA: `063bce9e0d514bcfa7450e8fdc7248881a937d23`
- Feature branch: `fix/cbw-split3-test-authority-surface-008`

## Objective
Remove all synthetic/test-only authorization policies, resolvers and EvidenceMetadata adapters from production `src/**` exports. Preserve the synthetic positive proof entirely inside `scripts/portal/test-support/**`.

## Confirmed defect
Production source currently exports:
- `TEST_ONLY_PROMO_CODE_POLICY`;
- `resolveOfferPacketClaimsForTest`;
- `adaptOfferToEvidenceForTest`.

The last function can return `EvidenceMetadata` under a caller-supplied non-production policy. Therefore `adaptBybitOfferToEvidence` is not actually the sole EvidenceMetadata-producing production surface.

## Required final architecture
1. `src/data/contracts/claimConfirmation.ts` exports production policy/contracts only. No test partner identity/domain or `TEST_ONLY_*` export.
2. `src/data/contracts/offerPacketResolution.ts` exports no test resolver or test EvidenceMetadata adapter.
3. `adaptBybitOfferToEvidence(rawPacket, confirmationSet, nowMs)` is the only `src/**` export capable of returning `EvidenceMetadata`.
4. Synthetic policy creation, synthetic identities/receipts and synthetic positive adaptation live only under `scripts/portal/test-support/**`.
5. Test support must not be imported by any production file under `src/**`.
6. Repository guards fail closed on prohibited names/values in production paths.

## Mandatory tests
- production export namespace lacks `TEST_ONLY_PROMO_CODE_POLICY`;
- production export namespace lacks `resolveOfferPacketClaimsForTest`;
- production export namespace lacks `adaptOfferToEvidenceForTest`;
- AST/text export guard proves only `adaptBybitOfferToEvidence` can produce `EvidenceMetadata` under `src/**`;
- synthetic harness remains 5/5 or better;
- product adapter rejects the real empty confirmation set;
- production partner trust remains empty;
- raw packet remains draft;
- promo remains confirmation-required;
- `offers.bybit.evidence` remains null;
- both public `/go/*` counts remain zero;
- `PUBLIC_MARKET_PROFILES` remains frozen empty.

## CI
The final PR #261 Advisory Gate failure was infrastructure-level: its sole job was cancelled with no steps. Do not weaken or edit the advisory workflow to conceal this. Obtain fresh workflow results on the new Draft PR.

## Prohibited
- no real receipt/trust configuration;
- no evidence or packet approval;
- no claim updates;
- no MarketProfile work;
- no deploy, Cloudflare, env, secret or affiliate changes;
- no other exchange work;
- no owner-authored file mutation/deletion.

## Integration
Run all gates, create a Draft PR with `Closes #262`, inspect every CI step, leave Draft, and stop for owner review.