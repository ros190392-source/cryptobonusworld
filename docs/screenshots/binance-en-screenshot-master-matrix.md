# Binance EN/global — Screenshot Master Matrix

**Owner:** ROLE 38 (Multilingual Screenshot Factory Lead) + ROLE 0
**Standard:** `docs/MULTILINGUAL_SCREENSHOT_FACTORY_STANDARD.md`
**Machine source of truth:** `src/data/screenshot-factory/matrices/binance-en-global.json`
**Last updated:** 2026-06-08
**Scope:** Planning matrix for Binance EN/global reuse across Gold Page, SEO articles, comparison pages, and future GEO localization. **Does not** move files, change asset statuses, or publish.

> Status/claim authority remains the live registries (`jobs/`, `assets/`, `rejected/`, `claim-ledger/`). This matrix mirrors them and adds use-case grouping + capture planning.

## Legend
- **captureType:** public_auto · authenticated_assisted · owner_manual · diagram · forbidden
- **priority:** P0 · P1 · P2
- **currentStatus:** approved_live · approved_not_live · planned · needs_refresh · needs_manual_capture · forbidden · rejected_do_not_use
- **timing:** now · next_batch · owner_session · later · never
- **sensitiveDataRisk:** none · low · medium · high · forbidden

## A. Gold Page core (all approved & live)
| screenshotId | claim(s) | capture | pri | status | mask | fresh(d) |
|---|---|---|---|---|---|---|
| binance_bonus_referral_landing_en_global | binance_bonus_welcome_max | public_auto | P0 | approved_live | no | 14 |
| binance_registration_demo_state_en_global | binance_bonus_promo_code | public_auto | P1 | approved_live | no | 90 |
| binance_fees_en_global | binance_fees_spot | public_auto | P1 | approved_live | no | 30 |
| binance_proof_of_reserves_en_global | binance_proof_of_reserves_published | public_auto | P1 | approved_live | no | 30 |
| binance_spot_en_global | binance_products_ecosystem | public_auto | P1 | approved_live | no | 90 |
| binance_p2p_direction_usd_usdt_en_global | binance_p2p_interface | public_auto | P1 | approved_live | yes | 14 |

## B. P2P article
| screenshotId | claim(s) | capture | pri | status | notes |
|---|---|---|---|---|---|
| binance_p2p_direction_usd_usdt_en_global | binance_p2p_interface | public_auto | P1 | approved_live | reuse core asset |
| binance_p2p_offer_terms_example_en_global | binance_p2p_interface | public_auto | P2 | planned | offer_terms variant; mask merchants |
| binance_p2p_escrow_mechanics_diagram_en_global | binance_p2p_interface, binance_p2p_escrow | diagram | P2 | planned | original diagram; cautious escrow wording (claim active_review) |
| binance_p2p_…_rejected_cny | binance_p2p_interface | public_auto | — | rejected_do_not_use | old CNY capture; never reuse |

## C. Bonus / registration article
| screenshotId | claim(s) | capture | pri | status | sensitive |
|---|---|---|---|---|---|
| binance_registration_demo_state_en_global | binance_bonus_promo_code | public_auto | P1 | approved_live | low |
| binance_card_buy_methods_en_global | binance_products_ecosystem | public_auto | P2 | planned | low |
| binance_rewards_center_en_global | binance_bonus_requirements | authenticated_assisted | P2 | planned | medium (mask balances/UID) |
| binance_email_entered_state_en_global | binance_bonus_promo_code | owner_manual | P2 | planned | medium (masked email) |
| binance_email_verification_empty_or_masked_en_global | *(proposed)* binance_registration_flow_steps | owner_manual | P2 | planned | high (never show real code) |

## D. KYC / account limits article
| screenshotId | claim(s) | capture | pri | status | notes |
|---|---|---|---|---|---|
| binance_kyc_overview_clean_en_global | binance_kyc_required, binance_kyc_limits_region | authenticated_assisted | P1 | needs_manual_capture | tier badges only; mask all PII; prior loading-state rejected |
| binance_account_limits_en_global | binance_kyc_limits_region | authenticated_assisted | P2 | planned | mask balances/UID; limits vary by region |
| binance_kyc_…_rejected_loading | binance_kyc_required | authenticated_assisted | — | rejected_do_not_use | loading state; recapture clean |

## E. Fees / trading article
| screenshotId | claim(s) | capture | pri | status |
|---|---|---|---|---|
| binance_fees_en_global | binance_fees_spot | public_auto | P1 | approved_live |
| binance_spot_en_global | binance_products_ecosystem | public_auto | P1 | approved_live |
| binance_futures_fees_en_global | binance_fees_futures | public_auto | P2 | planned *(proposed job)* |

## F. Security / Proof of Reserves article
| screenshotId | claim(s) | capture | pri | status | notes |
|---|---|---|---|---|---|
| binance_proof_of_reserves_en_global | binance_proof_of_reserves_published | public_auto | P1 | approved_live | caption: PoR ≠ risk-free |
| binance_security_safu_en_global | binance_security_safu | public_auto | P2 | planned *(proposed)* | SAFU mainly source-backed (2019 historical); screenshot supporting only |

## G. Mobile app article
| screenshotId | claim(s) | capture | pri | status | notes |
|---|---|---|---|---|---|
| binance_mobile_app_clean_en_global | binance_products_ecosystem | public_auto | P1 | needs_manual_capture | prior error-state rejected; recapture clean |
| binance_mobile_app_…_rejected_error | binance_products_ecosystem | public_auto | — | rejected_do_not_use | 'An Error Occurred' state |

## H. Comparison / alternatives article
| item | claim(s) | status | notes |
|---|---|---|---|
| binance_comparison_reuse_set | fees_spot, products_ecosystem, proof_of_reserves_published, p2p_interface | approved_live (reuse) | **No new capture** — reuse approved Gold Page assets |

## I. Future GEO-localized
| screenshotId | claim(s) | capture | pri | status | notes |
|---|---|---|---|---|---|
| binance_p2p_direction_geo_localized | binance_p2p_interface, binance_p2p_availability_geo | public_auto | P2 | planned *(proposed)* | per-GEO P2P; mask merchants; no universal-availability claim |
| binance_bonus_landing_geo_localized | binance_bonus_welcome_max | public_auto | P2 | planned *(proposed)* | per-GEO bonus landing; immutable affiliate URL |

## Forbidden (never capture)
KYC documents · selfie/liveness · 2FA QR/secret · recovery codes · email/SMS verification codes · API keys · wallet balances · deposit addresses · withdrawal addresses · payment account numbers · live chat/private messages · unmasked UID.
Matrix IDs: `binance_withdrawal_addresses_en_global`, `binance_deposit_addresses_en_global`, `binance_wallet_balances_en_global`, `binance_api_keys_en_global`, `binance_2fa_secrets_en_global`, `binance_kyc_documents_en_global`, `binance_selfies_en_global`, `binance_payment_account_details_en_global`, `binance_chats_en_global`, `binance_verification_codes_en_global`.

## Recommended Batch 1 (safe public_auto only — no login)
1. `binance_mobile_app_clean_en_global` — recapture clean (prior error rejected) — P1
2. `binance_p2p_offer_terms_example_en_global` — offer-terms variant, mask merchants — P2
3. `binance_card_buy_methods_en_global` — public Buy Crypto methods — P2
4. `binance_futures_fees_en_global` — futures fee schedule *(new job)* — P2
5. `binance_security_safu_en_global` — public SAFU/security page *(new job, supporting)* — P2
6. (optional) public C2C/support hub screenshot to support the active_review fee/escrow claims.
All automatable via `scripts/capture-public-*.mjs`; report-only until ROLE 0 + ROLE 33 approve.

## Recommended owner-assisted batch (login required, masked)
1. `binance_kyc_overview_clean_en_global` — tier badges only (P1)
2. `binance_account_limits_en_global` — limit tiers, mask balances/UID (P2)
3. `binance_rewards_center_en_global` — task hub, mask balances/UID (P2)
4. `binance_email_entered_state_en_global` — masked email (P2)
5. `binance_email_verification_empty_or_masked_en_global` — empty/blurred code field only (P2)
All require ROLE 0 owner session + ROLE 33 ethics review; never capture forbidden surfaces above.
