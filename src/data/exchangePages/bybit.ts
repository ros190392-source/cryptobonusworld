import type { ExchangePromoPageConfig } from './types';
import { getOffer } from '../offers';

const offer = getOffer('bybit')!;

export const bybitConfig: ExchangePromoPageConfig = {
  // ─── Identity ────────────────────────────────────────────────
  slug: 'bybit',
  name: 'Bybit',
  affiliateUrl: '/go/bybit/',
  officialDomain: 'bybit.com',
  supportUrl: 'https://help.bybit.com',
  feeUrl: 'https://www.bybit.com/en/announcement-info/fee-rate',

  // ─── Media ───────────────────────────────────────────────────
  wordmarkImg: '/logos/bybit-wordmark-official.png',
  articleImg: '/media/exchanges/bybit/final/bybit-article-final-v3-1200x675.jpg',
  ogImage: '/media/exchanges/bybit/final/bybit-og-final-v3-1200x630.jpg',
  heroBackgroundImg: '/media/hero-backgrounds/bybit-hero-custom-v1.png',
  heroBackgroundPosition: 'left center',
  logoImg: '/logos/bybit.png',

  // ─── Commercial ──────────────────────────────────────────────
  promoCode: offer.promoCode,
  bonusMax: 30000,
  currency: 'USDT',
  rewardsAreaName: 'Rewards Hub',
  realisticValue: offer.realisticValue,
  lastChecked: offer.lastChecked,
  sourceUrl: offer.sourceUrl,

  // ─── Exchange facts ───────────────────────────────────────────
  founded: 2018,
  users: '30M+',
  headquarters: 'Dubai, UAE',

  // ─── Fees ─────────────────────────────────────────────────────
  fees: {
    spot:    { maker: '0.1%',  taker: '0.1%'   },
    futures: { maker: '0.02%', taker: '0.055%' },
    options: { maker: '0.02%', taker: '0.03%'  },
  },

  // ─── KYC ──────────────────────────────────────────────────────
  kycRequired: true,
  kycNote: 'Yes — identity verification required',

  // ─── Brand ────────────────────────────────────────────────────
  heroTokens: {
    bgFrom: '#0C1118',
    bgTo: '#141B25',
    accent: '#f7a600',
    codeColor: '#c47f00',
  },
  heroPromoLabel: 'PROMO CODE',
  logoVisualScale: 0.70,

  // ─── SEO meta ─────────────────────────────────────────────────
  canonicalUrl: 'https://cryptobonusworld.com/bybit/',
  pageTitle: `Bybit Referral Code 2026: ${offer.promoCode} — Up to 30,000 USDT Bonus`,
  pageDescription: `Bybit promo code ${offer.promoCode} — up to 30,000 USDT welcome package + fee discount. Verified ${offer.lastChecked}. Enter code at registration before your first deposit.`,
  ogTitle: `Bybit Referral Code: ${offer.promoCode} — Claim Bonus`,
  ogDescription: `Use Bybit referral code ${offer.promoCode} to claim welcome rewards up to 30,000 USDT. Verified ${offer.lastChecked} by CryptoBonusWorld.`,
  seoPhraseLabel: 'Bybit Promo Code Bonus',

  // ─── Intro paragraphs ─────────────────────────────────────────
  introParagraphs: [
    `Looking for a Bybit referral code? Use <strong>${offer.promoCode}</strong> to open the official Bybit bonus page and check the latest sign-up rewards for new users.`,
    `The Bybit promo code ${offer.promoCode} gives new accounts access to a welcome package that can include deposit bonuses, trading vouchers, and fee discounts. The rewards you receive depend on which tasks you complete after registration — Bybit structures its new user bonus as a series of milestones rather than a single fixed payout.`,
    `This page covers what the Bybit bonus code does, how to apply it at sign-up, and what to expect from the Bybit sign-up bonus program. All information is based on publicly available details from the official Bybit bonus page.`,
  ],

  // ─── How to claim ─────────────────────────────────────────────
  howToClaimSteps: [
    'Open the official Bybit bonus link',
    'Create a new Bybit account',
    `Confirm the referral code <strong>${offer.promoCode}</strong>`,
    'Complete verification if required',
    'Check the Bybit Rewards Hub inside your account for available tasks, deadlines and claim rules.',
  ],

  // ─── Evidence ─────────────────────────────────────────────────
  evidenceRegistration: {
    src: '/media/exchanges/bybit/evidence/global-en/bybit-signup-code-applied-mobile.png',
    alt: `Bybit referral code ${offer.promoCode} auto-filled on the sign-up page`,
    width: 1080,
    height: 1947,
    caption: `Bybit sign-up page with ${offer.promoCode} pre-filled in the referral code field.`,
  },

  // ─── Bonus levels ─────────────────────────────────────────────
  bonusLevelRows: [
    { task: 'KYC verification',    requirement: 'Complete identity check',                    rewardType: 'Bonus voucher',  notes: 'Required to unlock most rewards' },
    { task: 'First deposit',       requirement: 'Deposit amount varies by tier',              rewardType: 'Deposit bonus',  notes: 'Amount scales with deposit size' },
    { task: 'First futures trade', requirement: 'Place any derivatives trade',                rewardType: 'Trading bonus',  notes: 'Min trade value may apply' },
    { task: 'Volume milestones',   requirement: 'Meet higher deposit / trading thresholds',   rewardType: 'Tiered bonus',   notes: 'Up to 30,000 USDT across all tasks' },
    { task: 'Rewards Hub tasks',   requirement: 'Complete daily / weekly missions',           rewardType: 'Extra vouchers', notes: 'Tasks refresh periodically' },
  ],
  bonusExtraSections: [
    {
      h3: 'Realistic Value for Most New Users',
      text: `${offer.realisticValue}. The full advertised maximum is not a guaranteed amount for every user. Complete KYC and your first deposit early — these two steps unlock the largest share of the new user package. After that, check the Rewards Hub inside your Bybit account for any active tasks that apply to your account type and region. Not all tasks will be available in every country.`,
    },
  ],

  // ─── About ────────────────────────────────────────────────────
  aboutParagraphs: [
    `Bybit was founded in ${2018} and is headquartered in Dubai, UAE, where it operates under a Virtual Asset Service Provider (VASP) licence issued by the Dubai Virtual Assets Regulatory Authority (VARA). The exchange serves more than 30M+ registered users across over 160 countries and territories.`,
    `Bybit offers spot trading, perpetual and quarterly futures contracts, options, and a copy trading marketplace. The platform is available via web browser and through official iOS and Android apps. Bybit does not currently accept users from the United States, Canada, or several other restricted jurisdictions.`,
  ],
  supportText: `Bybit provides 24/7 customer support through live chat on the platform and a dedicated <a href="https://help.bybit.com" target="_blank" rel="noopener noreferrer nofollow">Bybit Help Center</a>. Support is available in English and several other languages. For account-related issues — including bonus queries — the live chat route is typically the fastest way to reach a response.`,

  // ─── Partner offer ────────────────────────────────────────────
  partnerOfferText: `Exact rewards — including any crypto coupons, fee benefits, trading bonuses, and Rewards Hub tasks — depend on Bybit's current terms, your region, KYC status, deposit amounts, and trading activity. Always check the current offer on the official Bybit bonus page after creating your new account.`,

  // ─── Code search variations ───────────────────────────────────
  searchVariations: ['Welcome code', 'Promo code', 'Bonus code', 'Invite code', 'Fee discount code'],

  // ─── Fee table ────────────────────────────────────────────────
  feeTableRows: [
    {
      market: 'Spot',
      maker: '0.1%',
      taker: '0.1%',
      statusCellHtml: `<td style="color:#16A34A;font-size:12px;">✅ Official Bybit fee page · ${offer.lastChecked}</td>`,
    },
    {
      market: 'Perpetual &amp; Futures',
      maker: '0.02%',
      taker: '0.055%',
      statusCellHtml: `<td style="color:#16A34A;font-size:12px;">✅ Official Bybit fee page · ${offer.lastChecked}</td>`,
    },
    {
      market: 'Options',
      maker: '0.02%',
      taker: '0.03%',
      statusCellHtml: `<td style="color:#16A34A;font-size:12px;">✅ Official Bybit fee page · ${offer.lastChecked}</td>`,
    },
  ],
  feeAfterNoteHtml: `<p class="p2-text" style="margin-top:10px;font-size:12px;color:#6B7280;">Last checked: ${offer.lastChecked} from the <a href="https://www.bybit.com/en/announcement-info/fee-rate" target="_blank" rel="noopener noreferrer nofollow" style="color:#6B7280;">official Bybit fee page</a>. Always check the <a href="https://www.bybit.com/en/announcement-info/fee-rate" target="_blank" rel="noopener noreferrer nofollow" style="color:#6B7280;">official Bybit fee page</a> before trading.</p>`,

  // ─── KYC & availability ───────────────────────────────────────
  kycAvailabilityParagraphs: [
    `Bybit requires identity verification (KYC) to withdraw funds and to unlock most new user bonus tasks. Basic verification involves submitting a government-issued ID and a facial check. Without KYC, most welcome bonus milestones — including the deposit bonus and trading rewards — remain locked.`,
    `The offer linked to referral code <strong>${offer.promoCode}</strong> is available globally, but Bybit restricts access in certain jurisdictions. Confirmed restricted regions include: United States (US), United Kingdom (UK), Canada (CA), Singapore (SG), and the Netherlands (NL). This list may be updated — always verify on the official <a href="https://www.bybit.com/en/help-center/article/Restricted-countries" target="_blank" rel="noopener noreferrer nofollow">Bybit restricted countries page</a> before registering.`,
    `Bybit holds a Virtual Asset Service Provider (VASP) licence issued by the Dubai Virtual Assets Regulatory Authority (VARA). Even in countries where Bybit is available, specific bonus tasks or reward tiers may be region-specific. After registering, the Rewards Hub inside your account shows which tasks are active for your location.`,
  ],

  // ─── Verification table ───────────────────────────────────────
  verificationIntroText: `The table below shows what CryptoBonusWorld has independently verified about the Bybit bonus offer linked to the code ${offer.promoCode}. Rows marked "Check in Rewards Hub" depend on individual account status and require verification inside your Bybit account after registration.`,
  verificationEvidence: {
    src: '/media/exchanges/bybit/evidence/global-en/bybit-public-welcome-rewards.png',
    alt: 'Bybit public welcome rewards page showing reward tiers up to $30,000',
    width: 848,
    height: 664,
    caption: `Bybit's public welcome page shows reward tiers up to $30,000. Higher rewards depend on deposit, trading volume, VIP level and eligibility rules shown in Rewards Hub. Captured ${offer.lastChecked}.`,
    wide: true,
  },
  verificationRows: [
    { area: `Sign-up with ${offer.promoCode}`,   requirement: 'Referral code applied at registration',           rewardType: 'Welcome eligibility',              status: 'verified',       statusNote: `Mobile screenshot · ${offer.lastChecked}` },
    { area: 'Welcome rewards',                   requirement: 'Open official Bybit bonus page via partner link', rewardType: 'Welcome gifts (up to 30,000 USDT)', status: 'verified',       statusNote: `Public welcome page · ${offer.lastChecked}` },
    { area: 'Reward tiers ($50–$30,000)',         requirement: 'Deposit + trading volume requirements per tier',  rewardType: 'Tiered deposit bonus',             status: 'public-preview', statusNote: 'Public page shows tiers; exact eligibility checked inside Rewards Hub.' },
    { area: 'Identity verification',             requirement: 'KYC required to unlock most rewards',            rewardType: 'Reward access',                    status: 'verified',       statusNote: `Official Bybit FAQ · ${offer.lastChecked}` },
    { area: 'Deposit tasks',                     requirement: 'Deposit required; amount varies by tier',        rewardType: 'Deposit bonus or coupon',          status: 'check-hub',      statusNote: 'Check exact tasks after sign-up.' },
    { area: 'Trading tasks',                     requirement: 'Trading volume may be required',                  rewardType: 'Bonus, fee saver or fee discount', status: 'check-hub',      statusNote: 'Check exact tasks after sign-up.' },
    { area: 'Claim period',                      requirement: 'Rewards expire after a set period',              rewardType: 'Manual claim required',            status: 'check-hub',      statusNote: 'Check exact tasks after sign-up.' },
  ],
  verificationAfterNote: `The Rewards Hub inside your Bybit account shows the exact tasks, deadlines and claim rules. Task amounts can vary by country, KYC level, deposit amount, trading activity and promotion period.`,

  // ─── FAQ ──────────────────────────────────────────────────────
  faqItems: [
    {
      question: 'Do I have to make a cryptocurrency deposit?',
      answer: 'Not for every task. KYC verification alone may unlock a small reward in the welcome package. However, the larger deposit bonus and most milestone rewards do require you to fund your account. The exact deposit threshold for each tier is shown on the official Bybit bonus page after you register.',
    },
    {
      question: 'Can I get more than one Bybit bonus?',
      answer: 'Within the welcome package, yes — each completed task unlocks its own reward. You can earn multiple rewards by completing KYC, making a first deposit, placing a futures trade, and meeting volume milestones. The welcome package itself is a one-time offer for new accounts and cannot be repeated on the same account.',
    },
    {
      question: 'What are the Bybit fees?',
      answer: `Bybit's standard spot trading fee is 0.1% for both makers and takers. Perpetual futures fees are 0.02% for makers and 0.055% for takers. Options are 0.02% maker and 0.03% taker. Some welcome package rewards include a fee discount voucher — check the Rewards Hub after registering to see whether one is available for your account.`,
    },
    {
      question: 'Which currency are rewards paid in?',
      answer: 'Most Bybit welcome bonus rewards are denominated in USDT or issued as USDT-equivalent trading vouchers. Some rewards come as experience points (EXP) that convert to USDT after you meet a trading volume requirement. Specific reward currencies are shown for each task inside the Bybit welcome offer page.',
    },
    {
      question: 'Can existing users use the referral code?',
      answer: `No. The Bybit referral code ${offer.promoCode} is for new users only and must be entered during account creation. It cannot be added to an existing Bybit account after registration. If you already have a Bybit account, check the ongoing Rewards Hub inside your account instead.`,
    },
    {
      question: 'Is the Bybit bonus available in every country?',
      answer: 'No. Bybit restricts access in a number of jurisdictions, including the United States, United Kingdom, and Canada. Even in countries where Bybit is available, specific bonus tasks or reward amounts may differ by region. After registering, the official Bybit bonus page will show which welcome tasks are active for your account and location.',
    },
    {
      question: "Why isn't the referral code working?",
      answer: `Referral codes must be entered during the account creation step — they cannot be applied to an account that already exists. If you are registering for the first time and the code is not accepted, check that you are using the correct code (<strong>${offer.promoCode}</strong>), that you are accessing the sign-up form via the official Bybit link, and that your country is not in the restricted list. If the problem persists, contact Bybit support through live chat.`,
    },
  ],

  // ─── Related exchanges ────────────────────────────────────────
  relatedExchanges: [
    { slug: 'mexc',   name: 'MEXC',   logo: '/logos/mexc.png',   bonus: 'Up to 10,000 USDT', tag: 'No KYC option',  tileBg: '#F5F3FF', pageUrl: '/mexc/' },
    { slug: 'bitget', name: 'Bitget', logo: '/logos/bitget.png', bonus: 'Up to 6,200 USDT',  tag: 'Copy trading',   tileBg: '#ECFDF5', pageUrl: '/bitget/' },
    { slug: 'bingx',  name: 'BingX',  logo: '/logos/bingx.png',  bonus: 'Up to 5,125 USDT',  tag: 'Social trading', tileBg: '#EFF6FF' },
    { slug: 'okx',    name: 'OKX',    logo: '/logos/okx.png',    bonus: 'Up to 5,000 USDT',  tag: 'CEX + Web3',     tileBg: '#F3F4F6', pageUrl: '/okx/' },
  ],
};
