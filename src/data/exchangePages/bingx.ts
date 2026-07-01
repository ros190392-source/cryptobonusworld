import type { ExchangePromoPageConfig } from './types';
import { getOffer } from '../offers';

// Owner-confirmed: displayed promo code is CRYPTOBW, canonical CTA route is /go/bingx/.
// Partner URL retains CRYPTOBONUSWORLD in its path for tracking — link-first framing throughout.
const offer = getOffer('bingx')!;

export const bingxConfig: ExchangePromoPageConfig = {
  // ─── Identity ────────────────────────────────────────────────
  slug: 'bingx',
  name: 'BingX',
  affiliateUrl: '/go/bingx/',
  officialDomain: 'bingx.com',
  supportUrl: 'https://bingx.com/en-us/support/',
  feeUrl: 'https://bingx.com/en-us/fee/',

  // ─── Media ───────────────────────────────────────────────────
  wordmarkImg: '/logos/bingx-wordmark.png',
  articleImg: '/media/exchanges/bingx/final/bingx-article-final-v1-1200x675-9b3f94eb.jpg',
  ogImage: '/media/exchanges/bingx/final/bingx-og-final-v1-1200x630-e08ccb64.jpg',
  heroBackgroundImg: '/media/hero-backgrounds/bingx-hero-custom-v1-b012814a.png',
  heroBackgroundPosition: 'center center',
  logoImg: '/logos/bingx.png',

  // ─── Commercial ──────────────────────────────────────────────
  promoCode: offer.promoCode,
  bonusMax: 11000,
  currency: 'USDT',
  rewardsAreaName: 'Activity Center',
  realisticValue: offer.realisticValue,
  lastChecked: offer.lastChecked,
  sourceUrl: offer.sourceUrl,

  // ─── Exchange facts ───────────────────────────────────────────
  founded: 2018,
  users: '10M+',
  headquarters: 'Singapore',

  // ─── Fees ─────────────────────────────────────────────────────
  fees: {
    spot:    { maker: '0.1%',  taker: '0.1%'   },
    futures: { maker: '0.02%', taker: '0.05%'  },
  },

  // ─── KYC ──────────────────────────────────────────────────────
  kycRequired: true,
  kycNote: 'Yes — identity verification required to unlock full bonus',

  // ─── Brand ────────────────────────────────────────────────────
  heroTokens: {
    bgFrom: '#0B1D3A',
    bgTo: '#060F22',
    accent: '#1B6AFF',
    codeColor: '#1455D4',
  },
  heroPromoLabel: 'REFERRAL CODE',
  logoVisualScale: 0.90,

  // ─── SEO meta ─────────────────────────────────────────────────
  canonicalUrl: 'https://cryptobonusworld.com/bingx/',
  pageTitle: `BingX Referral Code 2026: ${offer.promoCode} — Up to 11,000 USDT Welcome Package`,
  pageDescription: `BingX referral code ${offer.promoCode} — activate up to 11,000 USDT in new user welcome rewards. Social and copy trading platform. Verified ${offer.lastChecked}. Activate via the BingX partner link.`,
  ogTitle: `BingX Referral Code: ${offer.promoCode} — Claim Welcome Rewards`,
  ogDescription: `Use the BingX partner link with referral code ${offer.promoCode} to claim welcome rewards up to 11,000 USDT. Verified ${offer.lastChecked} by CryptoBonusWorld.`,
  seoPhraseLabel: 'BingX Referral Code Bonus',

  // ─── Intro paragraphs ─────────────────────────────────────────
  introParagraphs: [
    `Looking for a BingX referral code? Click the BingX partner link on this page — referral code <strong>${offer.promoCode}</strong> is pre-filled automatically in the BingX sign-up form, opening the new user welcome offer for eligible accounts.`,
    `The BingX welcome package is structured as a set of tasks inside the BingX Activity Center. New users who register via the partner link can access a regular welcome gift of 6,800+ USDT for all eligible sign-ups, plus 4,200+ USDT in referee-exclusive perks — bringing the advertised maximum to 11,000+ USDT. Rewards are task-based, mostly trading vouchers, and depend on KYC completion, deposit size, and trading activity. ${offer.realisticValue}.`,
    `This page covers what the BingX referral code does, how to activate it via the partner link, and what to realistically expect from the BingX welcome package. All information is based on publicly available details from the official BingX promotion page, verified ${offer.lastChecked}.`,
  ],

  // ─── How to claim ─────────────────────────────────────────────
  howToClaimSteps: [
    'Click the BingX partner link on this page to open the official BingX referral landing',
    `Referral code <strong>${offer.promoCode}</strong> is pre-filled automatically in the sign-up form`,
    'Complete your registration with email or phone number',
    'Complete KYC identity verification to unlock the full welcome package',
    'Make a qualifying deposit to unlock deposit-tier bonus tasks',
    'Check the BingX Activity Center inside your account for active tasks, deadlines, and claim rules.',
  ],

  // ─── Evidence ─────────────────────────────────────────────────
  evidenceRegistration: {
    src: '/screenshots/bingx/bonus_referral_landing/global-desktop-2026-06-v2.webp',
    alt: `BingX referral landing page showing welcome package up to 11,000 USDT for referees`,
    width: 1440,
    height: 900,
    caption: `BingX referral landing via partner link — shows 6,800+ USDT regular welcome gift plus 4,200+ USDT exclusive for referral sign-ups. Rewards are task-based; most users earn 50–250 USDT. Verified ${offer.lastChecked}.`,
  },

  // ─── Bonus levels ─────────────────────────────────────────────
  bonusLevelRows: [
    { task: 'Sign-up via partner link',    requirement: 'Register via the BingX referral link',             rewardType: 'Welcome eligibility',     notes: 'Referral code auto-applied via link' },
    { task: 'KYC verification',            requirement: 'Complete identity verification',                    rewardType: 'Bonus access',            notes: 'Required to unlock most reward tiers' },
    { task: 'First deposit',               requirement: 'Deposit 50 USDT or more',                          rewardType: 'Deposit bonus',            notes: 'Amount scales with deposit size' },
    { task: 'Copy trading trial',          requirement: 'Follow a trader and start copy trading',           rewardType: 'Copy trading voucher',     notes: 'BingX Activity Center task' },
    { task: 'Futures trading milestones',  requirement: 'Complete futures volume tasks within 30 days',     rewardType: 'Futures vouchers',         notes: 'Higher tiers require significant volume' },
  ],
  bonusExtraSections: [
    {
      h3: 'What to Expect for Most New Users',
      text: `${offer.realisticValue}. The 11,000+ USDT headline figure requires completing all Activity Center milestones — including large deposit tiers and high futures trading volumes — within 30 days of registration. Most rewards are issued as trading vouchers that reduce fees or offset futures margin; they are not withdrawable cash. After registering via the BingX partner link, check the Activity Center inside your account to see which tasks are active and available for your region.`,
    },
  ],

  // ─── About ────────────────────────────────────────────────────
  aboutParagraphs: [
    `BingX was founded in 2018 and is headquartered in Singapore. The exchange serves more than 10 million registered users globally and is particularly well-known for its social and copy trading features, which allow users to follow experienced traders and automatically replicate their positions. BingX has grown to list over 500 trading pairs across spot and perpetual futures markets.`,
    `BingX offers spot trading, perpetual futures (up to 150x leverage), copy trading, a P2P trading marketplace, and a range of earn products. The platform is designed with a beginner-friendly interface and provides dedicated tools for copy traders, including performance statistics and risk management settings. BingX restricts access for US residents. KYC is required to unlock withdrawal and full bonus eligibility.`,
  ],
  supportText: `BingX provides customer support via live chat on the platform and a dedicated <a href="https://bingx.com/en-us/support/" target="_blank" rel="noopener noreferrer nofollow">BingX Help Center</a>. For account-related issues including bonus queries and Activity Center tasks, the live chat route is typically the fastest way to reach a response.`,

  // ─── Partner offer ────────────────────────────────────────────
  partnerOfferText: `Exact rewards — including deposit bonuses, copy trading vouchers, futures task rewards, and Activity Center missions — depend on BingX's current terms, your region, KYC status, deposit amounts, and trading activity. Always check the current offer on the official BingX bonus page after creating your new account.`,

  // ─── Code search variations ───────────────────────────────────
  searchVariations: ['Welcome code', 'Referral code', 'Bonus code', 'Invite code', 'Copy trading code'],

  // ─── Fee table ────────────────────────────────────────────────
  feeTableRows: [
    {
      market: 'Spot',
      maker: '0.1%',
      taker: '0.1%',
      statusCellHtml: `<td style="color:#16A34A;font-size:12px;">✅ Official BingX fee page · ${offer.lastChecked}</td>`,
    },
    {
      market: 'Perpetual &amp; Futures',
      maker: '0.02%',
      taker: '0.05%',
      statusCellHtml: `<td style="color:#16A34A;font-size:12px;">✅ Official BingX fee page · ${offer.lastChecked}</td>`,
    },
  ],
  feeAfterNoteHtml: `<p class="p2-text" style="margin-top:10px;font-size:12px;color:#6B7280;">Last checked: ${offer.lastChecked} from the <a href="https://bingx.com/en-us/fee/" target="_blank" rel="noopener noreferrer nofollow" style="color:#6B7280;">official BingX fee page</a>. Always verify the latest fee schedule on the official BingX website before trading.</p>`,

  // ─── KYC & availability ───────────────────────────────────────
  kycAvailabilityParagraphs: [
    `BingX requires identity verification (KYC) to unlock the full welcome bonus and to withdraw funds. Basic registration is possible without KYC, but most Activity Center bonus tiers — including deposit bonuses and futures rewards — require completed identity verification. KYC involves submitting a government-issued ID and completing a facial recognition check.`,
    `The BingX welcome offer accessible via the partner link on this page is available globally to eligible new users. BingX restricts access for US residents. Additional country-specific restrictions may apply — always verify on the official <a href="https://bingx.com/en-us/about/terms-of-use/" target="_blank" rel="noopener noreferrer nofollow">BingX Terms of Use</a> before registering. Bonus tasks and reward amounts may vary by country.`,
    `Even in countries where BingX is available, specific bonus tasks or reward amounts may differ by region. After registering via the partner link, the Activity Center inside your BingX account shows which tasks are active and applicable for your location.`,
  ],

  // ─── Verification table ───────────────────────────────────────
  verificationIntroText: `The table below shows what CryptoBonusWorld has independently verified about the BingX welcome offer accessible via the partner link. Rows marked "Check in Activity Center" depend on individual account status and require verification inside your BingX account after registration.`,
  verificationEvidence: {
    src: '/screenshots/bingx/bonus_referral_landing/global-desktop-2026-06-v2.webp',
    alt: 'BingX referral landing page showing 6,800+ USDT regular welcome gift and 11,000+ USDT exclusive for referees',
    width: 1440,
    height: 900,
    caption: `BingX referral landing via partner link. Regular welcome gift of 6,800+ USDT available to all eligible new users; 11,000+ USDT offer exclusive for referee sign-ups (4,200+ USDT extra). Rewards are task-based vouchers. Captured ${offer.lastChecked}.`,
    wide: true,
  },
  verificationRows: [
    { area: 'Referral landing via partner link', requirement: 'Referral code applied automatically via link',           rewardType: 'Welcome eligibility',              status: 'verified',       statusNote: `Referral landing screenshot · ${offer.lastChecked}` },
    { area: '11,000+ USDT advertised',           requirement: 'Open official BingX partner landing page',              rewardType: '6,800+ regular + 4,200+ referee',  status: 'verified',       statusNote: `Live referral landing captured · ${offer.lastChecked}` },
    { area: 'KYC required',                      requirement: 'Identity verification required for full bonus',         rewardType: 'Bonus access',                     status: 'verified',       statusNote: `Official BingX KYC policy · ${offer.lastChecked}` },
    { area: 'Deposit required',                  requirement: 'Qualifying deposit required for tier rewards',          rewardType: 'Deposit bonus tasks',              status: 'public-preview', statusNote: 'Deposit tiers confirmed on landing; exact amounts check Activity Center.' },
    { area: 'Copy trading tasks',                requirement: 'Start copy trading to unlock Activity Center tasks',    rewardType: 'Copy trading voucher',             status: 'check-hub',      statusNote: 'Check exact tasks after sign-up.' },
    { area: 'Futures volume tasks',              requirement: 'Futures trading volume required for upper tiers',       rewardType: 'Futures vouchers',                 status: 'check-hub',      statusNote: 'Check exact tasks after sign-up.' },
    { area: 'Claim period',                      requirement: 'Tasks must be completed within 30 days',               rewardType: 'Manual claim required',            status: 'check-hub',      statusNote: 'Check exact tasks after sign-up.' },
  ],
  verificationAfterNote: `The Activity Center inside your BingX account shows the exact tasks, deadlines, and claim rules. Reward amounts vary by country, KYC status, deposit size, trading activity, and promotion period. Rewards are issued as trading vouchers and are not directly withdrawable as cash.`,

  // ─── FAQ ──────────────────────────────────────────────────────
  faqItems: [
    {
      question: 'Do I need to manually enter the BingX referral code?',
      answer: `No manual entry is required if you use the partner link on this page. When you click the BingX partner link, referral code <strong>${offer.promoCode}</strong> is pre-filled automatically in the registration form. If you are registering directly on bingx.com without using our link, you can enter the code manually during sign-up.`,
    },
    {
      question: 'How much can I realistically earn from the BingX welcome bonus?',
      answer: `${offer.realisticValue}. The advertised 11,000+ USDT total requires completing every Activity Center milestone — including high-volume deposit and futures tasks — within 30 days. Most rewards are trading vouchers that reduce fees; they cannot be withdrawn directly as cash. Check the BingX Activity Center after registration to see which tasks are active for your account and region.`,
    },
    {
      question: 'Is BingX good for copy trading?',
      answer: 'Yes. BingX is recognised as one of the leading copy trading platforms. It lets you follow experienced traders and automatically replicate their positions with a minimum starting amount. The platform shows each copy trader\'s performance history, risk score, and fee structure before you commit. BingX also includes dedicated Activity Center tasks tied to copy trading that can unlock additional rewards for new users.',
    },
    {
      question: 'Does BingX require KYC to claim the bonus?',
      answer: 'Yes. KYC identity verification is required to unlock most BingX Activity Center bonus tiers, including deposit bonuses and futures trading rewards. Basic sign-up is possible without KYC, but you must complete identity verification to access the full welcome package. KYC involves submitting a government-issued ID and a facial recognition check.',
    },
    {
      question: 'What are BingX trading fees?',
      answer: `BingX's standard spot trading fee is 0.1% for both makers and takers. Perpetual futures fees are 0.02% for makers and 0.05% for takers. Up to 150x leverage is available on perpetual contracts. Some welcome package tasks may include fee-discount vouchers — check the Activity Center after registering to see whether any are available for your account.`,
    },
    {
      question: 'Is BingX available in my country?',
      answer: 'BingX is available globally but restricts access for US residents. Additional country-specific restrictions may apply. Always check the official BingX Terms of Use for your region before registering. Bonus task availability may also vary by country — the Activity Center shows which tasks are active for your location after sign-up.',
    },
    {
      question: 'When do the BingX welcome bonus tasks expire?',
      answer: 'BingX Activity Center welcome tasks must typically be completed within 30 days of account registration. Tasks include KYC completion, qualifying deposits, copy trading activity, and futures trading volume milestones. Any tasks not completed within the window expire — check the Activity Center immediately after registering to see your active deadlines.',
    },
  ],

  // ─── Related exchanges ────────────────────────────────────────
  relatedExchanges: [
    { slug: 'bybit',  name: 'Bybit',  logo: '/logos/bybit.png',  bonus: 'Up to 30,000 USDT', tag: 'Top derivatives',  tileBg: '#1A1F2E', pageUrl: '/bybit/'  },
    { slug: 'mexc',   name: 'MEXC',   logo: '/logos/mexc.png',   bonus: 'Up to 10,000 USDT', tag: 'No KYC option',   tileBg: '#F5F3FF', pageUrl: '/mexc/'   },
    { slug: 'kucoin', name: 'KuCoin', logo: '/logos/kucoin.png', bonus: 'Welcome rewards',    tag: 'No KYC option',   tileBg: '#0A1628', pageUrl: '/kucoin/' },
    { slug: 'bitget', name: 'Bitget', logo: '/logos/bitget.png', bonus: 'Up to 6,200 USDT',  tag: 'Copy trading',    tileBg: '#ECFDF5', pageUrl: '/bitget/' },
  ],
};
