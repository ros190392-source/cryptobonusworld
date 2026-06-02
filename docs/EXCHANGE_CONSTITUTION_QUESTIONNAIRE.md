# Exchange Constitution Questionnaire v1.0
## CryptoBonusWorld Editorial Verification Template

Use this questionnaire when performing a full constitution review for any exchange.  
Complete one questionnaire per exchange. Mark uncertain fields clearly.  
This document feeds directly into `src/data/exchange-constitution.ts`.

**Reviewer:** _______________  
**Exchange:** _______________  
**Date:** _______________  
**Review type:** ☐ Initial  ☐ Periodic  ☐ Triggered by change

---

## A. IDENTITY

**A1.** Official legal entity name(s):  
`_______________`

**A2.** Jurisdiction of incorporation (primary):  
`_______________`

**A3.** Headquarters location (operational):  
`_______________`

**A4.** Official domain(s) — list all you can confirm:  
`_______________`

**A5.** Are there separate regional domains? (EU version, US version, etc.)  
☐ Yes → List: `_______________`  
☐ No  
☐ Uncertain

**A6.** App store links — confirm they are official and current:  
iOS: `_______________`  
Android: `_______________`

**A7.** Brand aliases / old names (e.g. "OKEx" → "OKX"):  
`_______________`

**A8.** Is an affiliate/referral program available?  
☐ Yes  ☐ No  ☐ Uncertain  
If yes, affiliate link format: `_______________`

---

## B. AVAILABILITY (per GEO — complete one block per relevant country/region)

**GEO:** _______________  
Source for availability check: `_______________`  
Date checked: `_______________`

**B1.** Can users from this country register?  
☐ Yes — confirmed  
☐ Yes — likely (community reports / no evidence of restriction)  
☐ Restricted — limited access  
☐ No — confirmed blocked  
☐ Unknown — needs investigation  

**B2.** How was this confirmed?  
☐ Official restricted countries page  
☐ Terms of Service country list  
☐ Manual test registration attempted  
☐ User community reports  
☐ News/trusted aggregator  
☐ Not confirmed — assumed  

Confidence score (0.0–1.0): `___`

**B3.** Is the exchange restricted by IP, citizenship, or residency — or all three?  
`_______________`

**B4.** Are there any pending regulatory changes that could affect availability?  
☐ Yes → Notes: `_______________`  
☐ No  
☐ Unknown

---

## C. KYC RULES (per GEO)

**GEO:** _______________

**C1.** KYC required for registration?  
☐ Not required (no-KYC access)  
☐ Basic KYC (email + phone)  
☐ Full KYC (ID + selfie)  
☐ Enhanced KYC (proof of address, source of funds)  
☐ Unknown  

**C2.** KYC required for bonus claim?  
☐ Yes  ☐ No  ☐ Unknown  

**C3.** KYC required for withdrawal?  
☐ Yes — at what threshold: `___`  
☐ No  
☐ Unknown  

**C4.** Are there KYC tiers with different limits?  
☐ Yes → describe: `_______________`  
☐ No  

**C5.** Source for KYC rules:  
`_______________`  
Date verified: `___`  
Confidence: `___`

---

## D. PRODUCTS (Global defaults — note GEO exceptions)

For each product: ✓ = available, ✗ = not available, ? = uncertain

| Product | Available | Confidence | GEO Exceptions | Source |
|---------|-----------|------------|----------------|--------|
| Spot trading | | | | |
| Perpetual futures | | | | |
| Quarterly futures | | | | |
| Margin trading | | | | |
| Options | | | | |
| Copy trading | | | | |
| P2P marketplace | | | | |
| Earn / flexible savings | | | | |
| Staking | | | | |
| Launchpool / IEO | | | | |
| Trading bots | | | | |
| Fiat deposit | | | | |
| Fiat withdrawal | | | | |
| Crypto card | | | | |
| NFT marketplace | | | | |
| Institutional products | | | | |

**D1.** Are there products restricted in EEA specifically?  
`_______________`

**D2.** Are there products restricted in any other GEOs we cover?  
`_______________`

---

## E. GEO PAYMENTS

Complete one block per relevant country.

**GEO:** _______________

**E1.** Primary payment method(s) for depositing fiat:  
`_______________`

**E2.** Local currency support (does the exchange display in local currency?):  
`_______________`

**E3.** P2P trading availability and supported fiat pairs:  
`_______________`

**E4.** Recommended deposit flow for this GEO (step-by-step, if known):  
`_______________`

**E5.** Any payment restrictions specific to this GEO?  
`_______________`

**E6.** Source for payment method info:  
`_______________`  
Date verified: `___`  
Confidence: `___`

---

## F. BONUSES & AFFILIATE

**F1.** Current welcome bonus amount (global):  
Amount: `___`  Currency: `___`  
Source: `_______________`  
Date verified: `___`  
Campaign active: ☐ Yes  ☐ No  

**F2.** Does bonus amount/availability differ by GEO?  
`_______________`

**F3.** KYC required for bonus?  
☐ Yes  ☐ No  ☐ Uncertain  

**F4.** Minimum deposit required for bonus?  
☐ Yes → amount: `___`  ☐ No  ☐ Uncertain  

**F5.** Bonus expiry period:  
`_______________`

**F6.** Official bonus terms URL:  
`_______________`

**F7.** Affiliate link currently active?  
☐ Yes — verified: `___`  
☐ No — needs update  
☐ Unknown  

**F8.** Affiliate commission structure (if known):  
`_______________`

**F9.** Any known affiliate link changes in the last 30 days?  
☐ Yes → Notes: `_______________`  
☐ No  

---

## G. UX / REGIONAL VERSIONS

**G1.** Does the exchange auto-redirect users to a regional version based on IP/location?  
☐ Yes → describe behavior: `_______________`  
☐ No  
☐ Unknown  

**G2.** Does the regional version require a separate account?  
☐ Yes  ☐ No  ☐ Unknown  

**G3.** Does the regional version have a different bonus or product scope?  
`_______________`

**G4.** What does the landing page look like for EEA users (manually check if possible)?  
`_______________`

**G5.** Is there a different CTA/registration flow recommended for any GEOs we cover?  
`_______________`

**G6.** Screenshots needed or outdated for any GEO?  
`_______________`

---

## H. EVIDENCE SOURCES

For each key claim, list the source:

| Claim | Source type | Source URL | Date verified | Confidence |
|-------|-------------|------------|---------------|------------|
| Exchange available in [GEO] | | | | |
| Bonus amount | | | | |
| KYC requirements | | | | |
| License details | | | | |
| P2P availability | | | | |
| Affiliate link active | | | | |

**H1.** Are there any conflicts between sources?  
☐ Yes → describe: `_______________`  
☐ No  

**H2.** Any fields that could not be verified from official sources?  
`_______________`

---

## I. LICENSES & REGULATORY

**I1.** Known active licenses/registrations:

| Regulator | Jurisdiction | License type | Status | Verified date | Source |
|-----------|-------------|--------------|--------|---------------|--------|
| | | | | | |
| | | | | | |

**I2.** Known pending applications:  
`_______________`

**I3.** Any known regulatory actions (fines, restrictions) in past 12 months?  
☐ Yes → Notes: `_______________`  
☐ No  
☐ Unknown  

**I4.** Is a regulatory disclaimer required for any GEO?  
`_______________`

---

## J. MANUAL REVIEW NOTES

**J1.** Overall constitution confidence score estimate (0.0–1.0):  
`___`

**J2.** Fields that require follow-up investigation:  
`_______________`

**J3.** Flags to add (anything the next reviewer should be aware of):  
`_______________`

**J4.** Any claims currently displayed on the site that may need correction?  
`_______________`

**J5.** Recommended next full review date:  
`_______________`

**J6.** Additional notes:  
`_______________`

---

## SIGN-OFF

**Reviewed by:** _______________  
**Review date:** _______________  
**Constitution updated in exchange-constitution.ts:** ☐ Yes  ☐ Partial  ☐ No  
**Flagged for editorial approval:** ☐ Yes  ☐ No  

---

*This questionnaire is part of the CryptoBonusWorld Exchange Constitution System.*  
*Source: `docs/EXCHANGE_CONSTITUTION_QUESTIONNAIRE.md`*  
*See also: `src/data/exchange-constitution.ts`, `src/utils/constitutionEngine.ts`*
