/**
 * contentEngine.ts — CryptoBonusWorld Content Scale Engine
 *
 * Centralises all dynamic content generation:
 *  - FAQ items for exchange, country and compare pages
 *  - Bonus type definitions (icons + copy)
 *  - Content quality scoring (0–100)
 *  - AI-draft prompt builder (for future editorial workflow)
 *  - Content override merge helper
 *
 * Design principles:
 *  - Pure functions — no side effects, no imports from Astro or framework
 *  - All FAQ generators return FAQItem[] — the same shape accepted by FAQBlock.astro
 *  - Content overrides take priority over generated content at the call site
 *  - Quality scoring is additive: more complete data → higher score
 *
 * Adding a new page type FAQ:
 *  1. Define a typed input interface (e.g. CategoryFAQInput)
 *  2. Export a generateXyzFAQs() function
 *  3. Import and call it from the page file
 *  4. Keep inline FAQ arrays out of .astro files — they belong here
 */

// ── Shared types ──────────────────────────────────────────────────────────────

export interface FAQItem {
  question: string;
  answer: string;
}

// Minimal exchange shape needed by content generators
// Mirrors the runtime shape from exchanges.json — add fields as needed
export interface ContentExchange {
  name: string;
  slug: string;
  bonusAmount: number;
  bonusCurrency: string;
  bonusTypes: string[];
  kycRequired: boolean;
  depositRequired: boolean;
  paymentMethods: string[];
  countries: string[];
  excludedCountries: string[];
  shortDescription?: string;
  longDescription?: string;
  editorNote?: string;
  bestFor?: string[];
  // Optional rich fields
  founded?: number;
  users?: string;
  licences?: string[];
  headquarters?: string;
  minDeposit?: { amount: number; currency: string } | null;
  tradingVolumeRequired?: { amount: number; currency: string } | null;
  bonusExpiry?: { days: number; note?: string } | null;
}

// Minimal country shape needed by content generators
export interface ContentCountry {
  name: string;
  slug: string;
  paymentMethods: string[];
  regulatoryStatus?: string;
  cryptoAdoptionRank?: string;
  marketContext?: string;
  topExchangeSlug?: string;
  noKycNote?: string;
  fiatOnRamp?: Array<{ method: string; note: string }>;
}

// ── Bonus type definitions ────────────────────────────────────────────────────

export interface BonusTypeDef {
  icon: string;
  title: string;
  desc: string;
}

export const BONUS_TYPE_DEFS: Record<string, BonusTypeDef> = {
  signup: {
    icon: '🎉',
    title: 'Signup Bonus',
    desc: 'Earn a reward just for registering your account using our referral link.',
  },
  deposit: {
    icon: '💰',
    title: 'Deposit Bonus',
    desc: 'Make a qualifying deposit and receive a bonus on top of your funds.',
  },
  futures: {
    icon: '📈',
    title: 'Futures Bonus',
    desc: 'Unlock additional rewards by trading futures contracts on the platform.',
  },
  'no-deposit': {
    icon: '✨',
    title: 'No Deposit Bonus',
    desc: 'Claim a bonus without needing to fund your account first.',
  },
  'trading-rewards': {
    icon: '🏆',
    title: 'Trading Rewards',
    desc: 'Earn rewards based on your trading volume milestones.',
  },
  referral: {
    icon: '👥',
    title: 'Referral Bonus',
    desc: 'Invite friends and earn a share of their trading fees.',
  },
  welcome: {
    icon: '🎊',
    title: 'Welcome Package',
    desc: 'A bundled welcome offer combining multiple bonus types into one package.',
  },
};

export function getBonusTypeDef(type: string): BonusTypeDef | undefined {
  return BONUS_TYPE_DEFS[type];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a minDeposit object as a human-readable label. */
export function formatMinDeposit(minDeposit?: ContentExchange['minDeposit'] | null): string {
  if (!minDeposit) return 'No deposit required';
  if (minDeposit.amount === 0) return 'No deposit required';
  return `${minDeposit.amount.toLocaleString('en-US')} ${minDeposit.currency}`;
}

// ── Exchange FAQ generator ────────────────────────────────────────────────────

/**
 * Generates 6 FAQ items for an exchange detail page.
 * Uses structured exchange data for specific answers.
 * Phrase variants prevent identical patterns across all exchange pages.
 */
export function generateExchangeFAQs(ex: ContentExchange): FAQItem[] {
  const exFounded = ex.founded;
  const exUsers = ex.users;
  const exLicences = ex.licences;
  const exHQ = ex.headquarters;
  const tradingVol = ex.tradingVolumeRequired;
  const bonusExpiry = ex.bonusExpiry;
  const exAge = exFounded ? new Date().getFullYear() - exFounded : null;

  // ── Context lines ──────────────────────────────────────────────────────
  const foundedLine = exFounded
    ? exHQ
      ? `${ex.name} was founded in ${exFounded} and is headquartered in ${exHQ}, giving it ${exAge}+ years of operating history.`
      : `${ex.name} has operated since ${exFounded} — ${exAge}+ years in the industry.`
    : '';
  const usersLine = exUsers ? ` It currently serves ${exUsers} registered users globally.` : '';
  const licenceLine = exLicences && exLicences.length > 0
    ? ` The platform is regulated by ${exLicences.join(' and ')}.`
    : '';

  const countryCount = ex.countries.filter(c => c !== 'global').length;
  const geoLine = ex.countries.includes('global')
    ? `${ex.name} accepts users from most countries worldwide`
    : `${ex.name} is available in over ${countryCount} countries`;
  const excludedLine = ex.excludedCountries.length > 0
    ? ` Users from ${ex.excludedCountries.join(', ')} are not eligible.`
    : '';

  const volLine = tradingVol && tradingVol.amount > 0
    ? ` Reaching the higher bonus tiers requires ${tradingVol.amount.toLocaleString('en-US')} ${tradingVol.currency} in trading activity.`
    : '';

  // ── KYC answer variation by exchange characteristics ──────────────────
  const kycAnswer = ex.kycRequired
    ? `${ex.name} requires identity verification before you can access the full welcome bonus. This involves uploading a government-issued ID and typically a selfie. Most verifications are approved within a few hours. Unverified accounts have restricted bonus access and lower withdrawal limits.`
    : `No — ${ex.name} lets you register and claim the initial bonus without submitting identity documents. This makes it one of the more accessible options for users who prefer not to go through a full KYC process upfront. Keep in mind that unverified accounts have lower withdrawal limits, and you will need KYC to unlock higher tiers or use certain fiat features.`;

  // ── Expiry answer ──────────────────────────────────────────────────────
  const expiryAnswer = bonusExpiry
    ? `Bonus tasks must be completed within ${bonusExpiry.days} days of creating your account.${bonusExpiry.note ? ' ' + bonusExpiry.note : ''} Each individual task may also carry its own sub-deadline once triggered. Check your Rewards Center after signup for the specific schedule.`
    : `${ex.name} sets a validity window for welcome bonus tasks after registration. The exact duration varies by promotion — check your account's Rewards or Missions section immediately after signing up to see the live countdown.`;

  // ── Withdrawal answer ──────────────────────────────────────────────────
  const withdrawalAnswer = `Welcome bonuses at ${ex.name} are issued as trading vouchers or credits — they are not withdrawable cash.${volLine} These vouchers can be used to offset trading fees or fund positions. Any trading profits you earn using bonus funds follow the platform's standard withdrawal rules. For the current terms, check the official bonus page on ${ex.name}'s website.`;

  // ── Legitimacy answer ──────────────────────────────────────────────────
  const kycCondition = ex.kycRequired ? 'identity verification' : 'no KYC for initial access';
  const depositCondition = ex.depositRequired ? 'a qualifying deposit' : 'no deposit required for basic eligibility';
  const legitimacyAnswer = `${foundedLine}${usersLine}${licenceLine} The welcome bonus is a real promotional offer for new users who register via a referral link. Conditions include ${kycCondition} and ${depositCondition}. Bonus vouchers are real but they have strings attached — read the full terms on ${ex.name}'s official site before deciding.`;

  // ── Fee answer — use structured data if available ─────────────────────
  const spotMaker: number | undefined = (ex as any).spotMakerFee;
  const spotTaker: number | undefined = (ex as any).spotTakerFee;
  const feeAnswer = (spotMaker !== undefined && spotTaker !== undefined)
    ? `${ex.name} charges a ${spotMaker}% maker fee and a ${spotTaker}% taker fee on spot trades. Futures fees are typically lower. VIP and high-volume traders get further discounts. ${spotMaker === 0 ? `${ex.name} currently offers 0% maker fees — one of the lowest available. ` : ''}Welcome bonus vouchers can offset part of your fee costs during the initial trading period.`
    : `${ex.name} uses a tiered maker/taker fee model — standard spot fees typically fall in the 0.02%–0.1% range, with lower rates for higher-volume accounts. Bonus vouchers can reduce your effective fee cost during the initial trading period. Check the official fee schedule on ${ex.name}'s website for the latest rates.`;

  // ── Safety / legitimacy short answer ──────────────────────────────────
  const licenceNote = exLicences && exLicences.length > 0
    ? `It holds regulatory licences from ${exLicences.join(' and ')}.`
    : 'It is one of the established platforms in the industry.';
  const safetyAnswer = `${ex.name} is a legitimate, established crypto exchange. ${foundedLine} ${licenceNote}${usersLine} As with all centralised exchanges, do not keep large amounts on the platform long-term — use a personal hardware wallet for significant holdings. Enable 2FA immediately after registration.`;

  // ── Beginner answer ────────────────────────────────────────────────────
  const beginnerAnswer = ex.kycRequired
    ? `${ex.name} is suitable for beginners but requires identity verification (KYC) — have a passport or national ID ready. The interface has a guided onboarding flow. Start with spot trading before exploring futures or leveraged products. The welcome bonus tasks also serve as a structured introduction to the platform's features.`
    : `${ex.name} is very beginner-friendly — no identity documents are needed to start trading. Registration takes under 2 minutes and you can trade immediately. The welcome bonus tasks guide you through the main features. Stick to spot trading to start; futures and leverage carry significant risk for new traders.`;

  // ── P2P answer ─────────────────────────────────────────────────────────
  const p2pAvailable: boolean | undefined = (ex as any).p2pAvailable;
  const p2pAnswer = p2pAvailable
    ? `Yes — ${ex.name} has an active P2P trading desk. You can buy and sell crypto directly with other users using your local bank transfer, mobile wallet or cash payment. No intermediary or currency conversion fee. P2P is especially useful for users without access to bank cards or in regions where direct fiat deposits are limited.`
    : `${ex.name} does not operate a native P2P trading desk. To fund your account with local currency, use the Deposit section and select a supported fiat payment method (bank transfer or card), or transfer crypto from another wallet. Bybit, Binance and MEXC are alternatives with active P2P markets if that is your primary requirement.`;

  // ── Withdrawal answer — crypto-specific ───────────────────────────────
  const cryptoWithdrawAnswer = `To withdraw crypto from ${ex.name}: go to Assets → Withdraw, select the coin (e.g. USDT), choose the network (TRC-20 is cheapest for USDT), paste your destination wallet address, enter the amount and confirm with 2FA. Always send a small test withdrawal first. Standard processing time is 1–30 minutes depending on network congestion. ${ex.kycRequired ? 'KYC must be completed before withdrawing.' : 'No KYC is required for standard withdrawals up to the daily limit.'}`;

  return [
    {
      question: `Is the ${ex.name} bonus real?`,
      answer: legitimacyAnswer,
    },
    {
      question: `Can you withdraw the ${ex.name} bonus funds?`,
      answer: withdrawalAnswer,
    },
    {
      question: `Which countries can use ${ex.name}?`,
      answer: `${geoLine}.${excludedLine} Regional restrictions may also apply based on local regulation changes. If you are in a borderline jurisdiction, verify your eligibility directly on the ${ex.name} website.`,
    },
    {
      question: `Does ${ex.name} require identity verification?`,
      answer: kycAnswer,
    },
    {
      question: `How long do you have to claim the ${ex.name} bonus?`,
      answer: expiryAnswer,
    },
    {
      question: `What are ${ex.name}'s trading fees?`,
      answer: feeAnswer,
    },
    {
      question: `Is ${ex.name} safe and legitimate?`,
      answer: safetyAnswer,
    },
    {
      question: `Is ${ex.name} good for beginners?`,
      answer: beginnerAnswer,
    },
    {
      question: `Does ${ex.name} have P2P trading?`,
      answer: p2pAnswer,
    },
    {
      question: `How do I withdraw crypto from ${ex.name}?`,
      answer: cryptoWithdrawAnswer,
    },
  ];
}

// ── Country FAQ generator ─────────────────────────────────────────────────────

export interface CountryFAQInput {
  country: ContentCountry;
  availableExchanges: ContentExchange[];
  noKycCount: number;
  maxBonus: number;
}

const REGULATORY_STATUS_LABELS: Record<string, { label: string; note: string }> = {
  active:        { label: 'Active Market', note: 'Crypto trading openly permitted with established framework.' },
  evolving:      { label: 'Evolving Regulations', note: 'Regulatory framework is developing. Trading is active but rules may change.' },
  'p2p-focused': { label: 'P2P-Dominant Market', note: 'Direct exchange deposits limited; P2P is the primary on-ramp.' },
};

/**
 * Generates the 6 standard FAQ items for a country page.
 */
export function generateCountryFAQs(input: CountryFAQInput): FAQItem[] {
  const { country, availableExchanges, noKycCount, maxBonus } = input;
  const maxBonusFmt = maxBonus.toLocaleString('en-US');

  const topExchange = availableExchanges[0];
  const topExchangeName = topExchange?.name ?? 'major exchanges';

  const excludedFromCountry = availableExchanges
    .filter(ex => (ex.excludedCountries ?? []).includes(country.slug))
    .map(ex => ex.name);

  const noKycExchanges = availableExchanges
    .filter(ex => !ex.kycRequired)
    .slice(0, 3)
    .map(ex => ex.name);

  const statusInfo = country.regulatoryStatus
    ? (REGULATORY_STATUS_LABELS[country.regulatoryStatus] ?? REGULATORY_STATUS_LABELS['evolving'])
    : null;

  const fiatTop = country.fiatOnRamp?.[0];

  return [
    {
      question: `Which exchanges are available in ${country.name}?`,
      answer: `${availableExchanges.length} exchanges on CryptoBonusWorld accept users from ${country.name}${excludedFromCountry.length > 0 ? `. Notable exceptions: ${excludedFromCountry.join(', ')} do not currently serve ${country.name} users` : ''}. Our top pick for ${country.name} is ${topExchangeName} — selected for its payment support and suitability for local users. Always confirm current availability on the official exchange website as this can change.`,
    },
    {
      question: `Is crypto trading legal in ${country.name}?`,
      answer: `${statusInfo ? `Regulatory status: ${statusInfo.label}. ${statusInfo.note} ` : ''}CryptoBonusWorld does not provide legal or tax advice. Crypto regulations in ${country.name} may evolve. Always check the current legal status of crypto trading and any applicable taxes in your jurisdiction before registering on an exchange.`,
    },
    {
      question: `What payment methods can I use to fund a crypto exchange in ${country.name}?`,
      answer: `Common funding methods for ${country.name} users include: ${country.paymentMethods.join(', ')}. ${fiatTop ? `The most popular method is ${fiatTop.method}: ${fiatTop.note}` : ''} Availability varies by exchange. Check the specific payment method section of each exchange before registering.`,
    },
    {
      question: `Do I need KYC to trade on exchanges in ${country.name}?`,
      answer: noKycCount > 0
        ? `${noKycCount} of the ${availableExchanges.length} exchanges available in ${country.name} offer initial access without full KYC verification: ${noKycExchanges.join(', ')}${noKycExchanges.length < noKycCount ? ' and others' : ''}. ${country.noKycNote ?? 'Non-KYC accounts typically have lower withdrawal limits and may have restricted features.'}`
        : `KYC verification is generally required on exchanges available in ${country.name} to comply with local regulations and exchange risk policies. Always have a government-issued ID ready when registering.`,
    },
    {
      question: `What is the best welcome bonus for users in ${country.name}?`,
      answer: `The highest available bonus for ${country.name} users is up to ${maxBonusFmt} USDT. ${topExchangeName} is our top-rated pick for ${country.name} users based on local payment support, KYC policy and overall platform quality. All ${availableExchanges.length} exchanges on our list accept users from ${country.name} — sort by bonus amount or rating to find the best fit for your trading style.`,
    },
    {
      question: `Are there no-KYC crypto exchanges in ${country.name}?`,
      answer: noKycCount > 0
        ? `Yes — ${noKycCount} exchanges available in ${country.name} allow trading without full identity verification: ${noKycExchanges.join(', ')}${noKycExchanges.length < noKycCount ? ' and others' : ''}. No-KYC accounts typically have daily withdrawal limits. ${country.noKycNote ? country.noKycNote + ' ' : ''}Note that regulations may require KYC for larger transactions or fiat withdrawals.`
        : `Most exchanges available in ${country.name} require KYC verification. This is standard practice for regulated platforms and protects users. Some platforms may offer limited access without full verification — check individual exchange terms.`,
    },
    {
      question: `How do I deposit money on a crypto exchange in ${country.name}?`,
      answer: (() => {
        const methods = country.fiatOnRamp ?? [];
        if (methods.length === 0) return `You can fund your crypto exchange account via bank transfer, debit/credit card, or by transferring crypto from another wallet. The available methods depend on the specific exchange — check the Deposit section after registration.`;
        const topMethod = methods[0];
        const others = methods.slice(1).map(m => m.method).join(', ');
        return `The most popular funding method for ${country.name} users is ${topMethod.method}: ${topMethod.note}${others ? ` Other available methods include ${others}.` : ''} Availability varies by exchange — check the Deposit section after registration for your account's options.`;
      })(),
    },
    {
      question: `Is crypto safe in ${country.name}?`,
      answer: `Crypto exchanges themselves do not eliminate all risk. To trade safely in ${country.name}: (1) Use regulated or established exchanges with a track record — see our recommendations above. (2) Enable two-factor authentication immediately after registration. (3) Do not store large amounts on exchanges — use a hardware wallet for significant holdings. (4) Use P2P only with verified, high-rating counterparties. CryptoBonusWorld does not provide investment advice. Crypto is highly volatile and regulations in ${country.name} may change.`,
    },
  ];
}

// ── Compare FAQ generator ─────────────────────────────────────────────────────

export interface CompareFAQInput {
  exA: ContentExchange;
  exB: ContentExchange;
  overallWinner: 'a' | 'b' | 'tie';
  pointsA: number;
  pointsB: number;
}

/**
 * Generates the 5 standard FAQ items for a compare page.
 */
export function generateCompareFAQs(input: CompareFAQInput): FAQItem[] {
  const { exA, exB, overallWinner, pointsA, pointsB } = input;

  const overallEx = overallWinner === 'tie' ? null : overallWinner === 'a' ? exA : exB;
  const winnerPoints = overallWinner === 'a' ? pointsA : pointsB;
  const loserPoints  = overallWinner === 'a' ? pointsB : pointsA;

  const depA = formatMinDeposit(exA.minDeposit);
  const depB = formatMinDeposit(exB.minDeposit);
  const depEqual = depA === depB;
  const minDepA = exA.minDeposit?.amount ?? 0;
  const minDepB = exB.minDeposit?.amount ?? 0;
  const winnerDep = minDepA < minDepB ? exA.name : minDepB < minDepA ? exB.name : null;

  return [
    {
      question: `Which is better: ${exA.name} or ${exB.name}?`,
      answer: overallEx
        ? `Based on our editorial scoring across 10 categories, ${overallEx.name} edges ahead with ${winnerPoints} category wins to ${loserPoints}. However, the right choice depends on your priorities — ${exA.name} is stronger for ${(exA.bestFor ?? []).slice(0, 2).join(' and ').toLowerCase() || 'spot trading'}, while ${exB.name} is better suited for ${(exB.bestFor ?? []).slice(0, 2).join(' and ').toLowerCase() || 'futures trading'}.`
        : `${exA.name} and ${exB.name} score equally across our 10 comparison categories. Your choice should come down to personal priorities: preferred trading style, KYC tolerance and which bonus structure suits your strategy.`,
    },
    {
      question: `Does ${exA.name} require KYC?`,
      answer: exA.kycRequired
        ? `Yes, ${exA.name} requires identity verification (KYC) to access full trading features and to claim the welcome bonus. You will need to submit a government-issued ID and complete the verification process.`
        : `${exA.name} does not require full KYC for basic trading access. You can register and start trading without submitting identity documents, though withdrawal limits and some features may be restricted on unverified accounts.`,
    },
    {
      question: `Does ${exB.name} require KYC?`,
      answer: exB.kycRequired
        ? `Yes, ${exB.name} requires identity verification (KYC) to access full trading features and to claim the welcome bonus. You will need to submit a government-issued ID and complete the verification process.`
        : `${exB.name} does not require full KYC for basic trading access. You can register and start trading without submitting identity documents, though withdrawal limits and some features may be restricted on unverified accounts.`,
    },
    {
      question: `What is the minimum deposit for ${exA.name} vs ${exB.name}?`,
      answer: `${exA.name} requires a minimum deposit of ${depA} to activate its welcome bonus. ${exB.name} requires ${depB}. ${depEqual ? 'Both exchanges have the same minimum deposit requirement.' : `${winnerDep ? winnerDep + ' has the lower barrier to entry.' : 'Check each platform for the most current requirements.'}`}`,
    },
    {
      question: `Can I claim bonuses on both ${exA.name} and ${exB.name}?`,
      answer: `Yes — welcome bonuses are one-time offers per exchange, not mutually exclusive between platforms. You can open accounts on both ${exA.name} and ${exB.name} and claim each platform's welcome bonus independently, provided you meet the individual requirements for each.`,
    },
    {
      question: `Which has lower trading fees — ${exA.name} or ${exB.name}?`,
      answer: (() => {
        const aM: number | undefined = (exA as any).spotMakerFee;
        const aT: number | undefined = (exA as any).spotTakerFee;
        const bM: number | undefined = (exB as any).spotMakerFee;
        const bT: number | undefined = (exB as any).spotTakerFee;
        if (aM !== undefined && bM !== undefined) {
          const lowerMaker = aM < bM ? exA.name : bM < aM ? exB.name : null;
          const lowerTaker = aT !== undefined && bT !== undefined ? (aT < bT ? exA.name : bT < aT ? exB.name : null) : null;
          return `${exA.name} charges ${aM}% maker / ${aT ?? '?'}% taker on spot. ${exB.name} charges ${bM}% maker / ${bT ?? '?'}% taker. ${lowerMaker ? `${lowerMaker} has lower maker fees. ` : 'Maker fees are equal. '}${lowerTaker ? `${lowerTaker} has the lower taker rate.` : ''} Both platforms reduce fees for high-volume traders.`;
        }
        return `Both ${exA.name} and ${exB.name} use tiered maker/taker fee models — standard spot fees are typically in the 0.02%–0.1% range. Higher-volume traders get discounts. Check each platform's official fee schedule for the most up-to-date rates.`;
      })(),
    },
    {
      question: `Which is better for beginners — ${exA.name} or ${exB.name}?`,
      answer: (() => {
        // Simpler = no KYC (lower friction) + lower minDeposit
        const aScore = (!exA.kycRequired ? 2 : 0) + (!exA.depositRequired ? 1 : 0);
        const bScore = (!exB.kycRequired ? 2 : 0) + (!exB.depositRequired ? 1 : 0);
        if (aScore > bScore) return `For beginners, ${exA.name} has lower friction — ${!exA.kycRequired ? 'no KYC required, ' : ''}${!exA.depositRequired ? 'no minimum deposit' : 'lower deposit barrier'}. This makes it faster to start. That said, both platforms are established and usable for new traders. Start with spot trading and avoid leveraged products until you understand the market.`;
        if (bScore > aScore) return `For beginners, ${exB.name} is the easier starting point — ${!exB.kycRequired ? 'no KYC required, ' : ''}${!exB.depositRequired ? 'no minimum deposit' : 'lower deposit barrier'}. Both platforms are legitimate and accessible for new traders. Start with spot trades and leave futures for later.`;
        return `Both ${exA.name} and ${exB.name} are accessible to beginners. Neither has a clear usability advantage — the right choice comes down to which payment methods you want to use and which trading interface you find more intuitive. Both offer educational resources for new traders.`;
      })(),
    },
    {
      question: `Does ${exA.name} or ${exB.name} have P2P trading?`,
      answer: (() => {
        const aP2p: boolean | undefined = (exA as any).p2pAvailable;
        const bP2p: boolean | undefined = (exB as any).p2pAvailable;
        if (aP2p && bP2p) return `Both ${exA.name} and ${exB.name} offer P2P trading. You can buy and sell crypto directly with other users using local bank transfers, mobile wallets or cash. Compare the available payment methods and local currency options on each platform to find the better P2P desk for your region.`;
        if (aP2p && !bP2p) return `${exA.name} has P2P trading — you can buy crypto directly with local payment methods without going through the exchange's order book. ${exB.name} does not have a native P2P desk; use its standard deposit methods instead.`;
        if (!aP2p && bP2p) return `${exB.name} has P2P trading — you can buy crypto directly using local payment methods. ${exA.name} does not have a native P2P desk. If P2P is your main funding method, ${exB.name} is the better choice between the two.`;
        return `Neither ${exA.name} nor ${exB.name} has a native P2P trading desk. Both rely on standard fiat deposit methods: bank transfer, card or third-party payment processors. If P2P trading is important to you, consider Bybit or Binance which operate active P2P markets.`;
      })(),
    },
  ];
}

// ── Content quality scoring ───────────────────────────────────────────────────

export interface ContentQualityScore {
  score: number;         // 0–100
  grade: 'A' | 'B' | 'C' | 'D';
  missing: string[];     // Human-readable list of missing content fields
  suggestions: string[]; // Actionable improvement suggestions
}

/**
 * Scores the editorial content quality of an exchange entry.
 * Higher score = more complete, richer editorial content.
 * This is separate from dataManager's completeness score (which focuses on data integrity).
 * This focuses on SEO + editorial quality.
 */
export function scoreContentQuality(ex: ContentExchange): ContentQualityScore {
  const missing: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Long description (most impactful for SEO)
  if (ex.longDescription && ex.longDescription.length >= 150) {
    score += 25;
  } else if (ex.longDescription && ex.longDescription.length > 0) {
    score += 10;
    suggestions.push('Expand longDescription to at least 150 characters for better SEO coverage');
  } else {
    missing.push('longDescription');
    suggestions.push('Add a longDescription (200+ chars) covering exchange strengths and bonus mechanics');
  }

  // Short description (used in cards and schema)
  if (ex.shortDescription && ex.shortDescription.length >= 60) {
    score += 15;
  } else if (ex.shortDescription) {
    score += 8;
    suggestions.push('Expand shortDescription to 60+ characters');
  } else {
    missing.push('shortDescription');
    suggestions.push('Add a shortDescription (60-160 chars) for use in comparison cards');
  }

  // Editor note (editorial voice, trust signal)
  if (ex.editorNote && ex.editorNote.length >= 80) {
    score += 15;
  } else if (ex.editorNote) {
    score += 7;
    suggestions.push('Expand editorNote to 80+ characters for stronger editorial trust signal');
  } else {
    missing.push('editorNote');
    suggestions.push('Add an editorNote with editorial verdict — e.g. who this exchange is best for and why');
  }

  // Licences (trust / EEAT signal)
  if (ex.licences && ex.licences.length > 0) {
    score += 10;
  } else {
    missing.push('licences');
    suggestions.push('Add regulatory licences if available — strong EEAT trust signal');
  }

  // Founded + headquarters (authority signal)
  if (ex.founded) score += 5;
  else suggestions.push('Add founded year for authority signals in FAQ answers');

  if (ex.headquarters) score += 5;

  // Users (social proof)
  if (ex.users) score += 5;
  else suggestions.push('Add users field (e.g. "20M+") for social proof in FAQ answers');

  // bestFor (used in compare pages and editor summaries)
  if (ex.bestFor && ex.bestFor.length >= 2) {
    score += 10;
  } else {
    missing.push('bestFor');
    suggestions.push('Add 2-4 bestFor tags (e.g. ["no-kyc", "futures", "high-bonus"])');
  }

  // Bonus expiry structured data
  if (ex.bonusExpiry) score += 5;
  else suggestions.push('Add bonusExpiry.days for richer FAQ answers and conditions grid');

  // Trading volume requirement
  if (ex.tradingVolumeRequired !== undefined) score += 5;

  const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';

  return { score: Math.min(score, 100), grade, missing, suggestions };
}

// ── Content override merge ────────────────────────────────────────────────────

export interface FAQOverride {
  /** 0-based index into the generated FAQ array. */
  index: number;
  question?: string;
  answer?: string;
}

export interface ContentCalloutData {
  type: 'tip' | 'warning' | 'info' | 'bonus';
  title?: string;
  body: string;
  /** Where to render — 'top' | 'before-faq' | 'after-hero' */
  position?: string;
}

export interface ContentOverride {
  /** Fully replace a FAQ item. Takes priority over generated content. */
  faqOverrides?: FAQOverride[];
  /** Append extra FAQ items after the generated ones. */
  faqAppend?: FAQItem[];
  /** Editorial callout blocks to display on the page. */
  callouts?: ContentCalloutData[];
  /** Override editorNote directly (shown in EditorSummary). */
  editorNote?: string;
  /** Custom longDescription override (shown in description block). */
  longDescription?: string;
}

/**
 * Merges generated FAQ items with editorial overrides.
 * Override at a specific index replaces only that FAQ item.
 * Appended items are added after the generated ones.
 */
export function applyFAQOverrides(
  generated: FAQItem[],
  override?: ContentOverride
): FAQItem[] {
  if (!override) return generated;

  // Apply index-based overrides
  let result = [...generated];
  for (const ov of override.faqOverrides ?? []) {
    if (ov.index >= 0 && ov.index < result.length) {
      result[ov.index] = {
        question: ov.question ?? result[ov.index].question,
        answer:   ov.answer   ?? result[ov.index].answer,
      };
    }
  }

  // Append extra items
  if (override.faqAppend?.length) {
    result = [...result, ...override.faqAppend];
  }

  return result;
}

// ── AI draft prompt builder ───────────────────────────────────────────────────

/**
 * Generates a structured prompt for an AI content writer to draft
 * the longDescription and editorNote for an exchange.
 *
 * This is a utility for the editorial workflow — it does NOT call any AI API.
 * Output is a plain string that can be pasted into an AI assistant.
 */
export function generateAIDraftPrompt(ex: ContentExchange): string {
  const bonusTypes = ex.bonusTypes.join(', ');
  const kycLine = ex.kycRequired ? 'KYC required' : 'No KYC required';
  const depositLine = ex.minDeposit && ex.minDeposit.amount > 0
    ? `Min deposit: ${formatMinDeposit(ex.minDeposit)}`
    : 'No deposit required for initial bonus access';
  const expiryLine = ex.bonusExpiry
    ? `Bonus must be claimed within ${ex.bonusExpiry.days} days`
    : 'Bonus expiry: check official terms';

  return `You are a senior crypto affiliate content writer with SEO expertise.
Write two editorial content blocks for the following crypto exchange listing.

## Exchange Data
- Name: ${ex.name}
- Bonus: Up to ${ex.bonusAmount.toLocaleString()} ${ex.bonusCurrency}
- Bonus types: ${bonusTypes}
- ${kycLine}
- ${depositLine}
- ${expiryLine}
- Available in: ${ex.countries.includes('global') ? 'Global' : ex.countries.join(', ')}
${ex.founded ? `- Founded: ${ex.founded}` : ''}
${ex.users ? `- Users: ${ex.users}` : ''}
${ex.licences?.length ? `- Licences: ${ex.licences.join(', ')}` : ''}
${ex.bestFor?.length ? `- Best for: ${ex.bestFor.join(', ')}` : ''}

## Required Output

### 1. longDescription (200–350 characters)
A factual, SEO-friendly description of the exchange's bonus offer and key advantage.
Focus on: what makes this exchange stand out, who it's best for, bonus mechanics.
Tone: Informative, direct, no hype. No "best" or "number 1" claims.
Example format: "[Name] offers a [bonus structure] welcome package worth up to [amount] [currency]. [Key differentiator]. [Who benefits most]."

### 2. editorNote (100–200 characters)
A concise editorial verdict from our team.
Focus on: our honest recommendation, key trade-off, or standout feature.
Tone: Conversational, authoritative, first-person plural ("Our take:" or "Editor's pick:").
Example: "Our pick for no-KYC traders. High bonus ceiling but requires significant trading volume to unlock all tiers."

Output ONLY the two fields in this exact JSON format:
{
  "longDescription": "...",
  "editorNote": "..."
}`;
}
