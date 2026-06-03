# CryptoBonusWorld — Project Constitution
**Version:** 1.0
**Effective:** 2026-06-03
**Authority:** This document governs all content, affiliate, evidence, screenshot, SEO, and AI operations.

---

## 1. Project Mission

CryptoBonusWorld is a trustworthy, evidence-backed crypto exchange bonus aggregator. Our mission:

- Help crypto users find verified exchange bonuses with accurate, up-to-date information
- Provide real evidence for every claim (screenshots, live capture, official sources)
- Maintain editorial independence while operating a transparent affiliate model
- Be the most reliable source for exchange bonus verification in English and future languages

**Core principles:** Accuracy > Volume. Evidence > Claims. Transparency > Conversion.

---

## 2. Editorial Rules

### 2.1 Accuracy Standards
- Every bonus claim must be verified via live capture before publishing
- Every fee claim must link to an official exchange source
- Staleness threshold: 90 days — content older than 90 days must be re-verified
- No bonus amounts, fees, or limits may be published without an evidence timestamp

### 2.2 Tone and Voice
- Direct, factual, no marketing language
- No unsupported superlatives: "best", "lowest", "safest" require [verified] marker or evidence link
- Write for both humans and AI parsers (short paragraphs, structured tables, entity-rich headings)
- E-E-A-T: every exchange review must have a named reviewer, methodology link, and evidence panel

### 2.3 Section Requirements
Exchange reviews must follow the 14-section structure defined in `src/data/article-blueprints.ts`:
executive_summary → key_facts_table → bonus_verified_block → best_for → safety_regulation →
fees → kyc_limits → supported_countries → interface_walkthrough → pros_cons →
alternatives → methodology → faq → evidence_sources

### 2.4 FAQ Requirements
- Minimum 5 questions per exchange review
- Must cover: welcome bonus, KYC, fees, supported countries, safety
- FAQPage schema required

### 2.5 Prohibited Content
- No unverified bonus claims
- No claims of exchange safety without regulatory evidence
- No "guaranteed" language around bonus outcomes
- No content targeting restricted jurisdictions without regional caveats

---

## 3. Affiliate Rules

### 3.1 Disclosure
- Affiliate disclosure required on every page with affiliate links
- Placement: top of page AND before primary CTA (both)
- Disclosure text must be visible, not hidden in footer

### 3.2 Immutable Links
The following affiliate links are IMMUTABLE and may never be changed without explicit owner approval:
- **MEXC** affiliate link and promo code
- **Bybit** affiliate link and promo code

Any other affiliate link changes require: evidence that old link is broken OR explicit owner instruction.

### 3.3 Link Hygiene
- All affiliate links must be tested monthly (redirect chain verified)
- Broken affiliate links must be flagged within 24h of detection
- UTM parameters must not be stripped from tracked links

### 3.4 Conflict of Interest
- Ranking and recommendations must not be influenced by affiliate commission rates
- Higher commission ≠ higher rank. Evidence quality determines rank.

---

## 4. Evidence Rules

### 4.1 Verification Standards
Every claim about an exchange must be backed by at least one:
- Live capture screenshot with timestamp
- Official source URL with access date
- Regulatory database entry with reference number

### 4.2 Staleness
- Bonus amounts: re-verify every 30 days
- Fees: re-verify every 30 days
- Regulatory status: re-verify every 90 days
- Screenshot evidence: re-capture every 90 days

### 4.3 Evidence Storage
- Evidence stored in: `src/data/evidence/{exchange}.json`
- Snapshots stored in: `reports/evidence-snapshots/` (gitignored, generated at runtime)
- Evidence JSON is source of truth for build-time content

### 4.4 Approval Gate
- Detected bonus changes must enter `reports/bonus-update-proposals.json` with `status: pending_approval`
- No bonus amount update may be applied without human approval
- Approval via: `npm run bonus:approve` or `npm run bonus:approve:all`

---

## 5. Screenshot Rules

### 5.1 Safety Levels
| Level | Meaning | Can Capture Automatically |
|---|---|---|
| PUBLIC | Public page, no auth required | Yes |
| AFFILIATE_PUBLIC | Affiliate landing page | Yes |
| AUTH_SAFE | Authenticated but no sensitive data | Yes, with approved session |
| AUTH_SENSITIVE | Contains sensitive data | No — manual only |
| AUTHED | Requires auth, general | Yes, with approved session |
| SKIP | Never capture | Never |
| MANUAL | Human capture only | Never automated |

### 5.2 Never Capture
- Withdrawal pages or forms
- API key pages
- Security settings pages
- KYC document upload pages
- Wallet addresses or QR codes
- Account balances or transaction history
- Any page with personal identifying information

### 5.3 Approval Gate
- All screenshots require human approval before status changes to `available`
- Approval via: `npm run screenshots:approve`
- DO NOT approve screenshots automatically

### 5.4 Path Convention
`/screenshots/{exchange}/{category}/{region}-{device}-{YYYY-MM}.webp`

Example: `/screenshots/binance/registration/global-desktop-2026-06.webp`

---

## 6. SEO Rules

### 6.1 Title Standards
- Meta title: 50–60 characters, include exchange name + year
- H1: include exchange name + primary keyword
- H2/H3: entity-rich (include exchange name, not generic headings)

### 6.2 Schema Requirements
Exchange reviews require: Review + FAQPage + BreadcrumbList
Comparison pages require: Article + FAQPage
How-to guides require: HowTo + FAQPage

### 6.3 AI Search Optimization
- Direct answer in first paragraph (executive summary)
- All facts in structured tables for AI parsing
- Short paragraphs (max 3 sentences) for snippet extraction
- Schema values must match page content exactly (no schema/content mismatch)

### 6.4 Freshness Signals
- "Last verified: {date}" block required near top of all exchange reviews
- Evidence panel with capture dates required
- Structured data dateModified must be updated on every evidence update

---

## 7. Regional Rules

### 7.1 Multi-Region Architecture
Verification regions: GLOBAL (active) | PL | DE | RU | TR | IN | NG

Non-GLOBAL regions are disabled until proxy is configured via GitHub Actions secret.

### 7.2 Regional Caveats
- Any exchange with country restrictions must show regional availability section
- US/EU/UK status must be explicitly stated (available/restricted/unclear)
- Content must not mislead users in restricted jurisdictions

### 7.3 Proxy Configuration
Regional proxies configured via env vars: PROXY_{CODE}_URL
Never store proxy credentials in code or git. Use GitHub Actions secrets only.

---

## 8. Risk Rules

### 8.1 Required Disclaimers
Every exchange review must include:
- Affiliate disclosure
- Risk disclaimer (crypto trading involves risk of loss)
- Regional caveat (if exchange has country restrictions)

### 8.2 Prohibited Language
- "Guaranteed returns" or similar
- "Risk-free" trading claims
- Advice to invest specific amounts
- Predictions about price movements

### 8.3 Data Security
- Never commit passwords, API keys, or secrets to git
- Never commit `.auth/` session files
- Never capture screenshots containing wallet addresses, balances, or personal data
- Use GitHub Actions secrets for all credentials

---

## 9. AI Automation Rules

### 9.1 What AI Can Do Autonomously
- Run audit scripts and generate reports
- Detect bonus changes and create proposals
- Capture PUBLIC and AFFILIATE_PUBLIC screenshots
- Generate content briefs from blueprints
- Send Telegram monitoring reports
- Analyze SEO issues and create recommendations

### 9.2 What Requires Human Approval
- Applying bonus amount changes to evidence JSON
- Approving screenshots (changing status to `available`)
- Publishing or updating live exchange review content
- Changing affiliate links (except MEXC/Bybit which are always immutable)
- Any action affecting MEXC or Bybit affiliate configuration

### 9.3 Human-in-Loop Gates
1. **Bonus approval gate**: `reports/bonus-update-proposals.json` → human reviews → `bonus:approve`
2. **Screenshot approval gate**: capture → human reviews → `screenshots:approve`
3. **Content approval gate**: content brief generated → human writes/reviews → human publishes

### 9.4 Telegram Reporting
AI sends automated Telegram reports every 6h covering:
- Bonus verification status
- Affiliate link health
- Screenshot staleness
- Critical alerts (immediate, when detected)

---

## Appendix: Key File Locations

| System | File |
|---|---|
| Exchange evidence | src/data/evidence/{exchange}.json |
| Screenshot registry | src/data/screenshot-registry.ts |
| Article blueprints | src/data/article-blueprints.ts |
| Affiliate links | src/data/affiliate-links/ |
| Region config | src/data/verification-regions.ts |
| CI workflows | .github/workflows/ (on main branch) |
