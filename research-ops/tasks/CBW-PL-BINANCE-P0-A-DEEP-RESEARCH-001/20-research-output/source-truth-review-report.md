# Binance × Poland — source-truth research report

Task: `CBW-PL-BINANCE-P0-A-DEEP-RESEARCH-001`  
Checked: 2026-08-08  
Factory: ResearchOps Subscription Factory v1.1

## Executive finding

The evidence is sufficient to establish three separate facts:

1. **Historical Polish identity:** Binance Poland sp. z o.o. entered Poland's former virtual-currency activity register on 29 September 2022.
2. **Current public reachability:** Binance still exposes Poland-facing public surfaces, including PLN P2P, a Santander Poland payment-method page and Polish-language spot pages.
3. **Current legal/account availability is not positively established:** Poland's MiCA transition ended on 1 July 2026. The old VASP registration was not a KNF licence, and this run could not independently bind a current Binance MiCA/CASP authorisation from a directly parsed ESMA authorised-CASP row.

Therefore the safe MarketProfile posture is **UNDER_REVIEW**, not `available`.

## Regulatory chronology

- In January 2023 UKNF said Binance Poland had been entered in the virtual-currency register on 2022-09-29, but also stressed that KNF did not license, register, supervise or approve crypto exchanges under that regime.
- On 23 June 2026 UKNF stated that Poland's MiCA Article 143(3) transition ends on 1 July 2026 and referenced wind-down expectations for unauthorised providers.
- MiCA Article 59 requires authorisation (or an applicable Article 60 status) to provide crypto-asset services in the Union.
- ESMA's interim MiCA register landing page was updated 16 July 2026. The authorised-CASP CSV could not be row-parsed through the available research tooling, so this package does not make a direct ESMA-row absence assertion for Binance.
- Reuters reported on 9 July that Binance remained in discussions with EU regulators after withdrawing its Greek application. Financial Times reported on 6 August that Binance had not received EU approval. These are corroborating secondary sources, not substitutes for the regulator register.

## Technical reachability and payment surfaces

Binance public pages expose USDT/PLN P2P and a Santander Poland payment-method surface. A Polish-language spot page is also reachable. These surfaces are recorded as technical/public reachability only. They must not be promoted into legal availability, onboarding success or product eligibility.

## KYC

Current Binance guidance says full account functionality is restricted until KYC is completed, and current P2P guidance says all P2P users must complete identity verification. These are platform-general rules. This research did not test account creation or Poland-specific approval.

## Product posture

- Account onboarding / ordinary crypto services: **UNDER_REVIEW**
- Spot public surface: **VISIBLE; ELIGIBILITY UNDER REVIEW**
- P2P public surface: **VISIBLE; ELIGIBILITY UNDER REVIEW**
- Derivatives / futures: **NOT VERIFIED FOR POLAND**
- Earn / staking: **NOT VERIFIED FOR POLAND**
- Referral / promo / bonus: **UNCONFIRMED FOR POLAND**

## Commercial separation

CryptoBonusWorld's owner-confirmed Binance referral link/code is a commercial-destination/code authority. It is not evidence that Binance, a product, or a campaign is legally or operationally available to a user in Poland. No country CTA, country availability badge, ranking uplift or bonus claim is authorised by this research record.

## Limitations

- The ESMA authorised-CASP CSV could not be parsed with the available research tooling; only the current register landing page was directly verified.
- No login, registration, account approval, KYC submission, payment or referral testing was performed.
- Poland-specific direct fiat deposit/withdraw documentation was not captured.
- Product-by-product Poland eligibility beyond visible public surfaces remains unverified.

## Recommendation

Capture this package as a research record and send it to independent Source Truth Review. Do **not** import it as an approved Poland MarketProfile yet. A future positive availability decision requires a directly bound current MiCA/CASP authorisation plus product/account evidence for the exact Binance × Poland pair.
