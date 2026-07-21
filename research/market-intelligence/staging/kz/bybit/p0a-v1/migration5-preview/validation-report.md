# CBW KZ × Bybit — MIGRATION_5 Non-Production Preview Validation Report

- Task `CBW-KZ-BYBIT-P0A-MIGRATION-5-PREVIEW-IMPLEMENTATION-011` · baseline HEAD `ec185cd7055b4ec26f5a8fcbba9ee1a040815c6e` · deterministic · non-production
- Owner decision: MIGRATION_5 APPROVED_WITH_LIMITS (preparation only; execution + production activation NOT authorized).

## Verdicts
- **INPUT_INTEGRITY**: PASS
- **FIELD_MAPPING_COMPLETENESS**: PASS
- **PRIMARY_AVAILABILITY_SEMANTICS**: PASS
- **PRODUCT_STATUS_PRESERVATION**: PASS
- **LIMITATION_DISCLOSURE**: PASS
- **CONFLICT_PRESERVATION**: PASS
- **BLOCKED_FIELD_ENFORCEMENT**: PASS
- **ADAPTER_NON_ACTIVATION**: PASS
- **NO_PRODUCTION_CHANGE**: PASS
- **PREVIEW_COMMIT_READINESS**: READY

## Preview outputs (deterministic; SHA-256)
- `research/market-intelligence/staging/kz/bybit/p0a-v1/migration5-preview/legacy-to-mi-field-map.json`: 28210 B · sha256 `da973a284872e5b70091a067c62b93a3e66477531141ad5f712c9ea535129ece`
- `research/market-intelligence/staging/kz/bybit/p0a-v1/migration5-preview/shadow-comparison.json`: 13705 B · sha256 `ee9a8b2a1c26542975927f02f3a35e8b2e469b54a5580ec2641b3e63b47a66f1`
- `research/market-intelligence/staging/kz/bybit/p0a-v1/migration5-preview/non-active-adapter.preview.json`: 15956 B · sha256 `b8d00e48b66be101332c3a037eb5bac505b8caa8307392ee8759227a2c64b1cf`
- `scripts/market-intelligence/build-kz-bybit-migration5-preview.mjs`: 42063 B · sha256 `529e40a811521866d8a21bcd7434be7d8673a45e7ee13b99a02cf7019d9cb0dc`
- `research/market-intelligence/staging/kz/bybit/p0a-v1/migration5-preview/validation-report.json`: 1560 B · sha256 `fdaeca9aef23c0fd25c44b48585437cd70138af116e9a480d2c6ada555bb1f68`

## Guarantees
- AVAILABLE_WITH_LIMITS projects as GREEN/Available + AMBER "Some limits apply" (not restricted).
- All 13 product statuses preserved exactly (spot/kzt_p2p AVAILABLE; bank_card_purchase CONFLICTING; referral UNKNOWN; rest AVAILABLE_WITH_LIMITS).
- cf-kz-bybit-001 + cf-kz-bybit-002 preserved PARTIALLY_RESOLVED (not resolved/flattened).
- Blocked: ranking · CTA · promo · affiliate route · referral code · bonus amount · publication · production integration · binding activation · legacy/production write.
- Binding WRITTEN_NON_ACTIVE (GEO_LEGACY, MIGRATION_4); Kazakhstan publication blocked; nothing runtime-consumed; nothing modified/committed/deployed.

