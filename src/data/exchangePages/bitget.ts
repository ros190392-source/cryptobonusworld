/*
 * Bitget — ExchangePromoPageConfig
 *
 * Data sources (all June 2026):
 *   src/data/exchanges.json                   — slug, affiliateUrl, affiliateLinks
 *   src/data/exchange-intelligence/bitget.json — FAQ, trust, identity, market data
 *   src/data/evidence/bitget.json             — evidence screenshot paths, fact confidence
 *   src/data/affiliate-links.ts               — canonical affiliate link structure
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * AFFILIATE CODE IS IMMUTABLE — changes require ROLE 0 explicit approval.
 *   affiliateUrl : /go/bitget/  (resolves via exchanges.json → partner.bitget.com/bg/CryptoBonW)
 *   promoCode    : CryptoBonW
 *   externalUrl  : https://partner.bitget.com/bg/CryptoBonW
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Visual pack status — V2 OWNER-APPROVED (2026-06-29):
 *   wordmarkImg       : ✅ bitget-wordmark-official-v1.png (600×195 official SVG→PNG, #03aac1 on transparent)
 *                         Source: upload.wikimedia.org/wikipedia/commons/7/79/Logo_Biget.svg
 *   heroBackgroundImg : ✅ bitget-hero-custom-v1.png (2172×724 ChatGPT-generated, clean dark space bg)
 *   articleImg        : ✅ bitget-article-final-v1-1200x675.jpg (ChatGPT-generated, owner-approved)
 *   ogImage           : ✅ bitget-og-final-v1-1200x630.jpg (ChatGPT-generated, owner-approved)
 *   cardImg           : ✅ bitget-card-final-v1-1200x800.jpg (CLICK TO CLAIM pill, §20 compliant)
 *   Old canvas wordmark (bitget-wordmark.png 320×96) superseded — do not use
 *
 * Evidence screenshot gaps:
 *   Slot A (mobile signup / code-applied proof) : PENDING — no mobile screenshot
 *   Slot B (desktop bonus proof)                : ✅ bonus_referral_landing (desktop)
 *   Slot C (fees)                               : ✅ fees (desktop)
 *   verificationEvidence                        : uses older registration capture
 *
 * HQ data conflict: exchange-intelligence says Seychelles, evidence.json says Singapore.
 * Using Seychelles (intelligence file is more authoritative; Bitget Limited is Seychelles-registered).
 *
 * LIVE — src/pages/bitget/index.astro published 2026-06-29 (owner-approved).
 */

import type { ExchangePromoPageConfig } from './types';

export const bitgetConfig: ExchangePromoPageConfig = {

  // ── Identity ──────────────────────────────────────────────────────────────
  slug:          'bitget',
  name:          'Bitget',
  affiliateUrl:  '/go/bitget/',
  officialDomain:'bitget.com',
  supportUrl:    'https://www.bitget.com/support',
  feeUrl:        'https://www.bitget.com/fee',

  // ── Media (Visual Pack V1 — generated 2026-06-28) ──────────────────────────
  wordmarkImg:       '/logos/bitget-wordmark-official-v1.png',
  heroBackgroundImg: '/media/hero-backgrounds/bitget-hero-custom-v1.png',
  // ≤640px focal: teal planet upper-right + ring sweep fill the frame
  // (desktop keeps the default left-anchored crop — unchanged)
  heroBackgroundPositionMobile: '100% center',
  articleImg:        '/media/exchanges/bitget/final/bitget-article-final-v1-1200x675.jpg',
  ogImage:           '/media/exchanges/bitget/final/bitget-og-final-v1-1200x630.jpg',
  logoImg:           '/logos/bitget.png',
  logoVisualScale:   0.7,

  // ── Commercial ─────────────────────────────────────────────────────────────
  // Source: exchange-intelligence/bitget.json + exchanges.json + evidence/bitget.json
  // Bonus verified live 2026-06-11 (evidence.json confidence 0.9).
  promoCode:      'CryptoBonW',
  bonusMax:       6200,
  currency:       'USDT',
  rewardsAreaName:'Reward Center',
  realisticValue: 'Most new users completing KYC and a standard deposit earn a meaningful first-week reward; the maximum 6,200 USDT requires completing all deposit and futures trading milestones within the campaign window',
  lastChecked:    'June 2026',
  sourceUrl:      'https://www.bitget.com/en/activity/newcomer-rewards',

  // ── Exchange facts ──────────────────────────────────────────────────────────
  // Source: exchange-intelligence/bitget.json (lastUpdated 2026-06-08)
  founded:     2018,
  users:       '100M+',
  headquarters:'Seychelles',

  // ── Fees (source: evidence/bitget.json + exchange-intelligence — confidence 0.76) ──
  fees: {
    spot:    { maker: '0.1%', taker: '0.1%' },
    futures: { maker: '0.02%', taker: '0.06%' },
  },

  // ── KYC ──────────────────────────────────────────────────────────────────
  kycRequired: true,
  kycNote:     'Yes — required for withdrawals and welcome bonus eligibility',

  // ── Brand ──────────────────────────────────────────────────────────────────
  // Bitget brand: navy + teal. bgFrom/bgTo = dark navy for CSS gradient fallback.
  // Gradient hero also reduces the contrast issue with the dark wordmark icon.
  heroTokens: {
    bgFrom:    '#020e1c',
    bgTo:      '#0a1e38',
    accent:    '#00C9E0',
    codeColor: '#4b5563',
  },
  heroPromoLabel: 'REFERRAL CODE',

  // ── SEO meta ──────────────────────────────────────────────────────────────
  canonicalUrl:    'https://cryptobonusworld.com/bitget/',
  pageTitle:       'Bitget Referral Code 2026: Up to 6,200 USDT Welcome Bonus',
  pageDescription: 'Use Bitget referral code CryptoBonW for the 2026 welcome package — up to 6,200 USDT. Verified June 2026. Step-by-step guide, fees, KYC info, and copy trading overview.',
  ogTitle:         'Bitget Referral Code 2026 — Up to 6,200 USDT Bonus',
  ogDescription:   'Verified Bitget referral code CryptoBonW. New user welcome package up to 6,200 USDT. Real screenshots, fees, KYC requirements, and copy trading details.',
  seoPhraseLabel:  'Bitget referral code · Bitget promo code · Bitget bonus code 2026',

  // ── Intro paragraphs ──────────────────────────────────────────────────────
  introParagraphs: [
    'The Bitget referral code <strong>CryptoBonW</strong> is the verified code for this CryptoBonusWorld page. When you register through the link on this page, the code is pre-filled in Bitget\'s registration form — you do not need to copy and paste it manually. Using the referral code connects your new account to Bitget\'s welcome reward program.',
    'Bitget\'s welcome bonus is structured as a task-based package worth up to 6,200 USDT. The reward is not paid out as a single lump sum — it is distributed across a series of tasks including account registration, identity verification, a qualifying deposit, and trading volume milestones. Different tasks unlock different reward tiers.',
    'The rewards you receive are trading fee vouchers — they can be used to offset trading fees but are not directly withdrawable as cash. Only profits earned through trading activity using voucher credits may be withdrawn. Voucher tasks typically expire 30 days after account registration, so completing them promptly matters.',
    'Bitget is particularly well-known for its copy trading platform — one of the most developed in the crypto industry, with over 100,000 signal traders. New users interested in copy trading receive additional rewards and can allocate funds to mirror professional traders automatically.',
    'The referral code must be applied at the time of registration. Once your Bitget account is created, the code cannot be added or changed. If you register through our partner link, attribution is automatic — the referral code is embedded in the link URL.',
  ],

  // ── How to claim steps ────────────────────────────────────────────────────
  howToClaimSteps: [
    'Click the registration link on this page — the referral code <strong>CryptoBonW</strong> is embedded in the link and pre-filled in the Bitget sign-up form.',
    'Create your Bitget account using your email address or phone number and set a strong password.',
    'Complete Bitget\'s identity verification (KYC): submit a government-issued ID and pass the liveness/selfie check. KYC is required to unlock bonus eligibility and withdrawal access.',
    'Make a qualifying deposit to activate deposit-tier bonus tasks. Minimum deposit requirements vary — check current terms on the Bitget Reward Center page after registering.',
    'Open the Bitget <strong>Reward Center</strong> inside your account, review your active bonus tasks, and complete them within the 30-day campaign window to claim each reward tier.',
  ],

  // ── Evidence screenshots ───────────────────────────────────────────────────
  // Slot B — affiliate partner landing page showing 6,200 USDT bonus + CryptoBonW pre-filled.
  // Slot A (mobile signup with code field highlighted) is PENDING — no mobile screenshot.
  // NOTE: Registration capture (SHA256 74e4f7ca...) and bonus_referral_landing
  // (SHA256 cf258981...) are different hashes — older vs. live capture of the same page.
  evidenceRegistration: {
    src:     '/screenshots/bitget/bonus_referral_landing/global-desktop-2026-06.webp',
    alt:     'Bitget affiliate partner landing page showing 6,200 USDT welcome bonus with CryptoBonW referral code pre-filled — desktop screenshot June 2026',
    width:   1440,
    height:  900,
    caption: 'Bitget partner landing page (desktop) — captured via our affiliate link, showing the Bitget × CryptoBonusWorld referral entry point with "Claim Your Welcome Bonus of 6,200 USDT" and referral code CryptoBonW pre-filled. Screenshot captured June 2026 from the official Bitget partner portal.',
    wide:    true,
  },

  evidenceFeeScreenshots: [
    {
      src:     '/screenshots/bitget/fees/global-desktop-2026-06.webp',
      alt:     'Bitget fee schedule page showing VIP0 spot and futures trading fees — desktop screenshot June 2026',
      width:   1440,
      height:  900,
      caption: 'Bitget fee schedule (desktop) — official Bitget fee page showing VIP0 standard rates: spot 0.1%/0.1% maker/taker. Screenshot captured June 2026.',
      wide:    true,
    },
  ],

  // ── Bonus level rows ───────────────────────────────────────────────────────
  bonusLevelRows: [
    {
      task:        'Account registration',
      requirement: 'Sign up via referral link',
      rewardType:  'Welcome mystery box',
      notes:       'Registration reward; credited on account creation via referral link',
    },
    {
      task:        'Identity verification (KYC)',
      requirement: 'Complete ID + liveness check',
      rewardType:  'Voucher',
      notes:       'Required for all bonus eligibility and withdrawal access',
    },
    {
      task:        'First deposit',
      requirement: 'Deposit qualifying amount (minimum applies)',
      rewardType:  'Deposit bonus voucher',
      notes:       'Minimum deposit and amount vary — check Reward Center after registering',
    },
    {
      task:        'Copy trading',
      requirement: 'Follow a signal trader and allocate funds',
      rewardType:  'Copy trading bonus',
      notes:       'Bitget copy trading platform: 100,000+ signal traders available',
    },
    {
      task:        'Futures trading',
      requirement: 'Reach futures volume milestones within 30 days',
      rewardType:  'Trading fee vouchers',
      notes:       'Up to 125× leverage available; high leverage carries substantial risk',
    },
    {
      task:        'Reward Center tasks',
      requirement: 'Complete additional tasks within the 30-day window',
      rewardType:  'Various vouchers',
      notes:       'Task types and amounts vary; log in to Reward Center for your current list',
    },
  ],

  bonusExtraSections: [
    {
      h3:  'Realistic value for most users',
      text: 'The 6,200 USDT headline figure is the maximum across all tasks. For a user completing standard registration, KYC, and a moderate first deposit, a meaningful reward is typically earned in the first week. Reaching the full amount requires completing all volume and trading milestones within the 30-day window. Futures bonus tiers require active trading and carry real liquidation risk.',
    },
    {
      h3:  'Vouchers vs. withdrawable cash',
      text: 'Bitget welcome bonus rewards are issued as trading fee vouchers, not as withdrawable USDT. Vouchers reduce your trading fees — they cannot be sent to an external wallet directly. Any profits you make through trading activity (using voucher-covered fee savings) are withdrawable as normal.',
    },
    {
      h3:  'Bitget copy trading',
      text: 'Bitget is recognised as an industry leader in copy trading, with over 100,000 signal traders. New users can allocate funds to automatically mirror the positions of experienced traders. Copy trading participants receive additional welcome rewards and can start with a small allocation to learn the platform.',
    },
  ],

  // ── About paragraphs ──────────────────────────────────────────────────────
  aboutParagraphs: [
    'Bitget was founded in 2018 and is headquartered in the Seychelles. The exchange has grown to serve 100M+ registered users across 150+ countries, with CEO Gracy Chen leading the company. Bitget ranks among the top five global crypto exchanges by CoinGecko trust-adjusted volume (trust score 10/10, rank #5 as of June 2026).',
    'The platform offers spot trading (850+ pairs across 560+ coins), USDT-margined perpetual futures with up to 125× leverage, and an industry-leading copy trading platform with 100,000+ signal traders. Bitget does not currently offer P2P trading. The native token BGB provides fee discounts, VIP tier benefits, and governance participation.',
    'Bitget holds an ASIC licence in Australia and publishes Proof of Reserves with Merkle tree verification. Standard spot fees are 0.1% maker / 0.1% taker (standard tier); VIP tiers and BGB holdings can reduce these further.',
  ],

  // ── Support text ──────────────────────────────────────────────────────────
  supportText: `Bitget's primary support is available at <a href="https://www.bitget.com/support" target="_blank" rel="noopener noreferrer nofollow">bitget.com/support</a> and through the in-app Help Center. For questions about bonus tasks or voucher credits, check the Reward Center inside your Bitget account first — most eligibility and task-status questions are addressed there. For KYC issues, Bitget support typically responds within 24 hours.`,

  // ── Partner offer text ────────────────────────────────────────────────────
  partnerOfferText: `This CryptoBonusWorld page links to Bitget through a partner referral program. When you register via the link on this page, your new Bitget account is associated with the partner referral code <strong>CryptoBonW</strong>, which activates Bitget's welcome reward package. We may earn a commission if you sign up through our link. Our editorial coverage of Bitget — fees, KYC requirements, availability, and evidence screenshots — is independent of this partnership arrangement.`,

  // ── Search variations ─────────────────────────────────────────────────────
  searchVariations: [
    'Bitget referral code',
    'Bitget promo code',
    'Bitget bonus code',
    'Bitget invite code',
    'Bitget welcome code',
    'Bitget discount code',
    'Bitget sign up code',
    'Bitget new user code',
  ],

  // ── Fee table rows ────────────────────────────────────────────────────────
  feeTableRows: [
    {
      market:         'Spot',
      maker:          '0.1%',
      taker:          '0.1%',
      statusCellHtml: `<td style="color:#15803d;font-size:12px;font-weight:600;">Verified Jun 2026 · <a href="https://www.bitget.com/fee" target="_blank" rel="noopener noreferrer nofollow" style="color:#15803d;">bitget.com/fee</a></td>`,
    },
    {
      market:         'Perpetual &amp; Futures',
      maker:          '0.02%',
      taker:          '0.06%',
      statusCellHtml: `<td style="color:#15803d;font-size:12px;font-weight:600;">Verified Jun 2026 · <a href="https://www.bitget.com/fee" target="_blank" rel="noopener noreferrer nofollow" style="color:#15803d;">bitget.com/fee</a></td>`,
    },
  ],

  feeAfterNoteHtml: `<p style="font-size:13px;color:#6B7280;margin-top:14px;line-height:1.6;">Standard VIP0 rates shown. Bitget offers tiered fee reductions with BGB token holdings. VIP tiers available for high-volume traders. P2P trading: not currently available on Bitget. Withdrawal fees are network-dependent and vary by asset and blockchain. Maximum leverage: 125×. Always verify current rates on the official <a href="https://www.bitget.com/fee" target="_blank" rel="noopener noreferrer nofollow" style="color:#4b5563;">Bitget fee page</a> before trading.</p>`,

  // ── KYC & Availability paragraphs ─────────────────────────────────────────
  kycAvailabilityParagraphs: [
    'Bitget requires identity verification (KYC) to access full trading, withdraw funds, and qualify for welcome bonus tasks. Creating an account requires only email or phone registration. To unlock deposit withdrawals, higher trading limits, and bonus eligibility, you must complete KYC: submit a government-issued ID (passport, national ID, or driver\'s licence) and pass a liveness check or selfie verification. This process typically completes in 2–30 minutes for automated approval, or up to 24 hours for manual review.',
    `Bitget does not accept registrations from US residents. Residents of the United Kingdom, Canada, and certain other regions may also face service restrictions. The official list of restricted jurisdictions is maintained at <a href="https://www.bitget.com/support/articles/12560603760669" target="_blank" rel="noopener noreferrer nofollow">the Bitget KYC and compliance page</a> — check this page before registering if you are unsure about your region. US users are advised to use a regulated domestic exchange such as Coinbase or Kraken.`,
    'Welcome bonus tasks on Bitget are time-limited. After registering, bonus tasks are typically active for 30 days. Vouchers earned are trading fee credits — they reduce your trading costs but cannot be withdrawn directly as cash. Only profits from trading activity (using voucher-covered fee savings) are withdrawable as standard funds. Always review current bonus terms inside the Bitget Reward Center after creating your account, as conditions vary by region and may change between promotion periods.',
  ],

  // ── Verification section ───────────────────────────────────────────────────
  verificationIntroText: `The table below reflects what CryptoBonusWorld has verified about the Bitget welcome bonus as of the last evidence review (June 2026). Evidence was collected from the official Bitget website and official bonus landing page. <em>Verified</em> items are confirmed from Bitget's public documentation. <em>Public Preview</em> items are visible to unregistered users but may change. <em>Check in Reward Center</em> items require a Bitget account to confirm and may vary by region.`,

  // verificationEvidence removed 2026-07-01: the older registration capture (SHA256
  // 74e4f7ca...) shows the same page state as evidenceRegistration (cf258981...) —
  // no meaningfully distinct proof. A genuinely separate Reward Center / task-list
  // screenshot is needed before this slot is re-added.

  verificationRows: [
    {
      area:        'Referral code',
      requirement: 'Enter CryptoBonW at registration',
      rewardType:  'Activates welcome package',
      status:      'verified',
      statusNote:  'Code verified active June 2026 via live partner portal (partner.bitget.com/bg/CryptoBonW → Claim Your Welcome Bonus of 6,200 USDT)',
    },
    {
      area:        'Account registration',
      requirement: 'Sign up via referral link (new accounts only)',
      rewardType:  'Welcome reward',
      status:      'verified',
      statusNote:  'Confirmed on Bitget bonus landing page June 2026',
    },
    {
      area:        'KYC identity verification',
      requirement: 'Government ID + liveness check',
      rewardType:  'Unlocks bonus eligibility + withdrawals',
      status:      'verified',
      statusNote:  'Confirmed required per Bitget KYC documentation',
    },
    {
      area:        'First deposit',
      requirement: 'Qualifying deposit amount (minimum applies)',
      rewardType:  'Deposit bonus voucher',
      status:      'public-preview',
      statusNote:  'Visible on Bitget bonus page; minimum deposit and exact amount subject to current terms',
    },
    {
      area:        'Copy trading milestone',
      requirement: 'Follow a signal trader and allocate funds',
      rewardType:  'Copy trading bonus',
      status:      'check-hub',
      statusNote:  'Milestone details vary — log in to Bitget Reward Center for your current tasks',
    },
    {
      area:        'Futures volume milestone',
      requirement: 'Reach specified futures trading volume within 30 days',
      rewardType:  'Trading fee vouchers',
      status:      'check-hub',
      statusNote:  'Milestones and amounts vary — log in to Bitget Reward Center for your current tasks',
    },
    {
      area:        'Voucher type',
      requirement: 'Complete task tier',
      rewardType:  'Trading fee credits (not withdrawable cash)',
      status:      'verified',
      statusNote:  'Confirmed per Bitget bonus terms: vouchers offset trading fees; only trading profits are withdrawable',
    },
  ],

  verificationAfterNote: `Bitget's welcome bonus is a task-based reward program. The 6,200 USDT headline figure is the combined maximum across all tasks — not a guaranteed payout for every user. Vouchers received are trading fee credits: they reduce your trading costs but cannot be withdrawn directly as cash. Tasks typically expire 30 days after account creation. Always review current terms inside the Bitget Reward Center after registering, as conditions vary by region and can change between promotion periods.`,

  // ── FAQ items ──────────────────────────────────────────────────────────────
  // Source: exchange-intelligence/bitget.json knowledgeBase.commonQuestions
  faqItems: [
    {
      question: 'What is the Bitget referral code?',
      answer:   'The CryptoBonusWorld referral code for Bitget is <strong>CryptoBonW</strong>. It is pre-filled automatically when you register via the link on this page. Using it activates the Bitget new user welcome package of up to 6,200 USDT.',
    },
    {
      question: 'How much is the Bitget welcome bonus?',
      answer:   'The Bitget welcome bonus via CryptoBonW is up to 6,200 USDT. This is a task-based reward: completing KYC, a qualifying deposit, and reaching trading volume milestones unlocks different tiers. Bonus vouchers are trading fee credits — not withdrawable cash.',
    },
    {
      question: 'How do I claim the Bitget bonus?',
      answer:   'Step 1: Click the registration link on this page — the referral code CryptoBonW is pre-filled. Step 2: Complete email or phone verification. Step 3: Complete KYC (government ID + liveness check — required for bonus eligibility). Step 4: Make a qualifying deposit. Step 5: Open the Reward Center in your Bitget account and complete active bonus tasks within 30 days.',
    },
    {
      question: 'What are Bitget spot trading fees?',
      answer:   'Bitget spot trading fees are 0.1% maker / 0.1% taker (standard VIP0 tier). Bitget offers tiered fee reductions with BGB token holdings. Check the official <a href="https://www.bitget.com/fee" target="_blank" rel="noopener noreferrer nofollow">Bitget fee page</a> for current rates.',
    },
    {
      question: 'What are Bitget futures trading fees?',
      answer:   'Bitget USDT-margined perpetual futures: 0.02% maker / 0.06% taker. Maximum leverage: 125×. Futures trading carries substantial risk of capital loss from liquidation. High leverage is suitable only for experienced traders with strict risk management.',
    },
    {
      question: 'Does Bitget have copy trading?',
      answer:   'Yes. Bitget is the industry leader in copy trading, with 100,000+ signal traders. Users can allocate funds and mirror top traders automatically. Copy trading participants receive additional welcome rewards.',
    },
    {
      question: 'Does Bitget require KYC?',
      answer:   'Yes. Bitget requires identity verification to unlock full withdrawal access and welcome bonus eligibility. The process requires a government-issued ID and a liveness/selfie check. Typically completes in 2–30 minutes for automated approval; up to 24 hours for manual review.',
    },
    {
      question: 'Is Bitget available in the United States?',
      answer:   'No. Bitget restricts US residents from registering on the platform. US users should use a regulated domestic alternative such as Coinbase or Kraken.',
    },
    {
      question: 'Does Bitget have Proof of Reserves?',
      answer:   'Yes. Bitget publishes Proof of Reserves with Merkle tree verification, allowing users to independently verify that exchange-held assets cover all user balances. See <a href="https://www.bitget.com/proof-of-reserves" target="_blank" rel="noopener noreferrer nofollow">bitget.com/proof-of-reserves</a> for the latest report.',
    },
    {
      question: 'What leverage does Bitget offer?',
      answer:   'Bitget offers up to 125× leverage on futures. High leverage carries substantial risk of capital loss from liquidation — suitable only for experienced traders with strict risk management.',
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
    {
      slug:    'okx',
      name:    'OKX',
      logo:    '/logos/okx.png',
      bonus:   'Up to 5,000 USDT Welcome Bonus',
      tag:     'Code: CRYPTOBONUSW',
      tileBg:  '#1a1a2e',
      pageUrl: '/okx/',
    },
    {
      slug:    'kucoin',
      name:    'KuCoin',
      logo:    '/logos/kucoin.png',
      bonus:   'New User Welcome Rewards',
      tag:     'No KYC required',
      tileBg:  '#0A1628',
      pageUrl: '/kucoin/',
    },
    {
      slug:    'bingx',
      name:    'BingX',
      logo:    '/logos/bingx.png',
      bonus:   'Welcome Rewards',
      tag:     'Copy trading',
      tileBg:  '#0B1D3A',
      pageUrl: '/bingx/',
    },
  ],

};
