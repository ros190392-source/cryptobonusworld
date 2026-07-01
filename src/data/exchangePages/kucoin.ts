import type { ExchangePromoPageConfig } from './types';
import { getOffer } from '../offers';

const offer = getOffer('kucoin')!;

export const kucoinConfig: ExchangePromoPageConfig = {
  // ─── Identity ────────────────────────────────────────────────
  slug: 'kucoin',
  name: 'KuCoin',
  affiliateUrl: '/go/kucoin/',
  officialDomain: 'kucoin.com',
  supportUrl: 'https://support.kucoin.plus',
  feeUrl: 'https://www.kucoin.com/vip/privilege',

  // ─── Media ───────────────────────────────────────────────────
  wordmarkImg: '/logos/kucoin-wordmark.png',
  articleImg: '/media/exchanges/kucoin/final/kucoin-article-final-v1-1200x675.jpg',
  ogImage: '/media/exchanges/kucoin/final/kucoin-og-final-v1-1200x630.jpg',
  heroBackgroundImg: '/media/hero-backgrounds/kucoin-hero-custom-v1.png',
  heroBackgroundPosition: 'center center',
  logoImg: '/logos/kucoin.png',

  // ─── Commercial ──────────────────────────────────────────────
  promoCode: offer.promoCode,
  bonusMax: 500,
  currency: 'USDT',
  rewardsAreaName: 'Bonus Center',
  realisticValue: offer.realisticValue,
  lastChecked: offer.lastChecked,
  sourceUrl: offer.sourceUrl,

  // ─── Exchange facts ───────────────────────────────────────────
  founded: 2017,
  users: '41M+',
  headquarters: 'Seychelles',

  // ─── Fees ─────────────────────────────────────────────────────
  fees: {
    spot:    { maker: '0.1%',  taker: '0.1%'  },
    futures: { maker: '0.02%', taker: '0.06%' },
  },

  // ─── KYC ──────────────────────────────────────────────────────
  kycRequired: false,
  kycNote: 'Optional — trade without KYC (1 BTC/day withdrawal limit)',

  // ─── Brand ────────────────────────────────────────────────────
  heroTokens: {
    bgFrom: '#0A1628',
    bgTo: '#111E35',
    accent: '#24AE8F',
    codeColor: '#1A8A72',
  },
  heroPromoLabel: 'REFERRAL CODE',
  logoVisualScale: 0.85,

  // ─── SEO meta ─────────────────────────────────────────────────
  canonicalUrl: 'https://cryptobonusworld.com/kucoin/',
  pageTitle: `KuCoin Referral Code 2026: ${offer.promoCode} — New User Welcome Rewards`,
  pageDescription: `KuCoin referral code ${offer.promoCode} — activate new user welcome rewards. No KYC required for base tier. Verified ${offer.lastChecked}. Enter code at registration.`,
  ogTitle: `KuCoin Referral Code: ${offer.promoCode} — Claim New User Bonus`,
  ogDescription: `Use KuCoin referral code ${offer.promoCode} to activate new user welcome rewards. No KYC required for base tier. Verified ${offer.lastChecked} by CryptoBonusWorld.`,
  seoPhraseLabel: 'KuCoin Referral Code Bonus',

  // ─── Intro paragraphs ─────────────────────────────────────────
  introParagraphs: [
    `Looking for a KuCoin referral code? Use <strong>${offer.promoCode}</strong> to open the official KuCoin bonus page and check the latest welcome rewards for new users.`,
    `The KuCoin referral code ${offer.promoCode} gives new accounts access to a welcome package of tasks inside the KuCoin Bonus Center. Rewards are task-based and depend on which milestones you complete after registration — including deposit and trading volume thresholds. KuCoin does not display a fixed bonus amount on the referral landing page; your actual rewards are revealed after account creation.`,
    `This page covers what the KuCoin referral code does, how to apply it at sign-up, and what to expect from the new user rewards program. All information is based on publicly available details from the official KuCoin bonus page.`,
  ],

  // ─── How to claim ─────────────────────────────────────────────
  howToClaimSteps: [
    'Open the official KuCoin referral link from this page',
    'Create a new KuCoin account with your email address',
    `Confirm the referral code <strong>${offer.promoCode}</strong> is applied during sign-up`,
    'KYC is optional — start trading immediately or complete it to increase withdrawal limits',
    'Check the KuCoin Bonus Center inside your account for available welcome tasks and deadlines.',
  ],

  // ─── Evidence ─────────────────────────────────────────────────
  evidenceRegistration: {
    src: '/screenshots/kucoin/bonus_referral_landing/global-desktop-2026-06.webp',
    alt: `KuCoin referral landing page with code ${offer.promoCode} applied`,
    width: 1440,
    height: 900,
    caption: `KuCoin referral landing via code ${offer.promoCode}. The landing shows a "Create Account &amp; Claim Rewards" button — KuCoin reveals exact bonus tasks inside the Bonus Center after registration. Verified ${offer.lastChecked}.`,
  },

  // ─── Bonus levels ─────────────────────────────────────────────
  bonusLevelRows: [
    { task: 'Account registration',   requirement: 'Sign up via referral link or code',       rewardType: 'Welcome eligibility',    notes: 'No KYC required for base tier' },
    { task: 'First deposit',          requirement: 'Deposit amount varies by tier',            rewardType: 'Deposit bonus',           notes: 'Amount scales with deposit size' },
    { task: 'First trade',            requirement: 'Place any spot or futures trade',          rewardType: 'Trading bonus',           notes: 'Min trade value may apply' },
    { task: 'Volume milestones',      requirement: 'Meet deposit / trading thresholds',        rewardType: 'Tiered bonus vouchers',   notes: 'Check Bonus Center for tier details' },
    { task: 'Bonus Center tasks',     requirement: 'Complete daily / weekly missions',         rewardType: 'Extra vouchers / credits', notes: 'Tasks refresh periodically' },
  ],
  bonusExtraSections: [
    {
      h3: 'What to Expect for Most New Users',
      text: `${offer.realisticValue}. KuCoin structures its welcome package as a series of tasks inside the Bonus Center — the exchange deliberately does not display a fixed amount on the referral landing page. Your actual tasks and rewards are shown immediately after you create your account with code ${offer.promoCode}. No KYC is required to start trading or claim the base reward tier, making KuCoin accessible for users who prefer to trade without identity verification. Completing a first deposit early unlocks additional reward tiers.`,
    },
  ],

  // ─── About ────────────────────────────────────────────────────
  aboutParagraphs: [
    `KuCoin was founded in 2017 and is one of the longest-running cryptocurrency exchanges. Known as "The People's Exchange", the platform serves more than 41 million registered users across over 200 countries and is recognised for its wide selection of altcoins — over 900 listed assets — and its accessible approach to trading without mandatory identity verification.`,
    `KuCoin offers spot trading, margin, futures, P2P, copy trading, lending, and a suite of earn products. Holding KCS (KuCoin Token) provides a 20% trading fee rebate. KuCoin does not accept users from the United States. The exchange holds SOC 2 Type II and ISO 27001:2022 certifications and publishes Proof of Reserves data.`,
  ],
  supportText: `KuCoin provides 24/7 customer support via live chat and a dedicated <a href="https://support.kucoin.plus" target="_blank" rel="noopener noreferrer nofollow">KuCoin Help Center</a>. For account-related issues including bonus queries, the live chat option is the fastest route.`,

  // ─── Partner offer ────────────────────────────────────────────
  partnerOfferText: `Exact rewards — including any trading fee credits, vouchers, and Bonus Center tasks — depend on KuCoin's current terms, your region, KYC status, deposit amounts, and trading activity. Always check the current offer on the official KuCoin bonus page after creating your new account.`,

  // ─── Code search variations ───────────────────────────────────
  searchVariations: ['Welcome code', 'Promo code', 'Bonus code', 'Invite code', 'Referral code'],

  // ─── Fee table ────────────────────────────────────────────────
  feeTableRows: [
    {
      market: 'Spot',
      maker: '0.1%',
      taker: '0.1%',
      statusCellHtml: `<td style="color:#16A34A;font-size:12px;">✅ Official KuCoin fee page · ${offer.lastChecked}</td>`,
    },
    {
      market: 'Perpetual &amp; Futures',
      maker: '0.02%',
      taker: '0.06%',
      statusCellHtml: `<td style="color:#16A34A;font-size:12px;">✅ Official KuCoin fee page · ${offer.lastChecked}</td>`,
    },
  ],
  feeAfterNoteHtml: `<p class="p2-text" style="margin-top:10px;font-size:12px;color:#6B7280;">Last checked: ${offer.lastChecked} from the <a href="https://www.kucoin.com/vip/privilege" target="_blank" rel="noopener noreferrer nofollow" style="color:#6B7280;">official KuCoin fee page</a>. KCS token holders receive a 20% trading fee rebate. Always verify the latest fee schedule on the official KuCoin website before trading.</p>`,

  // ─── KYC & availability ───────────────────────────────────────
  kycAvailabilityParagraphs: [
    `KuCoin does not require identity verification (KYC) for basic account access and spot trading. Without KYC, daily withdrawal limits are set to 1 BTC equivalent. Completing identity verification removes this limit and may unlock additional welcome bonus tiers inside the Bonus Center.`,
    `The offer linked to referral code <strong>${offer.promoCode}</strong> is available globally, but KuCoin restricts access for users in the United States. This may be updated — always verify on the official <a href="https://www.kucoin.com/support/articles/360015552591" target="_blank" rel="noopener noreferrer nofollow">KuCoin restricted regions page</a> before registering.`,
    `Even in countries where KuCoin is available, specific bonus tasks or reward amounts may differ by region and account type. After registering, the Bonus Center inside your account shows which tasks are active for your location.`,
  ],

  // ─── Verification table ───────────────────────────────────────
  verificationIntroText: `The table below shows what CryptoBonusWorld has verified about the KuCoin bonus offer linked to code ${offer.promoCode}. Rows marked "Check in Bonus Center" depend on individual account status and must be verified inside your KuCoin account after registration.`,
  verificationEvidence: {
    src: '/screenshots/kucoin/bonus_referral_landing/global-desktop-2026-06.webp',
    alt: `KuCoin referral landing page showing new user welcome offer via code ${offer.promoCode}`,
    width: 1440,
    height: 900,
    caption: `KuCoin referral landing via code ${offer.promoCode}. KuCoin does not show a fixed bonus amount on this page — exact tasks and rewards are revealed inside the Bonus Center after registration. Captured ${offer.lastChecked}.`,
    wide: true,
  },
  verificationRows: [
    { area: `Sign-up with ${offer.promoCode}`, requirement: 'Referral code applied at registration',        rewardType: 'Welcome eligibility',         status: 'verified',       statusNote: `Referral landing screenshot · ${offer.lastChecked}` },
    { area: 'Welcome rewards exist',           requirement: 'Open KuCoin bonus page via referral link',    rewardType: 'New user bonus tasks',        status: 'public-preview', statusNote: 'Bonus Center shows tasks after registration' },
    { area: 'No-KYC trading',                  requirement: 'Optional KYC — 1 BTC/day limit without it',   rewardType: 'Account access',              status: 'verified',       statusNote: `Official KuCoin KYC policy · ${offer.lastChecked}` },
    { area: 'First deposit bonus',             requirement: 'Deposit required; amount varies by tier',     rewardType: 'Deposit bonus',               status: 'check-hub',      statusNote: 'Check exact tasks after sign-up.' },
    { area: 'Trading volume tasks',            requirement: 'Trading volume may be required',               rewardType: 'Bonus or trading fee credit', status: 'check-hub',      statusNote: 'Check exact tasks after sign-up.' },
    { area: 'Claim period',                    requirement: 'Rewards expire after a set period',           rewardType: 'Manual claim required',       status: 'check-hub',      statusNote: 'Check exact tasks after sign-up.' },
  ],
  verificationAfterNote: `The Bonus Center inside your KuCoin account shows the exact tasks, deadlines and claim rules. Task amounts can vary by country, KYC level, deposit amount, trading activity, and promotion period. KuCoin intentionally does not display a fixed bonus amount on the referral landing — your rewards are revealed immediately after registration.`,

  // ─── FAQ ──────────────────────────────────────────────────────
  faqItems: [
    {
      question: 'Does KuCoin require KYC to claim the bonus?',
      answer: `No. KuCoin does not require identity verification to access the base welcome tasks. Register with code ${offer.promoCode} and start earning rewards without KYC. Without identity verification, your daily withdrawal limit is capped at 1 BTC equivalent. Some higher-tier bonus tasks may require KYC — check the Bonus Center after sign-up.`,
    },
    {
      question: 'Why does the KuCoin referral page not show a bonus amount?',
      answer: `KuCoin intentionally does not display a fixed bonus amount on the referral landing page. Your exact rewards — trading credits, vouchers, and bonus tasks — are revealed inside the Bonus Center immediately after you create your account using code ${offer.promoCode}.`,
    },
    {
      question: 'What are the KuCoin trading fees?',
      answer: "KuCoin's standard spot trading fee is 0.1% for both makers and takers. Futures fees are 0.02% maker and 0.06% taker. Holding KCS (KuCoin Token) provides a 20% fee rebate on all trades. Some welcome bonus tasks may include trading fee credit vouchers — check the Bonus Center after registering.",
    },
    {
      question: 'Can I apply the referral code after registration?',
      answer: `No. The KuCoin referral code ${offer.promoCode} must be entered during account creation. It cannot be applied to an existing KuCoin account after registration. If you already have a KuCoin account, check the Bonus Center inside your account for ongoing promotions instead.`,
    },
    {
      question: 'Is KuCoin available in my country?',
      answer: "KuCoin is available in over 200 countries. The primary restriction is the United States — US residents cannot register on KuCoin.com. For other jurisdictions, check the official KuCoin terms before registering. Country-specific reward availability may also vary.",
    },
    {
      question: 'Which currency are KuCoin rewards paid in?',
      answer: 'Most KuCoin welcome bonus rewards are denominated in USDT or issued as trading fee vouchers. KCS token rewards may also be available. Specific reward types and amounts for each task are shown inside the Bonus Center after registration.',
    },
    {
      question: 'Can I stack the KuCoin referral bonus with other promotions?',
      answer: 'KuCoin often runs additional promotions alongside the new user welcome package. After registering with code CRYPTOBONW, check the KuCoin Bonus Center and the official Promotions page for any active campaigns that may stack with your welcome tasks. Stacking eligibility depends on KuCoin\'s current terms.',
    },
  ],

  // ─── Related exchanges ────────────────────────────────────────
  relatedExchanges: [
    { slug: 'bybit',  name: 'Bybit',  logo: '/logos/bybit.png',  bonus: 'Up to 30,000 USDT', tag: 'Top derivatives', tileBg: '#1A1F2E', pageUrl: '/bybit/'  },
    { slug: 'mexc',   name: 'MEXC',   logo: '/logos/mexc.png',   bonus: 'Up to 10,000 USDT', tag: 'No KYC option',  tileBg: '#F5F3FF', pageUrl: '/mexc/'   },
    { slug: 'okx',    name: 'OKX',    logo: '/logos/okx.png',    bonus: 'Up to 5,000 USDT',  tag: 'CEX + Web3',     tileBg: '#F3F4F6', pageUrl: '/okx/'    },
    { slug: 'bitget', name: 'Bitget', logo: '/logos/bitget.png', bonus: 'Up to 6,200 USDT',  tag: 'Copy trading',   tileBg: '#ECFDF5', pageUrl: '/bitget/' },
    { slug: 'bingx',  name: 'BingX',  logo: '/logos/bingx.png',  bonus: 'Welcome rewards',    tag: 'Copy trading',   tileBg: '#0B1D3A', pageUrl: '/bingx/'  },
  ],
};
