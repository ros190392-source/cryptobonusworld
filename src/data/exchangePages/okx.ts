/*
 * OKX — ExchangePromoPageConfig
 *
 * Data sources (all June 2026):
 *   src/data/exchanges.json           — slug, promoCode, affiliateUrl, fees, KYC
 *   src/data/exchange-intelligence/okx.json — FAQ, trust, identity, market data
 *   src/data/evidence/okx.json        — evidence screenshot paths, fact confidence
 *   src/data/affiliate-links.ts       — affiliate link structure
 *
 * Visual pack v2 (2026-06-26, owner-approved ChatGPT images):
 *   - heroBackgroundImg: okx-hero-custom-v2.png (2172×724)
 *   - articleImg:        okx-article-final-v2-1200x675.jpg
 *   - ogImage:           okx-og-final-v2-1200x630.jpg
 *   - card image:        okx-card-final-v2-1200x800.jpg
 *
 * Visual pack v1 rollback (2026-06-26):
 *   - heroBackgroundImg: okx-hero-custom-v1.png (2172×724)
 *   - articleImg:        okx-article-final-v1-1200x675.jpg
 *   - ogImage:           okx-og-final-v1-1200x630.jpg
 *   - card image:        okx-card-final-v1-1200x800.jpg
 *
 * Still needed before live route:
 *   - Offer entry in src/data/offers.ts (hardcoded values for now)
 *   - Owner content approval
 *   - src/pages/okx/index.astro (5-line wrapper)
 *
 * OKX affiliate code is IMMUTABLE — changes require ROLE 0 approval.
 * Do NOT change promoCode or affiliateUrl without owner sign-off.
 */

import type { ExchangePromoPageConfig } from './types';

export const okxConfig: ExchangePromoPageConfig = {

  // ── Identity ──────────────────────────────────────────────────────────────
  slug:          'okx',
  name:          'OKX',
  affiliateUrl:  '/go/okx/',
  officialDomain:'okx.com',
  supportUrl:    'https://www.okx.com/help',
  feeUrl:        'https://www.okx.com/fees',

  // ── Media ──────────────────────────────────────────────────────────────────
  wordmarkImg:           '/logos/okx-wordmark.png',
  articleImg:            '/media/exchanges/okx/final/okx-article-final-v2-1200x675.jpg',
  ogImage:               '/media/exchanges/okx/final/okx-og-final-v2-1200x630.jpg',
  heroBackgroundImg:     '/media/hero-backgrounds/okx-hero-custom-v2.png',
  heroBackgroundPosition:'center center',
  logoImg:               '/logos/okx.png',

  // ── Commercial ─────────────────────────────────────────────────────────────
  // Source: src/data/exchanges.json + affiliate-links.ts + exchange-intelligence/okx.json
  promoCode:      'CRYPTOBONUSW',
  bonusMax:       5000,
  currency:       'USDT',
  rewardsAreaName:'Rewards Center',
  realisticValue: 'Most new users completing KYC and a standard deposit unlock $30–$200 in vouchers; the maximum 5,000 USDT requires completing all volume milestones within the campaign window',
  lastChecked:    'June 2026',
  sourceUrl:      'https://www.okx.com/learn/okx-new-user-rewards',

  // ── Exchange facts ──────────────────────────────────────────────────────────
  founded:     2017,
  users:       '50M+',
  headquarters:'Seychelles',

  // ── Fees (source: exchanges.json + evidence/okx.json — confidence 0.8) ──────
  fees: {
    spot:    { maker: '0.08%', taker: '0.1%' },
    futures: { maker: '0.02%', taker: '0.05%' },
  },

  // ── KYC ──────────────────────────────────────────────────────────────────
  kycRequired: true,
  kycNote:     'Yes — required for bonuses and full withdrawal access',

  // ── Brand ──────────────────────────────────────────────────────────────────
  // OKX rebrand 2022: clean black/white aesthetic.
  // bgFrom/bgTo used as gradient-only fallback when hero image is not yet available.
  heroTokens: {
    bgFrom:    '#0a0a0a',
    bgTo:      '#1c1c28',
    accent:    '#e2e2e2',
    codeColor: '#4b5563',
  },
  heroPromoLabel: 'REFERRAL CODE',
  // OKX wordmark 320×96 (icon + text) — scale 1.0 fills 300×86 slot cleanly
  logoVisualScale: 1.0,

  // ── SEO meta ──────────────────────────────────────────────────────────────
  canonicalUrl:    'https://cryptobonusworld.com/okx/',
  pageTitle:       'OKX Referral Code 2026: Up to 5,000 USDT Welcome Bonus',
  pageDescription: 'Use OKX referral code CRYPTOBONUSW for the 2026 new user welcome bonus — up to 5,000 USDT. Verified June 2026. Step-by-step guide, fees, and KYC info.',
  ogTitle:         'OKX Referral Code 2026 — Up to 5,000 USDT Bonus',
  ogDescription:   'Verified OKX referral code CRYPTOBONUSW. New user welcome package up to 5,000 USDT. See real screenshots, fees, KYC requirements.',
  seoPhraseLabel:  'OKX referral code · OKX promo code · OKX bonus code 2026',

  // ── Intro paragraphs ──────────────────────────────────────────────────────
  introParagraphs: [
    'The OKX referral code <strong>CRYPTOBONUSW</strong> is the verified code for this CryptoBonusWorld page. When you register through the link on this page, the code is pre-filled in OKX\'s registration form — you do not need to copy and paste it manually. Using the referral code connects your new account to OKX\'s welcome reward program.',
    'OKX\'s welcome bonus is structured as a task-based package worth up to 5,000 USDT. The reward is not paid out as a single lump sum — it is distributed across a series of tasks including account registration, identity verification, a qualifying deposit, and futures trading volume milestones. Different tasks unlock different reward tiers.',
    'The rewards you receive are trading fee vouchers — they can be used to offset trading fees but are not directly withdrawable as cash. Only profits earned through trading activity using voucher credits may be withdrawn. Voucher tasks typically expire 30 days after account registration, so completing them promptly matters.',
    'The referral code must be applied at the time of registration. Once your OKX account is created, the code cannot be added or changed. If you register through our partner link, attribution is automatic — the referral code is embedded in the link URL.',
  ],

  // ── How to claim steps ────────────────────────────────────────────────────
  howToClaimSteps: [
    'Click the registration link on this page — the referral code <strong>CRYPTOBONUSW</strong> is embedded in the link and pre-filled in the OKX sign-up form.',
    'Create your OKX account using your email address or phone number and set a strong password.',
    'Complete OKX\'s identity verification (KYC): submit a government-issued ID and pass the liveness/selfie check. KYC is required to unlock bonus eligibility and withdrawal access.',
    'Make a qualifying deposit to activate deposit-tier bonus tasks. Minimum deposit requirements vary — check current terms on the OKX Rewards Center page after registering.',
    'Open the OKX <strong>Rewards Center</strong> inside your account, review your active bonus tasks, and complete them within the 30-day campaign window to claim each reward tier.',
  ],

  // ── Evidence screenshots ───────────────────────────────────────────────────
  // Source: public/screenshots/okx/ — captured June 2026 from official OKX website
  evidenceRegistration: {
    src:     '/screenshots/okx/registration/global-desktop-2026-06.webp',
    alt:     'OKX registration page showing referral code CRYPTOBONUSW pre-filled — desktop screenshot June 2026',
    width:   1440,
    height:  900,
    caption: 'OKX registration page (desktop) — referral code <strong>CRYPTOBONUSW</strong> visible in the sign-up flow. Screenshot captured June 2026 from the official OKX website.',
    wide:    true,
  },

  evidenceBonusPage: {
    src:     '/screenshots/okx/bonus_referral_landing/global-desktop-2026-06.webp',
    alt:     'OKX new user welcome bonus landing page showing up to 5,000 USDT welcome package — desktop screenshot June 2026',
    width:   1440,
    height:  900,
    caption: 'OKX welcome bonus landing page (desktop) — official OKX new user rewards page showing up to 5,000 USDT. Screenshot captured June 2026.',
    wide:    true,
  },

  evidenceFeeScreenshots: [
    {
      src:     '/screenshots/okx/fees/global-desktop-2026-06.webp',
      alt:     'OKX fee schedule page showing spot and futures trading fees — desktop screenshot June 2026',
      width:   1440,
      height:  900,
      caption: 'OKX fee schedule (desktop) — official OKX fee page showing standard spot and futures rates. Screenshot captured June 2026.',
      wide:    true,
    },
  ],

  // ── Bonus level rows ───────────────────────────────────────────────────────
  bonusLevelRows: [
    {
      task:        'Account registration',
      requirement: 'Sign up via referral link',
      rewardType:  'Welcome mystery box',
      notes:       '$60 USDT voucher (randomized); credited on registration',
    },
    {
      task:        'Identity verification (KYC)',
      requirement: 'Complete ID + liveness check (Intermediate tier)',
      rewardType:  'Voucher',
      notes:       'Required for all bonus eligibility and withdrawal access',
    },
    {
      task:        'First deposit',
      requirement: 'Deposit qualifying amount (minimum applies)',
      rewardType:  'Deposit bonus voucher',
      notes:       'Up to $500 USDT; minimum deposit and amount vary — check Rewards Center',
    },
    {
      task:        'Futures trading',
      requirement: 'Reach futures volume milestones within 30 days',
      rewardType:  'Trading fee vouchers',
      notes:       'Up to $4,440 USDT in futures rewards; high leverage carries risk',
    },
    {
      task:        'Rewards Center tasks',
      requirement: 'Complete additional tasks within the 30-day window',
      rewardType:  'Various vouchers',
      notes:       'Task types and amounts vary; log in to Rewards Center for your current list',
    },
  ],

  bonusExtraSections: [
    {
      h3:  'Realistic value for most users',
      text: 'The 5,000 USDT headline figure is the maximum across all tasks. For a user completing standard registration, KYC, and a moderate first deposit, a realistic reward range is <strong>$30–$200 in vouchers</strong>. Reaching the higher futures tiers requires meaningful trading volume and carries real liquidation risk. Only trade futures with capital you can afford to lose.',
    },
    {
      h3:  'Vouchers vs. withdrawable cash',
      text: 'OKX welcome bonus rewards are issued as trading fee vouchers, not as withdrawable USDT. Vouchers reduce your trading fees — they cannot be sent to an external wallet directly. Any profits you make through trading activity (using voucher-covered fee savings) are withdrawable as normal.',
    },
  ],

  // ── About paragraphs ──────────────────────────────────────────────────────
  aboutParagraphs: [
    'OKX was founded in 2017 as OKEx and rebranded to OKX in January 2022. Headquartered in the Seychelles and licensed under Dubai VARA and Bahamas SCB, OKX ranks among the top five global crypto exchanges by trust-adjusted trading volume. As of the last data pull in June 2026, OKX serves 50M+ registered users across 160+ countries with $1.72B in 24-hour spot volume.',
    'The platform offers spot trading (1,200+ pairs across 301 coins), USDT-margined perpetual futures with up to 100× leverage, P2P trading with 0% platform fee, copy trading, Earn products (Simple Earn, On-chain Earn, Structured Products, Jumpstart IEO), and an integrated Web3 wallet. OKX also publishes monthly Proof of Reserves with Merkle tree verification — individual users can verify their holdings are included.',
    'OKX\'s native token is OKB. Holding OKB provides tiered spot fee reductions and is used for staking, Earn products, and as the gas token for OKX Chain. Standard spot fees are 0.08% maker / 0.1% taker; VIP tiers and OKB holdings reduce these further.',
  ],

  // ── Support text ──────────────────────────────────────────────────────────
  supportText: `OKX's primary support is available through the in-app Help Center and at <a href="https://www.okx.com/help" target="_blank" rel="noopener noreferrer nofollow">okx.com/help</a>. Live chat support is available for verified account holders. For questions about bonus tasks or voucher credits, check the Rewards Center inside your OKX account first — most eligibility and task-status questions are addressed there.`,

  // ── Partner offer text ────────────────────────────────────────────────────
  partnerOfferText: `This CryptoBonusWorld page links to OKX through a partner referral program. When you register via the link on this page, your new OKX account is associated with the partner referral code <strong>CRYPTOBONUSW</strong>, which activates OKX's welcome reward package. We may earn a commission if you sign up through our link. Our editorial coverage of OKX — fees, KYC requirements, availability, and evidence screenshots — is independent of this partnership arrangement.`,

  // ── Search variations ─────────────────────────────────────────────────────
  searchVariations: [
    'OKX referral code',
    'OKX promo code',
    'OKX bonus code',
    'OKX invite code',
    'OKX welcome code',
    'OKX discount code',
    'OKX sign up code',
    'OKX new user code',
  ],

  // ── Fee table rows ────────────────────────────────────────────────────────
  feeTableRows: [
    {
      market:         'Spot',
      maker:          '0.08%',
      taker:          '0.1%',
      statusCellHtml: `<td style="color:#15803d;font-size:12px;font-weight:600;">Verified Jun 2026 · <a href="https://www.okx.com/fees" target="_blank" rel="noopener noreferrer nofollow" style="color:#15803d;">okx.com/fees</a></td>`,
    },
    {
      market:         'Perpetual &amp; Futures',
      maker:          '0.02%',
      taker:          '0.05%',
      statusCellHtml: `<td style="color:#15803d;font-size:12px;font-weight:600;">Verified Jun 2026 · <a href="https://www.okx.com/fees" target="_blank" rel="noopener noreferrer nofollow" style="color:#15803d;">okx.com/fees</a></td>`,
    },
  ],

  feeAfterNoteHtml: `<p style="font-size:13px;color:#6B7280;margin-top:14px;line-height:1.6;">Standard non-VIP rates shown. OKX offers tiered fee reductions with OKB token holdings. VIP tiers are available for high-volume traders. P2P trading: 0% platform fee (spread set by counterparty). Withdrawal fees are network-dependent and vary by asset and blockchain. Always verify current rates on the official <a href="https://www.okx.com/fees" target="_blank" rel="noopener noreferrer nofollow" style="color:#4b5563;">OKX fee page</a> before trading.</p>`,

  // ── KYC & Availability paragraphs ─────────────────────────────────────────
  kycAvailabilityParagraphs: [
    'OKX requires identity verification (KYC) to access full trading, withdraw funds, and qualify for welcome bonus tasks. Creating an account requires only email or phone registration (Basic tier). To unlock deposit withdrawals, higher trading limits, and bonus eligibility, you must complete OKX\'s Intermediate KYC tier: submit a government-issued ID (passport, national ID, or driver\'s licence) and pass a liveness check or selfie verification. This process typically completes in 2–30 minutes for automated approval, or up to 24 hours for manual review.',
    `OKX does not accept registrations from US residents. Residents of the United Kingdom, Canada, and certain other regions may also face service restrictions. The official list of restricted jurisdictions is maintained at <a href="https://www.okx.com/help/okx-services-not-available" target="_blank" rel="noopener noreferrer nofollow">okx.com/help/okx-services-not-available</a> — check this page before registering if you are unsure about your region. US users are advised to use a regulated domestic exchange such as Coinbase or Kraken.`,
    'Welcome bonus tasks on OKX are time-limited. After registering, bonus tasks are typically active for 30 days. Vouchers earned are trading fee credits — they reduce your trading fees but are not withdrawable as cash directly. Only profits from trading activity (using voucher-covered fee savings) are withdrawable as standard funds. Always review current bonus terms inside the OKX Rewards Center after creating your account, as conditions vary by region and may change between promotion periods.',
  ],

  // ── Verification section ───────────────────────────────────────────────────
  verificationIntroText: `The table below reflects what CryptoBonusWorld has verified about the OKX welcome bonus as of the last evidence review (June 2026). Evidence was collected from the official OKX website and official bonus landing page. <em>Verified</em> items are confirmed from OKX's public documentation. <em>Public Preview</em> items are visible to unregistered users but may change. <em>Check in Rewards Center</em> items require an OKX account to confirm and may vary by region.`,

  verificationEvidence: {
    src:     '/screenshots/okx/bonus/global-desktop-2026-06.webp',
    alt:     'OKX official new user bonus page showing welcome package — desktop screenshot June 2026',
    width:   1440,
    height:  900,
    caption: 'OKX official bonus page (desktop) — showing the new user welcome package. Screenshot captured June 2026.',
    wide:    true,
  },

  verificationRows: [
    {
      area:        'Referral code',
      requirement: 'Enter CRYPTOBONUSW at registration',
      rewardType:  'Activates welcome package',
      status:      'verified',
      statusNote:  'Code verified active June 2026 via official OKX affiliate program',
    },
    {
      area:        'Account registration',
      requirement: 'Sign up via referral link (new accounts only)',
      rewardType:  'Welcome mystery box',
      status:      'verified',
      statusNote:  '$60 USDT randomized voucher; confirmed on OKX bonus landing page',
    },
    {
      area:        'KYC identity verification',
      requirement: 'Government ID + liveness check (Intermediate tier)',
      rewardType:  'Unlocks bonus eligibility + withdrawals',
      status:      'verified',
      statusNote:  'Confirmed required per OKX KYC documentation',
    },
    {
      area:        'First deposit',
      requirement: 'Qualifying deposit amount (minimum applies)',
      rewardType:  'Deposit bonus voucher (up to $500 USDT)',
      status:      'public-preview',
      statusNote:  'Visible on OKX bonus page; minimum deposit and exact amount subject to current terms',
    },
    {
      area:        'Futures volume milestone',
      requirement: 'Reach specified futures trading volume within 30 days',
      rewardType:  'Trading vouchers (up to $4,440 USDT)',
      status:      'check-hub',
      statusNote:  'Milestones and amounts vary — log in to OKX Rewards Center to see your current tasks',
    },
    {
      area:        'Rewards Center tasks',
      requirement: 'Complete tasks within 30-day campaign window',
      rewardType:  'Various fee vouchers',
      status:      'check-hub',
      statusNote:  'Task types, amounts, and eligibility vary by region and account status',
    },
    {
      area:        'Voucher type',
      requirement: 'Complete task tier',
      rewardType:  'Trading fee credits (not withdrawable cash)',
      status:      'verified',
      statusNote:  'Confirmed per OKX bonus terms: vouchers offset trading fees; only trading profits are withdrawable',
    },
  ],

  verificationAfterNote: `OKX's welcome bonus is a task-based reward program. The 5,000 USDT headline figure is the combined maximum across all tasks — not a guaranteed payout for every user. Vouchers received are trading fee credits: they reduce your trading costs but cannot be withdrawn directly as cash. Only profits from trading activity using voucher savings are withdrawable as normal. Tasks typically expire 30 days after account creation. Always review current terms inside the OKX Rewards Center after registering, as conditions vary by region and can change between promotion periods.`,

  // ── FAQ items ──────────────────────────────────────────────────────────────
  // Source: exchange-intelligence/okx.json knowledgeBase.commonQuestions
  faqItems: [
    {
      question: 'What is the OKX referral code?',
      answer:   'The CryptoBonusWorld referral code for OKX is <strong>CRYPTOBONUSW</strong>. It is pre-filled automatically when you register via the link on this page. Using it activates the OKX new user welcome package of up to 5,000 USDT.',
    },
    {
      question: 'How much is the OKX welcome bonus?',
      answer:   'The OKX welcome bonus via CRYPTOBONUSW is up to 5,000 USDT. This is a task-based reward: completing KYC, a qualifying deposit, and reaching trading volume milestones unlocks different tiers. Bonus vouchers are trading fee credits — not withdrawable cash. Most users completing a standard deposit earn $30–$200 in the first week; the full maximum requires completing all volume milestones within the 30-day window.',
    },
    {
      question: 'How do I claim the OKX bonus?',
      answer:   'Step 1: Click the registration link on this page — the referral code CRYPTOBONUSW is pre-filled. Step 2: Complete email or phone verification. Step 3: Complete KYC (government ID + liveness check — required for bonus eligibility). Step 4: Make a qualifying deposit. Step 5: Open the Rewards Center in your OKX account and complete active bonus tasks within 30 days.',
    },
    {
      question: 'What are OKX spot trading fees?',
      answer:   'OKX spot trading fees are 0.08% maker / 0.1% taker (standard tier). OKX offers tiered fee reductions with OKB token holdings. VIP tiers can reduce fees further for high-volume traders. Check the official <a href="https://www.okx.com/fees" target="_blank" rel="noopener noreferrer nofollow">OKX fee page</a> for current rates.',
    },
    {
      question: 'What are OKX futures trading fees?',
      answer:   'OKX USDT-margined perpetual futures: 0.02% maker / 0.05% taker. Maximum leverage: 100×. Futures trading carries substantial risk of capital loss from liquidation. High leverage is suitable only for experienced traders with strict risk management.',
    },
    {
      question: 'Does OKX require KYC?',
      answer:   'Yes. OKX requires identity verification to unlock full withdrawal access and welcome bonus eligibility. The process requires a government-issued ID and a liveness/selfie check (Intermediate KYC tier). Typically completes in 2–30 minutes for automated approval; up to 24 hours for manual review.',
    },
    {
      question: 'Is OKX available in the United States?',
      answer:   'No. OKX restricts US residents from registering on the platform. US users should use a regulated domestic alternative such as Coinbase or Kraken.',
    },
    {
      question: 'Does OKX have Proof of Reserves?',
      answer:   'Yes. OKX publishes monthly Proof of Reserves with Merkle tree verification. Individual users can verify that their holdings are included in the published reserve data. See <a href="https://www.okx.com/proof-of-reserves" target="_blank" rel="noopener noreferrer nofollow">okx.com/proof-of-reserves</a> for the latest report.',
    },
  ],

  // ── Related exchanges ──────────────────────────────────────────────────────
  relatedExchanges: [
    {
      slug:    'bybit',
      name:    'Bybit',
      logo:    '/logos/bybit.png',
      bonus:   'Up to 30,000 USDT Welcome Package',
      tag:     'Code: CRYPTOBONUSW',
      tileBg:  '#f7a600',
      pageUrl: '/bybit/',
    },
    {
      slug:    'mexc',
      name:    'MEXC',
      logo:    '/logos/mexc.png',
      bonus:   'Up to 10,000 USDT in New User Rewards',
      tag:     'No KYC required for base tier',
      tileBg:  '#0BCDFF',
      pageUrl: '/mexc/',
    },
  ],

};
