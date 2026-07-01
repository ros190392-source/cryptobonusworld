import type { ExchangePromoPageConfig } from './types';
import { getOffer } from '../offers';

const offer = getOffer('mexc')!;

export const mexcConfig: ExchangePromoPageConfig = {
  // ─── Identity ────────────────────────────────────────────────
  slug: 'mexc',
  name: 'MEXC',
  affiliateUrl: '/go/mexc/',
  officialDomain: 'mexc.com',
  supportUrl: 'https://www.mexc.com/support',
  feeUrl: 'https://www.mexc.com/fee',

  // ─── Media ───────────────────────────────────────────────────
  wordmarkImg: '/media/exchanges/mexc/logo/mexc-logo-transparent-2517-trimmed.png',
  articleImg: '/media/exchanges/mexc/final/mexc-article-final-v3-1200x675.jpg',
  ogImage: '/media/exchanges/mexc/final/mexc-og-final-v3-1200x630.jpg',
  heroBackgroundImg: '/media/hero-backgrounds/mexc-hero-custom-v1.png',
  heroBackgroundPosition: 'center center',
  logoImg: '/logos/mexc.png',

  // ─── Commercial ──────────────────────────────────────────────
  promoCode: offer.promoCode,
  bonusMax: 10000,
  currency: 'USDT',
  rewardsAreaName: 'Activity Center',
  realisticValue: offer.realisticValue,
  lastChecked: offer.lastChecked,
  sourceUrl: offer.sourceUrl,

  // ─── Exchange facts ───────────────────────────────────────────
  founded: 2018,
  users: '10M+',
  headquarters: 'Seychelles',

  // ─── Fees ─────────────────────────────────────────────────────
  fees: {
    spot:    { maker: '0%',  taker: '0.05%' },
    futures: { maker: '0%',  taker: '0.01%' },
  },

  // ─── KYC ──────────────────────────────────────────────────────
  kycRequired: false,
  kycNote: 'No — base tier requires no identity verification',

  // ─── Brand ────────────────────────────────────────────────────
  heroTokens: {
    bgFrom: '#0C1118',
    bgTo: '#141B25',
    accent: '#0BCDFF',
    codeColor: '#0099cc',
  },
  heroPromoLabel: 'REFERRAL CODE',

  // ─── SEO meta ─────────────────────────────────────────────────
  canonicalUrl: 'https://cryptobonusworld.com/mexc/',
  pageTitle: `MEXC Referral Code 2026: ${offer.promoCode} — Up to 10,000 USDT`,
  pageDescription: `MEXC referral code ${offer.promoCode} — up to 10,000 USDT in new user rewards. No KYC required for base tiers. Verified ${offer.lastChecked}. Enter code at registration.`,
  ogTitle: `MEXC Referral Code: ${offer.promoCode} — Claim Bonus`,
  ogDescription: `Use MEXC referral code ${offer.promoCode} to claim up to 10,000 USDT in new user rewards. No KYC required for base tier. Verified ${offer.lastChecked} by CryptoBonusWorld.`,
  seoPhraseLabel: 'MEXC Referral Code — No KYC Required',

  // ─── Intro paragraphs ─────────────────────────────────────────
  introParagraphs: [
    `Looking for an MEXC referral code? Use <strong>${offer.promoCode}</strong> to open the official MEXC bonus page and check the latest new user rewards. No KYC or minimum deposit is required for the base signup tier.`,
    `The MEXC referral code ${offer.promoCode} gives new accounts access to a welcome rewards package that can include trading vouchers, deposit bonuses, and futures trading rewards. The total value shown on the official MEXC bonus page is up to 10,000 USDT. The actual amount you receive depends on which tasks you complete — MEXC structures new user rewards as a series of individual milestones, each with its own requirement and payout.`,
    `This page covers what the MEXC referral code does, how to apply it at registration, and what to expect from the MEXC new user rewards program. All information is based on publicly available details from official MEXC pages and the confirmed affiliate partner link.`,
  ],

  // ─── How to claim ─────────────────────────────────────────────
  howToClaimSteps: [
    'Click the partner link on this page to open the official MEXC registration form',
    'Create a new MEXC account with your email or phone number',
    `Confirm the referral code <strong>${offer.promoCode}</strong> is pre-filled — enter it manually if it is not shown`,
    'Complete registration — KYC is not required for the base reward tier; complete identity verification if you want to unlock higher bonus tiers',
    'Check your MEXC Activity Center inside the account for available bonus tasks, deadlines and claim rules',
  ],

  // ─── Evidence ─────────────────────────────────────────────────
  evidenceRegistration: {
    src: '/media/exchanges/mexc/evidence/global-en/mexc-registration-code-applied.png',
    alt: `MEXC sign-up page with referral code ${offer.promoCode} pre-filled and 10,000 USDT new user offer shown`,
    width: 1440,
    height: 900,
    caption: `Official MEXC custom sign-up page — referral code <strong>${offer.promoCode}</strong> pre-filled, right panel confirms "Sign Up to Claim 10,000 USDT". Captured ${offer.lastChecked}.`,
    wide: true,
  },
  evidenceBonusPage: {
    src: '/media/exchanges/mexc/evidence/global-en/mexc-public-new-user-rewards.png',
    alt: 'MEXC new user rewards page showing the welcome bonus structure available to new accounts',
    width: 1440,
    height: 900,
    caption: `Official MEXC new user rewards page — showing the welcome bonus structure available through the partner referral link. Captured ${offer.lastChecked}.`,
    wide: true,
  },
  evidenceFeeScreenshots: [
    {
      src: '/media/exchanges/mexc/evidence/global-en/mexc-fee-page.png',
      alt: 'MEXC Fee Overview page showing Spot Trading Fee 0% maker and 0%–0.05% taker, Futures Trading Fee 0% maker',
      width: 1440,
      height: 900,
      caption: `MEXC fee schedule — spot tab. Standard non-VIP rates: 0% maker / 0%–0.05% taker (most pairs 0.05%; 0.04% with MX discount). Captured ${offer.lastChecked} from <a href="https://www.mexc.com/fee" target="_blank" rel="noopener noreferrer nofollow">mexc.com/fee</a>.`,
      wide: true,
    },
    {
      src: '/media/exchanges/mexc/evidence/global-en/mexc-fee-futures-tab.png',
      alt: 'MEXC fee page futures tab showing BTC/USDT perpetual at 0% maker and 0.01% taker',
      width: 1440,
      height: 900,
      caption: `MEXC fee schedule — futures tab. BTCUSDT Perpetual: 0% maker / 0.01% taker. Captured ${offer.lastChecked}.`,
      wide: true,
    },
  ],

  // ─── Bonus levels ─────────────────────────────────────────────
  bonusLevelRows: [
    { task: 'Account registration',   requirement: `Create account with ${offer.promoCode}`,          rewardType: 'Welcome bonus',    notes: 'No KYC or deposit required for base tier' },
    { task: 'First deposit',          requirement: 'Make a qualifying deposit',                        rewardType: 'Deposit bonus',    notes: 'Scales with deposit amount' },
    { task: 'Futures trading',        requirement: 'Complete futures volume milestones',               rewardType: 'Trading vouchers', notes: 'Significant volume required for upper tiers' },
    { task: 'Activity Center tasks',  requirement: 'Complete bonus missions in Activity Center',       rewardType: 'Extra vouchers',   notes: 'Tasks rotate periodically' },
    { task: 'Volume milestones',      requirement: 'Meet cumulative deposit / trading thresholds',     rewardType: 'Tiered bonus',     notes: 'Up to 10,000 USDT across all tasks' },
  ],
  bonusExtraSections: [
    {
      h3: 'Getting the Most from Your New User Rewards',
      text: `For users who want to start quickly, the base signup reward is accessible with just an email or phone registration — no identity verification or deposit needed. For higher tiers, complete a first deposit and begin trading to unlock additional vouchers. After registering, check the MEXC Activity Center for any active tasks that apply to your account and region. Not all tasks will be available in every country.`,
    },
    {
      h3: 'Realistic Value for Most New Users',
      text: `${offer.realisticValue}. The full advertised maximum is not a guaranteed amount for every user. Complete your first task as soon as you register to lock in your base reward.`,
    },
  ],

  // ─── About ────────────────────────────────────────────────────
  aboutParagraphs: [
    `MEXC was founded in 2018 and is incorporated in the Seychelles. The exchange serves more than 10M+ registered users across a wide range of countries. MEXC is known for its extensive altcoin selection and its accessible onboarding — standard spot trading does not require identity verification, making it one of the few major exchanges with a genuine no-KYC option.`,
    `MEXC does not hold a primary exchange licence in major regulatory jurisdictions. Users should review their local regulations before registering. MEXC does not currently provide service to residents of North Korea, Cuba, Sudan, Iran, Mainland China, Singapore, the United States, the United Kingdom, Hong Kong, Russian-controlled regions of Ukraine, or Canada. This list of restricted regions may change — check the official MEXC Terms of Service for the current version.`,
  ],
  supportText: `MEXC provides customer support through live chat and a <a href="https://www.mexc.com/support" target="_blank" rel="noopener noreferrer nofollow">MEXC Support Centre</a>. For account-related queries, including bonus activation and withdrawal issues, live chat inside the platform is typically the fastest route to a response.`,

  // ─── Partner offer ────────────────────────────────────────────
  partnerOfferText: `Exact rewards — including welcome vouchers, deposit bonuses, and trading volume rewards — depend on MEXC's current terms, your region, deposit amounts, and trading activity. Always check the current offer on the official MEXC bonus page after creating your new account.`,

  // ─── Code search variations ───────────────────────────────────
  searchVariations: ['Welcome code', 'Promo code', 'Bonus code', 'Invite code', 'Share code'],

  // ─── Fee table ────────────────────────────────────────────────
  feeTableRows: [
    {
      market: 'Spot',
      maker: '0%',
      taker: '0.05%',
      statusCellHtml: `<td style="font-size:12px;"><span class="status-badge status-verified" style="font-size:10px;">Verified</span><div class="status-note">Confirmed on official fee page · June 2026 · range 0%–0.05%</div></td>`,
    },
    {
      market: 'Perpetual &amp; Futures',
      maker: '0%',
      taker: '0.01%',
      statusCellHtml: `<td style="font-size:12px;"><span class="status-badge status-verified" style="font-size:10px;">Verified</span><div class="status-note">BTC/USDT perpetual row confirms 0% / 0.01% · June 2026</div></td>`,
    },
  ],
  feeAfterNoteHtml: `<p class="p2-text" style="margin-top:10px;font-size:12px;color:#6B7280;">Last checked: ${offer.lastChecked} from the <a href="https://www.mexc.com/fee" target="_blank" rel="noopener noreferrer nofollow" style="color:#6B7280;">official MEXC fee page</a>.</p><p class="p2-text" style="margin-top:6px;font-size:12px;color:#9CA3AF;">Fees may vary by product, VIP level, region, account status and the current fee schedule. Always check the <a href="https://www.mexc.com/fee" target="_blank" rel="noopener noreferrer nofollow" style="color:#9CA3AF;">official MEXC fee page</a> before trading.</p>`,

  // ─── KYC & availability ───────────────────────────────────────
  kycAvailabilityParagraphs: [
    `MEXC does not require identity verification (KYC) to create an account, start trading, or access the base welcome bonus tier. Standard spot trading is available without submitting identification documents. No-KYC accounts can withdraw up to 10 BTC per day; completing KYC unlocks higher withdrawal limits and may be required for some deposit or bonus tasks.`,
    `The referral code <strong>${offer.promoCode}</strong> is available globally, but MEXC restricts access in a number of jurisdictions. MEXC does not currently provide service to residents of the United States (US), the United Kingdom (UK), Canada (CA), Singapore (SG), Hong Kong (HK), Mainland China (CN), North Korea (KP), Cuba (CU), Sudan (SD), or Iran (IR). This list may change — always check the official <a href="https://www.mexc.com/support/articles/360012110852" target="_blank" rel="noopener noreferrer nofollow">MEXC restricted regions page</a> before registering.`,
    `MEXC is incorporated in the Seychelles and does not hold a primary exchange licence in major regulatory jurisdictions such as the EU, UK, or US. Users in supported countries should review their local regulations before registering. Even in countries where MEXC is available, specific bonus tasks or reward tiers may be region-specific — the MEXC Activity Center shows which tasks are active after registration.`,
  ],

  // ─── Verification table ───────────────────────────────────────
  verificationIntroText: `The table below shows what CryptoBonusWorld has independently verified about the MEXC bonus offer linked to the code ${offer.promoCode}. Rows marked "Check in Activity Center" depend on individual account status and can only be confirmed after registration. The registration screenshot below was captured June 2026 via the official MEXC custom sign-up URL.`,
  verificationEvidence: {
    src: '/media/exchanges/mexc/evidence/global-en/mexc-registration-code-applied.png',
    alt: `MEXC custom sign-up page showing referral code ${offer.promoCode} pre-filled and 10,000 USDT new user offer on the right panel`,
    width: 1440,
    height: 900,
    caption: `Official MEXC sign-up page via the partner custom URL. Left panel: referral code <strong>${offer.promoCode}</strong> pre-filled. Right panel: "Sign Up to Claim 10,000 USDT". Captured ${offer.lastChecked}.`,
    wide: true,
  },
  verificationRows: [
    { area: `Sign-up with ${offer.promoCode}`,                  requirement: 'Referral code applied at registration via partner link',    rewardType: 'Welcome eligibility',             status: 'verified',       statusNote: `Registration screenshot shows ${offer.promoCode} pre-filled in referral code field · June 2026` },
    { area: 'Welcome rewards (up to 10,000 USDT)',              requirement: 'Open official MEXC bonus page via partner link',            rewardType: 'New user rewards',                status: 'verified',       statusNote: 'Registration right panel shows "Sign Up to Claim 10,000 USDT" · June 2026' },
    { area: 'No KYC for base tier',                             requirement: 'Email or phone registration only',                         rewardType: 'Base welcome reward',             status: 'public-preview', statusNote: `Official MEXC terms · ${offer.lastChecked} · account-level confirmation required` },
    { area: 'No deposit required (base tier)',                  requirement: 'Registration only — no deposit needed for initial reward',  rewardType: 'Signup reward',                   status: 'public-preview', statusNote: `Official MEXC terms · ${offer.lastChecked} · account-level confirmation required` },
    { area: 'Deposit tasks (higher tiers)',                     requirement: 'Deposit required; amount varies by tier',                  rewardType: 'Deposit bonus or coupon',         status: 'check-hub',      statusNote: 'Check exact tasks and amounts after sign-up.' },
    { area: 'Trading tasks',                                    requirement: 'Futures or spot trading volume may be required',           rewardType: 'Trading voucher or bonus',        status: 'check-hub',      statusNote: 'Check exact tasks after sign-up.' },
    { area: 'Claim period',                                     requirement: 'Rewards expire after a set period',                       rewardType: 'Manual claim required',           status: 'check-hub',      statusNote: 'Check deadlines and claim rules after sign-up.' },
  ],
  verificationAfterNote: `The Activity Center inside your MEXC account shows the exact tasks, deadlines and claim rules available to your account. Rewards depend on MEXC's current terms, your region, KYC status, deposit amount, trading activity and promotion period.`,

  // ─── FAQ ──────────────────────────────────────────────────────
  faqItems: [
    {
      question: 'Do I have to make a cryptocurrency deposit?',
      answer: `No deposit is required for the base signup reward. The initial MEXC welcome bonus can be claimed through email or phone registration alone — no identity verification or deposit is needed for the first reward tier. Larger deposit and trading bonuses do require you to fund your account. Check the MEXC Activity Center after registering to see which tasks and deposit tiers are active for your account and region.`,
    },
    {
      question: 'Can I get more than one MEXC bonus?',
      answer: `Yes — the MEXC new user bonus is structured as a series of separate tasks, each with its own reward. You can earn multiple rewards by registering, completing a first deposit, placing futures trades, and reaching volume milestones. The welcome package itself is a one-time offer for new accounts and cannot be repeated on the same account.`,
    },
    {
      question: 'What are the MEXC fees?',
      answer: `MEXC's standard spot trading fee is 0% for makers and 0.05% for takers. Perpetual futures fees are 0% for makers and 0.01% for takers. These are standard non-VIP rates. Always check the <a href="https://www.mexc.com/fee" target="_blank" rel="noopener noreferrer nofollow">official MEXC fee page</a> before trading as rates may change and vary by VIP level.`,
    },
    {
      question: 'Which currency are rewards paid in?',
      answer: `MEXC new user rewards are typically issued as USDT vouchers or trading coupons denominated in USDT. Specific reward formats — including any voucher conditions or conversion requirements — are shown inside the MEXC Activity Center for each task after registration.`,
    },
    {
      question: 'Can existing users use the referral code?',
      answer: `No. The MEXC referral code ${offer.promoCode} is for new users only and must be entered during account creation. It cannot be added to an existing MEXC account after registration is complete. If you already have an MEXC account, check the Activity Center inside your account for any ongoing promotions available to existing users.`,
    },
    {
      question: 'Is the MEXC bonus available in every country?',
      answer: `No. MEXC restricts service in a number of jurisdictions. Residents of North Korea, Cuba, Sudan, Iran, Mainland China, Singapore, the United States, the United Kingdom, Hong Kong, Russian-controlled regions of Ukraine, and Canada are not eligible. This list may change — always check the official MEXC Terms of Service for the current version. Even in supported countries, specific bonus tasks or amounts may differ by region and current promotion terms.`,
    },
    {
      question: `Why isn't the MEXC referral code working?`,
      answer: `Referral codes must be entered during account creation — they cannot be applied to an existing account. If you are registering for the first time and the code <strong>${offer.promoCode}</strong> is not accepted, check that you are using the official MEXC sign-up link (which pre-fills the code automatically). If entering the code manually, type it exactly as shown: <strong>${offer.promoCode}</strong>. Check that your country is not in the restricted list (US, UK, CA, SG, HK, CN and others). If the problem persists, contact MEXC support through live chat at <a href="https://www.mexc.com/support" target="_blank" rel="noopener noreferrer nofollow">mexc.com/support</a>.`,
    },
  ],

  // ─── Related exchanges ────────────────────────────────────────
  relatedExchanges: [
    { slug: 'bybit',  name: 'Bybit',  logo: '/logos/bybit.png',  bonus: 'Up to 30,000 USDT', tag: 'Derivatives leader', tileBg: '#F7F8FA', pageUrl: '/bybit/' },
    { slug: 'bitget', name: 'Bitget', logo: '/logos/bitget.png', bonus: 'Up to 6,200 USDT',  tag: 'Copy trading',      tileBg: '#ECFDF5', pageUrl: '/bitget/' },
    { slug: 'kucoin', name: 'KuCoin', logo: '/logos/kucoin.png', bonus: 'Welcome rewards',    tag: 'No KYC option',     tileBg: '#0A1628', pageUrl: '/kucoin/' },
    { slug: 'okx',    name: 'OKX',    logo: '/logos/okx.png',    bonus: 'Up to 5,000 USDT',  tag: 'CEX + Web3',        tileBg: '#F3F4F6', pageUrl: '/okx/' },
    { slug: 'bingx',  name: 'BingX',  logo: '/logos/bingx.png',  bonus: 'Welcome rewards',    tag: 'Copy trading',      tileBg: '#0B1D3A', pageUrl: '/bingx/' },
  ],
};
