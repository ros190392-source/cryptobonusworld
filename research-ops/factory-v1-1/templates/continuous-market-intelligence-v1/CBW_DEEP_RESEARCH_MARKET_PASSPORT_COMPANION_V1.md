# CBW Deep Research Market Passport Companion V1

> Architecture standard mapping richer market-passport requirements into the **immutable Factory V1.1
> eleven-file package**. Non-production. **Owner Audit Correction 026:** corrected the handoff boundary
> — Deep Research emits an inline envelope only; a separate governed capture task writes the files.
> Public observed affiliate values are allowed as evidence. Back to
> [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).

## 1. Corrected handoff flow

```text
Deep Research reads the immutable generated prompt + this companion
  -> conducts research WITHOUT repository mutation
  -> emits one complete inline CBW_HANDOFF_ENVELOPE_V1 (all eleven files, exact bytes)
  -> an owner/governed capture task validates the envelope
  -> the capture task writes the exact eleven files into the existing 20-research-output/
  -> later source-truth review begins
```

Deep Research itself **MUST NOT** claim to write into the repository. Repository population is the
separate governed capture step (roadmap **Phase 2b**).

## 2. Envelope (`CBW_HANDOFF_ENVELOPE_V1`)

Per the handoff protocol, the envelope is a complete inline transfer object: for **all eleven** files
it carries the exact UTF-8/LF content, the SHA-256 of the file content, and the UTF-8 byte size, with
**no ellipsis, placeholder file content or omitted arrays**. A downloadable ZIP is optional and
non-canonical. All JSON must parse; all IDs unique; all cross-references resolve.

## 3. The immutable eleven-file inventory

1. `research-run.json` 2. `source-verification.json` 3. `claim-verdicts.json`
4. `conflict-resolution.json` 5. `product-availability.json` 6. `payment-rails.json`
7. `offer-eligibility-review.json` 8. `schema-normalization-notes.json` 9. `import-readiness.json`
10. `source-truth-review-report.md` 11. `MANIFEST.txt`

The generated `00-contract/DEEP_RESEARCH_PROMPT.md` and this inventory are unchanged.

## 4. Factory package-shape compatibility

The envelope's JSON files **MUST** keep the current Factory top-level shapes exactly:

| File | Required top-level |
| --- | --- |
| `research-run.json` | `overallFinding` object (with non-empty `recommendation`) |
| `source-verification.json` | `sources` array |
| `claim-verdicts.json` | `claims` array |
| `conflict-resolution.json` | `conflicts` array |
| `product-availability.json` | `products` array |
| `payment-rails.json` | `rails` array (each rail carries `sourceIds`) |
| `offer-eligibility-review.json` | `review` object with a `sourceIds` array |
| `schema-normalization-notes.json` | `notes` array |
| `import-readiness.json` | `readiness` object with at least one `*Ready` boolean |

Do **not** invent incompatible required top-level fields. Encode richer findings in permitted nested
properties, `notes`, the report and normalization notes. Any field not yet canonical is marked for
later normalization/import in `schema-normalization-notes.json`, not treated as deployed schema.

## 5. Requirement → file mapping

| Richer requirement | Encoded in |
| --- | --- |
| Global + country history | `research-run.json` findings, `claim-verdicts.json` dated claims |
| Regulatory claims | `claim-verdicts.json` + `source-verification.json` (families, snapshots) |
| KYC, products, payments, fees, limits, restrictions | `product-availability.json`, `payment-rails.json`, `claim-verdicts.json` |
| Public affiliate L1–L3 evidence | `offer-eligibility-review.json` (`review.sourceIds`, observed URL/code/offer, terms) |
| Search-intent findings + quick-answer candidates | `research-run.json` notes, `source-truth-review-report.md` |
| Source-monitor candidates + freshness recommendations | `source-verification.json`, `schema-normalization-notes.json` |
| Unresolved gaps, conflicts, limitations | `conflict-resolution.json`, report |
| Architecture import mapping | `import-readiness.json` (claim → canonical entity) |
| Integrity/manifest | `MANIFEST.txt` |

## 6. Public affiliate values are evidence (corrected)

`offer-eligibility-review.json` and `source-verification.json` **MAY** contain public source URLs,
public referral codes and accurately observed public offer/bonus figures, with classification
`PUBLIC_OBSERVED` and stated limitations. These are **not** secrets. Never include credentials, private
tokens, session cookies, private affiliate-dashboard data or personal account data.

## 7. Field discipline

Each material claim carries confidence, verification state, limitations (for `LOW`/`UNVERIFIED` or
`UNDER_REVIEW`/`UNSUPPORTED`), effective dates and a source-family reference consistent with
[the claim/evidence model](../../schemas/continuous-market-intelligence-v1/CBW_CLAIM_EVIDENCE_FRESHNESS_MODEL_V1.json).
Affiliate evidence uses the operational fields and statuses of
[the affiliate model](../../schemas/continuous-market-intelligence-v1/CBW_AFFILIATE_CAMPAIGN_OFFER_MODEL_V1.json).

## 8. Authorization floor and non-goals

All research-package authorization flags remain **false**. This companion authorizes no import,
publication, CTA, ranking, deploy or `master` action. It does not run Deep Research, does not populate
`20-research-output/`, and does not add, rename or remove any of the eleven files — publication is
gated by [the roadmap](./CBW_IMPLEMENTATION_ROADMAP_V1.md) and
[the autonomous update policy](./CBW_AUTONOMOUS_CONTENT_UPDATE_POLICY_V1.md).
