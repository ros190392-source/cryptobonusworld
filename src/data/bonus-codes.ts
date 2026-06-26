/**
 * Bonus code data for /bonus-codes/[exchange]/ pages.
 *
 * Schema:
 *  - PromoCode: individual code with region, expiry, verification status
 *  - BonusCodeEntry: per-exchange page data including codes, CTA, trust info
 *
 * URL pattern: /bonus-codes/[exchange-slug]/
 * e.g. /bonus-codes/bybit/, /bonus-codes/mexc/
 *
 * The exchange slug MUST match an entry in exchanges.json.
 */

export type CodeRegion = 'global' | string; // country slug or 'global'

export interface PromoCode {
  code: string;
  region: CodeRegion;
  description: string;
  /** ISO date string — null or omitted = no known expiry */
  expiresAt?: string | null;
  /** Whether this code was manually verified working as of verifiedAt */
  verified: boolean;
  verifiedAt?: string;
  /** Deprecated codes still shown for historical accuracy */
  deprecated?: boolean;
}

export interface BonusCodeEntry {
  /** Must match exchange slug in exchanges.json */
  exchangeSlug: string;
  seoTitle: string;
  metaDesc: string;
  heading: string;
  intro: string;

  /** How to use — displayed as numbered steps */
  howToUse: string[];

  codes: PromoCode[];

  /** Affiliate link for this exchange (CTA target) */
  affiliateUrl: string;

  /** Bonus amount details */
  bonusAmount: number;
  bonusCurrency: string;
  bonusNote: string;

  /** Trust / verification */
  verifiedAt: string;
  termsUrl?: string;

  /** Region restrictions note */
  regionNote?: string;

  /** Expiry note */
  expiryNote?: string;

  /** FAQ */
  faq: { question: string; answer: string }[];

  priority: 'very-high' | 'high' | 'medium';
}

export const BONUS_CODES: BonusCodeEntry[] = [
  {
    exchangeSlug: 'bybit',
    seoTitle: 'Bybit Bonus Code 2026: Up to 30,000 USDT (Working Codes)',
    metaDesc: 'Use the latest Bybit bonus code to claim up to 30,000 USDT in welcome rewards. Working referral codes verified May 2026.',
    heading: 'Bybit Bonus Code 2026: Claim Up to 30,000 USDT',
    intro: 'Bybit offers one of the largest crypto welcome bonuses — up to 30,000 USDT distributed across registration, deposit and trading volume milestones. Using a verified bonus code during sign-up activates the full bonus package.',
    howToUse: [
      'Click the claim link on this page to open Bybit\'s registration page',
      'Enter your email and create a password',
      'Enter bonus code CRYPTOBONUSW in the referral/bonus code field',
      'Complete email verification',
      'Complete KYC identity verification (required for full bonus access)',
      'Make a qualifying deposit (minimum $100 USDT)',
      'Complete bonus tasks in the Bybit Rewards Hub',
    ],
    codes: [
      {
        code: 'CRYPTOBONUSW',
        region: 'global',
        description: 'Main referral + bonus activation code — applies full 30,000 USDT package',
        verified: true,
        verifiedAt: '2026-05-20',
        expiresAt: null,
      },
    ],
    affiliateUrl: 'https://partner.bybit.com/b/CRYPTOBONUSW',
    bonusAmount: 30000,
    bonusCurrency: 'USDT',
    bonusNote: 'Maximum bonus requires KYC verification, a minimum $100 deposit, and completion of tiered futures trading volume milestones. Bonus is distributed as trading vouchers — profits are withdrawable.',
    verifiedAt: '2026-05-20',
    termsUrl: 'https://www.bybit.com/en/promo/global/welcome-gifts/?affiliate_id=75062',
    regionNote: 'Not available for users in the US, UK or Canada.',
    expiryNote: 'Bonus vouchers expire 30 days after issuance. Complete tasks within the window.',
    faq: [
      {
        question: 'What is the latest Bybit bonus code?',
        answer: 'The working Bybit bonus code for 2026 is CRYPTOBONUSW. Enter it during registration to activate up to 30,000 USDT in welcome bonuses across multiple task tiers.',
      },
      {
        question: 'Does the Bybit bonus code expire?',
        answer: 'The referral code CRYPTOBONUSW does not expire. However, individual bonus vouchers awarded after completing tasks expire 30 days after issuance.',
      },
      {
        question: 'Do I need KYC to use the Bybit bonus code?',
        answer: 'KYC is required to unlock the full bonus package. You can register and enter the bonus code without KYC, but most bonus tiers require identity verification and a minimum $100 deposit.',
      },
      {
        question: 'Can I enter the Bybit bonus code after registration?',
        answer: 'No — Bybit bonus codes must be entered during the initial registration. You cannot apply a referral code to an existing account.',
      },
    ],
    priority: 'very-high',
  },

  {
    exchangeSlug: 'mexc',
    seoTitle: 'MEXC Bonus Code 2026: Up to 10,000 USDT No-KYC',
    metaDesc: 'Use MEXC referral code mexc-CryptoBonus to claim up to 10,000 USDT. No KYC required. Working codes verified May 2026.',
    heading: 'MEXC Bonus Code 2026: Claim Up to 10,000 USDT (No KYC)',
    intro: 'MEXC offers a no-KYC welcome bonus of up to 10,000 USDT for new users who register through a referral link or enter a bonus code. No minimum deposit is required for the initial signup reward.',
    howToUse: [
      'Click the claim link on this page to open MEXC registration',
      'Enter your email or mobile number',
      'Enter referral code mexc-CryptoBonus if not pre-filled',
      'Complete email verification',
      'Start trading — no KYC required for basic bonus tiers',
      'Deposit and trade to unlock higher bonus tiers',
    ],
    codes: [
      {
        code: 'mexc-CryptoBonus',
        region: 'global',
        description: 'Main referral code — activates MEXC new user bonus package',
        verified: true,
        verifiedAt: '2026-05-20',
        expiresAt: null,
      },
    ],
    affiliateUrl: 'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus',
    bonusAmount: 10000,
    bonusCurrency: 'USDT',
    bonusNote: 'Initial 10 USDT requires no KYC or deposit. Higher tiers require spot or futures trading volume. Maximum 10,000 USDT across all milestones.',
    verifiedAt: '2026-05-27',
    termsUrl: 'https://www.mexc.com/activity/new-user',
    expiryNote: 'Signup tasks must be completed within 30 days of registration.',
    faq: [
      {
        question: 'What is the MEXC bonus code for 2026?',
        answer: 'The working MEXC bonus code for 2026 is mexc-CryptoBonus. Enter it during registration to activate up to 10,000 USDT in new user bonuses — no identity verification required for base tiers.',
      },
      {
        question: 'Can I claim the MEXC bonus without KYC?',
        answer: 'Yes. The initial MEXC signup bonus (10 USDT) requires no KYC. Higher tiers (up to 10,000 USDT total) require trading volume but not identity verification.',
      },
      {
        question: 'Is the MEXC referral code different from a bonus code?',
        answer: 'On MEXC, the referral code and bonus code serve the same purpose — they activate the new user bonus package. mexc-CryptoBonus is both a referral and bonus code.',
      },
    ],
    priority: 'very-high',
  },

  {
    exchangeSlug: 'okx',
    seoTitle: 'OKX Bonus Code 2026: Up to 5,000 USDT Welcome Bonus',
    metaDesc: 'Claim the OKX signup bonus — up to 5,000 USDT welcome package. Use our verified affiliate link for full bonus activation.',
    heading: 'OKX Bonus Code 2026: Claim Up to 5,000 USDT',
    intro: 'OKX offers a welcome bonus package worth up to 5,000 USDT for new users who sign up through a referral link. The bonus is distributed across spot and futures trading task completions.',
    howToUse: [
      'Click the claim link on this page — the bonus is activated via the affiliate link',
      'Register with your email address',
      'Complete KYC identity verification',
      'Make a qualifying deposit (minimum $50)',
      'Complete the new user tasks in the OKX Bonus Center',
    ],
    codes: [],
    affiliateUrl: 'https://okx.com/join/CRYPTOBONUSW',
    bonusAmount: 5000,
    bonusCurrency: 'USDT',
    bonusNote: 'OKX bonus is primarily link-activated (no code needed — the affiliate link carries the bonus attribution). KYC and minimum $50 deposit required.',
    verifiedAt: '2026-05-20',
    termsUrl: 'https://www.okx.com/activities/welcome-bonus',
    regionNote: 'Not available for US residents.',
    faq: [
      {
        question: 'Does OKX require a bonus code?',
        answer: 'OKX activates bonuses primarily through the referral/affiliate link rather than a separate code. Clicking our link automatically applies the bonus attribution to your new account.',
      },
      {
        question: 'How much is the OKX welcome bonus?',
        answer: 'OKX offers up to 5,000 USDT in new user rewards, distributed across multiple task milestones including first deposit and trading volume completions.',
      },
    ],
    priority: 'high',
  },

  {
    exchangeSlug: 'binance',
    seoTitle: 'Binance Bonus Code 2026: Up to 19,800 USDT Welcome Bonus',
    metaDesc: 'Use Binance referral code CRYPTOBONW to claim up to 19,800 USDT in new user rewards. Verified June 2026.',
    heading: 'Binance Referral Code 2026: Get Up to 19,800 USDT',
    intro: 'Binance upgraded its welcome offer in May 2026: new users who register through a referral code can now unlock up to 19,800 USDT in rewards — a registration reward, a deposit bonus and tiered trading-volume vouchers. Most users earn 50–200 USDT; the full amount requires very high trading volume (spot or futures).',
    howToUse: [
      'Click the claim link on this page',
      'Enter your email and create a password',
      'Enter referral code CRYPTOBONW if prompted',
      'Complete identity verification (KYC)',
      'Make a qualifying deposit',
      'Complete new user tasks in the Binance Rewards Hub',
    ],
    codes: [
      {
        code: 'CRYPTOBONW',
        region: 'global',
        description: 'Binance referral code — activates new user welcome bonus',
        verified: true,
        verifiedAt: '2026-05-20',
        expiresAt: null,
      },
    ],
    affiliateUrl: 'https://www.binance.com/en/activity/referral-entry?ref=CRYPTOBONW',
    bonusAmount: 19800,
    bonusCurrency: 'USDT',
    bonusNote: 'Up to 19,800 USDT across registration, deposit and futures milestones (mostly vouchers; top tiers need high trading volume). Beyond the bonus, Binance offers the largest trading ecosystem, lowest fees, and strongest regulatory compliance.',
    verifiedAt: '2026-06-11',
    termsUrl: 'https://www.binance.com/en/activity/referral-entry',
    regionNote: 'Not available for US residents (Binance.US is a separate platform).',
    faq: [
      {
        question: 'What is the Binance referral code for 2026?',
        answer: 'The working Binance referral code for 2026 is CRYPTOBONW. Enter it during registration to activate up to 19,800 USDT in new user rewards (offer upgraded in May 2026).',
      },
      {
        question: 'Is Binance available in my country?',
        answer: 'Binance.com is available in most countries except the US. US residents should use Binance.US, which has a separate bonus program.',
      },
    ],
    priority: 'very-high',
  },

  {
    exchangeSlug: 'bitget',
    seoTitle: 'Bitget Bonus Code 2026: Up to 6,200 USDT Welcome Package',
    metaDesc: 'Claim the Bitget welcome bonus — up to 6,200 USDT for new traders and copy trading followers. Verified May 2026.',
    heading: 'Bitget Bonus Code 2026: Claim Up to 6,200 USDT',
    intro: 'Bitget offers a strong welcome package for new users, particularly those interested in copy trading and futures. The bonus is distributed across registration, deposit and trading milestones.',
    howToUse: [
      'Click the claim link on this page',
      'Register with your email',
      'Complete KYC verification',
      'Make a qualifying deposit ($100 minimum for full bonus)',
      'Complete tasks in the Bitget Reward Center',
    ],
    codes: [],
    affiliateUrl: 'https://partner.bitget.com/bg/cryptobonusworld',
    bonusAmount: 6200,
    bonusCurrency: 'USDT',
    bonusNote: 'Maximum bonus requires KYC, a minimum $100 deposit, and trading volume milestones. Copy trading sign-ups receive additional rewards.',
    verifiedAt: '2026-05-20',
    termsUrl: 'https://www.bitget.com/en/events/welcome',
    faq: [
      {
        question: 'Does Bitget require a bonus code?',
        answer: 'Bitget primarily activates bonuses through the referral link. No separate code is required — clicking our link attributes the bonus to your new account automatically.',
      },
      {
        question: 'Is Bitget good for beginners?',
        answer: 'Yes. Bitget has a beginner-friendly interface and is particularly strong for copy trading — letting new users follow experienced traders automatically.',
      },
    ],
    priority: 'high',
  },

  {
    exchangeSlug: 'kucoin',
    seoTitle: 'KuCoin Bonus Code 2026: Up to 500 USDT No-KYC',
    metaDesc: 'Use KuCoin referral code CRYPTOBONW to claim up to 500 USDT in welcome rewards. Optional KYC — start trading instantly.',
    heading: 'KuCoin Referral Code 2026: Claim Up to 500 USDT',
    intro: 'KuCoin is known as "The People\'s Exchange" for its wide altcoin selection and optional KYC policy. New users can claim up to 500 USDT in welcome rewards without completing identity verification. Note: KuCoin does not display a fixed bonus amount on the referral landing — your rewards are revealed in the Rewards Hub right after you create the account.',
    howToUse: [
      'Click the claim link on this page',
      'Register with your email',
      'KYC is optional — skip if you prefer no-KYC trading',
      'Complete signup tasks in the KuCoin Bonus Center',
      'Deposit to unlock higher bonus tiers',
    ],
    codes: [],
    affiliateUrl: 'https://www.kucoin.com/r/af/CRYPTOBONW',
    bonusAmount: 500,
    bonusCurrency: 'USDT',
    bonusNote: 'Base tiers require no KYC. Higher bonus tiers require deposit and trading volume. KYC is optional but increases daily withdrawal limits.',
    verifiedAt: '2026-06-11',
    termsUrl: 'https://www.kucoin.com/news/activity',
    faq: [
      {
        question: 'Can I get the KuCoin bonus without KYC?',
        answer: 'Yes. KuCoin\'s base bonus tiers are accessible without identity verification. You need only an email to register and start trading. The maximum 500 USDT reward requires deposit and trading volume milestones.',
      },
      {
        question: 'Why doesn\'t the KuCoin referral page show a bonus amount?',
        answer: 'KuCoin intentionally hides the exact reward on the referral landing — you see a "Create Account & Claim Rewards" button instead of a number. Your actual rewards (vouchers and task bonuses, up to 500 USDT) are revealed in the Rewards Hub immediately after registration with code CRYPTOBONW.',
      },
    ],
    priority: 'high',
  },

  // ── Phase 4 additions ──────────────────────────────────────────────────────

  {
    exchangeSlug: 'bingx',
    seoTitle: 'BingX Bonus Code 2026: Up to 11,000 USDT Welcome Package',
    metaDesc: 'Claim the BingX welcome package — up to 11,000 USDT for referral sign-ups. Copy trading platform with easy activation. Verified June 2026.',
    heading: 'BingX Bonus Code 2026: Claim Up to 11,000 USDT',
    intro: 'BingX is a social trading and copy trading platform with a strong focus on user experience. New users registering through a referral link can claim up to 11,000 USDT: a regular welcome gift of 6,800+ USDT in Rewards Hub tasks plus 4,200+ USDT in referee-exclusive perks (the referral landing states "11,000+ USDT — Exclusive for referees").',
    howToUse: [
      'Click the claim link on this page to open BingX registration',
      'Register with your email or phone number',
      'Enter referral code CRYPTOBW if prompted during registration',
      'Complete email or phone verification',
      'Complete KYC identity verification to unlock full bonus',
      'Make a qualifying deposit and start trading',
      'Complete new user tasks in the BingX Activity Center',
    ],
    codes: [
      {
        code: 'CRYPTOBW',
        region: 'global',
        description: 'BingX referral code — activates the new user welcome bonus package',
        verified: true,
        verifiedAt: '2026-05-24',
        expiresAt: null,
      },
    ],
    affiliateUrl: 'https://bingxdao.com/partner/CRYPTOBONUSWORLD/',
    bonusAmount: 11000,
    bonusCurrency: 'USDT',
    bonusNote: 'Maximum 11,000 USDT (6,800+ regular gift + 4,200+ referee-exclusive perks) requires referral sign-up, KYC verification, qualifying deposit, and completion of futures trading milestones with very high volume. Rewards are distributed mostly as trading vouchers; tasks vary by region.',
    verifiedAt: '2026-06-11',
    termsUrl: 'https://bingx.com/en-us/activity/new-user/',
    regionNote: 'Not available for US residents. Check BingX terms for your specific country.',
    expiryNote: 'New user bonus tasks must be completed within 30 days of registration.',
    faq: [
      {
        question: 'What is the BingX referral code for 2026?',
        answer: 'The working BingX referral code for 2026 is CRYPTOBW. Enter it during registration to activate up to 11,000 USDT in welcome rewards — including 4,200+ USDT in perks exclusive to referral sign-ups.',
      },
      {
        question: 'Does BingX require a bonus code or just a referral link?',
        answer: 'BingX bonus can be activated via either the referral link (recommended — click the claim button on this page) or by entering the code CRYPTOBW manually during registration. The link is the easiest method.',
      },
      {
        question: 'Is BingX good for copy trading?',
        answer: 'Yes. BingX is one of the top copy trading platforms in 2026. It lets you follow experienced traders with as little as $100, with transparent performance statistics and auto-replication of trades.',
      },
      {
        question: 'Do I need KYC to get the BingX bonus?',
        answer: 'KYC is required to unlock the full BingX bonus. Basic registration is possible without KYC, but most bonus tiers require identity verification and a qualifying deposit.',
      },
    ],
    priority: 'high',
  },

  {
    exchangeSlug: 'gate-io',
    seoTitle: 'Gate.io Bonus Code 2026: Up to 10,000 USDT Welcome Package',
    metaDesc: 'Claim the Gate.io signup bonus — up to 10,000 USDT for new users. 1,700+ coins, no-KYC tiers available.',
    heading: 'Gate.io Bonus Code 2026: Claim Up to 10,000 USDT',
    intro: 'Gate.io is one of the largest altcoin exchanges with over 1,700 listed coins. New users can claim up to 10,000 USDT in welcome rewards — a 50 USDT sign-up task package plus deposit and trading tasks (the referral landing advertises "10,000+ USDT"). Gate.io is popular among altcoin traders looking for early coin listings.',
    howToUse: [
      'Click the claim link on this page to open the Gate referral landing',
      'The referral code BONUSCBW is embedded in the link — no manual entry needed',
      'Register with your email address and verify it',
      'Optionally complete KYC for higher withdrawal limits',
      'Complete beginner tasks (Sign Up reward 50 USDT, package worth 135 USDT)',
      'Complete net deposit and trading tasks to unlock higher reward tiers',
    ],
    codes: [
      {
        code: 'BONUSCBW',
        region: 'global',
        description: 'Gate referral code — embedded in the /share/ link, activates the new user rewards package',
        verified: true,
        verifiedAt: '2026-06-11',
        expiresAt: null,
      },
    ],
    affiliateUrl: 'https://www.gate.com/share/BONUSCBW',
    bonusAmount: 10000,
    bonusCurrency: 'USDT',
    bonusNote: 'Maximum 10,000 USDT requires KYC, qualifying net deposit, and trading volume milestones (sign-up tasks alone are worth about 50–135 USDT). Some initial tiers are accessible without KYC.',
    verifiedAt: '2026-06-11',
    termsUrl: 'https://www.gate.io/en/activity/new-user',
    regionNote: 'Not available for US residents. Gate.io is restricted in some jurisdictions — check country availability.',
    expiryNote: 'New user tasks must be completed within 30 days of registration.',
    faq: [
      {
        question: 'What is the Gate.io referral code for 2026?',
        answer: 'The working Gate referral code for 2026 is BONUSCBW. It is embedded in our referral link (gate.com/share/BONUSCBW) and applied automatically — registering through the link unlocks up to 10,000 USDT in new user welcome rewards.',
      },
      {
        question: 'Can I get the Gate.io bonus without KYC?',
        answer: 'Initial Gate.io bonus tiers (signup reward) are accessible without KYC. Higher tiers require identity verification and a qualifying deposit.',
      },
      {
        question: 'Why is Gate.io popular for altcoins?',
        answer: 'Gate.io lists 1,700+ cryptocurrencies including many early-stage projects not yet available on Binance or Bybit. It is a go-to exchange for altcoin traders looking to find projects before they reach larger exchanges.',
      },
      {
        question: 'Is Gate.io safe?',
        answer: 'Gate.io has been operating since 2013 with no major security incidents. It holds user funds in cold storage and publishes proof-of-reserves data. As with all exchanges, only keep funds you are actively trading on the platform.',
      },
    ],
    priority: 'high',
  },

  {
    exchangeSlug: 'htx',
    seoTitle: 'HTX Bonus Code 2026: Up to 1,500 USDT Welcome Bonus (Huobi)',
    metaDesc: 'Claim the HTX (formerly Huobi) signup bonus — up to 1,500 USDT for new users. Working referral codes for 2026.',
    heading: 'HTX Bonus Code 2026: Claim Up to 1,500 USDT (Formerly Huobi)',
    intro: 'HTX (formerly known as Huobi) is one of the longest-running crypto exchanges, established in 2013. After rebranding to HTX in 2023, it offers new users a welcome bonus of up to 1,500 USDT through referral links and bonus codes.',
    howToUse: [
      'Click the claim link on this page to open HTX registration',
      'Register with your email address',
      'Enter referral code CryptoBW during registration if prompted',
      'Complete email verification',
      'Complete KYC identity verification',
      'Make a qualifying deposit',
      'Complete new user tasks in the HTX Activity Centre',
    ],
    codes: [
      {
        code: 'CryptoBW',
        region: 'global',
        description: 'HTX referral code — activates new user welcome bonus package',
        verified: true,
        verifiedAt: '2026-06-11',
        expiresAt: null,
      },
    ],
    affiliateUrl: 'https://www.htx.com/invite/en-us/1f?invite_code=CryptoBW',
    bonusAmount: 1500,
    bonusCurrency: 'USDT',
    bonusNote: 'Maximum 1,500 USDT requires KYC, a qualifying deposit, and completion of spot and futures trading milestones. Bonus distributed as trading vouchers with 30-day expiry.',
    verifiedAt: '2026-05-24',
    termsUrl: 'https://www.htx.com/en-us/activity/new-user-rewards/',
    regionNote: 'Not available for US residents. HTX has regional restrictions — verify your country before registering.',
    expiryNote: 'New user bonus tasks expire 30 days after registration.',
    faq: [
      {
        question: 'What is the HTX referral code for 2026?',
        answer: 'The working HTX (formerly Huobi) referral code for 2026 is CryptoBW. Enter it during registration to activate up to 1,500 USDT in welcome bonuses.',
      },
      {
        question: 'Is HTX the same as Huobi?',
        answer: 'Yes. HTX is the rebranded name of Huobi Global, which rebranded in September 2023. HTX is one of the oldest crypto exchanges, having launched in 2013. The platform, team, and infrastructure are the same.',
      },
      {
        question: 'Does HTX require KYC?',
        answer: 'KYC is required to unlock the full HTX bonus and for higher withdrawal limits. Basic registration can be done without KYC for limited account access.',
      },
      {
        question: 'Is HTX safe to use?',
        answer: 'HTX has been operating since 2013 and is one of the most established exchanges in crypto. It has experienced no major hacks to date and holds assets in cold storage. As with all exchanges, practise good security habits and only hold actively traded amounts on the platform.',
      },
    ],
    priority: 'high',
  },

  {
    exchangeSlug: 'coinbase',
    seoTitle: 'Coinbase Bonus Code 2026: Get $10 in Bitcoin (New Users)',
    metaDesc: 'Claim the Coinbase signup bonus — get $10 in Bitcoin for new users. FCA and MiCA regulated. Verified for US, UK and EU users. May 2026.',
    heading: 'Coinbase Referral Code 2026: Get $10 in Bitcoin',
    intro: 'Coinbase is the most trusted and regulated crypto exchange in the US, UK, and EU — NASDAQ-listed, FCA-registered, and MiCA-compliant. New users who sign up through a referral link receive $10 in Bitcoin after completing their first qualifying trade of $100 or more.',
    howToUse: [
      'Click the claim link on this page to open Coinbase registration',
      'Register with your email address',
      'Complete identity verification (KYC required)',
      'Add a payment method (bank account, debit card, or PayPal)',
      'Make your first qualifying trade or purchase of $100 or more',
      '$10 in Bitcoin is credited to your account automatically',
    ],
    codes: [],
    affiliateUrl: 'https://www.coinbase.com/',
    bonusAmount: 10,
    bonusCurrency: 'USD',
    bonusNote: 'Fixed $10 in BTC credited after first qualifying trade of $100+. KYC mandatory. No further trading milestones — straightforward single-step bonus.',
    verifiedAt: '2026-05-24',
    termsUrl: 'https://www.coinbase.com/legal/referral',
    regionNote: 'Available for users in the US, UK, EU, Canada, and Australia. Not available in Nigeria, Indonesia, Vietnam, Philippines, and Turkey.',
    faq: [
      {
        question: 'How do I get the Coinbase $10 Bitcoin bonus?',
        answer: 'Sign up for Coinbase through our referral link, complete identity verification (KYC), then make your first qualifying purchase or trade of $100 or more. Coinbase will automatically credit $10 in Bitcoin to your account.',
      },
      {
        question: 'Does Coinbase have a referral code?',
        answer: 'Coinbase primarily activates bonuses through the referral link rather than a separate code. Click the claim button on this page — the bonus attribution is embedded in the link automatically.',
      },
      {
        question: 'Is the Coinbase bonus available in the UK and EU?',
        answer: 'Yes. Coinbase is FCA-registered for UK users and MiCA-compliant for EU users. The $10 BTC signup bonus is available to eligible users in the UK, Germany, France, Netherlands, Spain, and most other EU countries.',
      },
      {
        question: 'Why is the Coinbase bonus smaller than other exchanges?',
        answer: 'Coinbase\'s $10 fixed bonus is lower than competitors because it reflects a simple, verifiable offer — there are no trading milestones, voucher systems, or complex unlock conditions. What you see is what you get. Coinbase prioritises regulatory compliance and transparency over large headline bonus figures.',
      },
      {
        question: 'Is Coinbase available without KYC?',
        answer: 'No. Coinbase is a fully regulated exchange and requires identity verification (government-issued ID + selfie) for all users. There are no KYC-free options on Coinbase.',
      },
    ],
    priority: 'high',
  },
];

export function getBonusCodeByExchangeSlug(exchangeSlug: string): BonusCodeEntry | null {
  return BONUS_CODES.find(b => b.exchangeSlug === exchangeSlug) ?? null;
}

export function getAllBonusCodeSlugs(): string[] {
  return BONUS_CODES.map(b => b.exchangeSlug);
}
