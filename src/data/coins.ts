/**
 * Coin data for /coins/[slug]/ pages.
 *
 * Schema includes:
 *  - SEO metadata
 *  - Exchange support mapping
 *  - Network support (for deposit method comparison)
 *  - Beginner-friendly content (intro, use-case, buy steps)
 *  - FAQ items (injected into FAQBlock + JSON-LD)
 *
 * Coin slugs MUST match programmatic-config.ts COIN_PAGES slugs exactly.
 */

export interface CoinNetwork {
  name: string;   // e.g. "ERC-20", "TRC-20", "Native"
  note?: string;  // e.g. "Lowest fees on TRC-20"
}

export interface CoinFAQ {
  question: string;
  answer: string;
}

export interface CoinData {
  slug: string;
  symbol: string;
  label: string;
  seoTitle: string;
  metaDesc: string;

  // Exchange support — 'all' = all exchanges in exchanges.json support it
  // Otherwise list specific exchange slugs
  supportedBy: 'all' | string[];

  // No-KYC exchanges that support this coin (derived at runtime, but declare override here)
  noKycExchanges?: string[];

  // Coin overview content
  intro: string;
  useCase: string;
  networks: CoinNetwork[];

  // Recommended network for beginners
  recommendedNetwork?: string;

  // Approximate minimum buy (informational only)
  minBuyNote?: string;

  // GEO note (optional country-specific context)
  geoNote?: string;

  // AI search / quick facts
  quickFacts: { label: string; value: string }[];

  // FAQ for this coin page (merged with auto-generated exchange FAQs)
  faq: CoinFAQ[];

  // Internal cross-links
  relatedGuideSlug?: string;
  relatedCategorySlug?: string;

  // Priority for sitemap
  priority: 'very-high' | 'high' | 'medium';
}

export const COINS: CoinData[] = [
  {
    slug: 'bitcoin',
    symbol: 'BTC',
    label: 'Bitcoin',
    seoTitle: 'Best Exchanges to Buy Bitcoin (BTC) With Bonus 2026',
    metaDesc: 'Compare crypto exchanges where you can buy Bitcoin (BTC) and claim a signup bonus. No-KYC options included. Verified offers for 2026.',
    supportedBy: 'all',
    intro: 'Bitcoin (BTC) is the original cryptocurrency and the most widely traded digital asset. Every major crypto exchange supports BTC, but bonus offers, fees and network options vary significantly.',
    useCase: 'Bitcoin is used as a store of value, long-term investment, and increasingly as collateral for crypto-backed products. Most beginners start with BTC before exploring other assets.',
    networks: [
      { name: 'Bitcoin (Native)', note: 'Standard on-chain transfer — use for large amounts' },
      { name: 'BEP-20 (BSC)', note: 'Wrapped BTC on Binance Smart Chain — lower fees for DeFi' },
      { name: 'ERC-20', note: 'WBTC on Ethereum — required for ETH-based DeFi' },
    ],
    recommendedNetwork: 'Bitcoin (Native)',
    minBuyNote: 'Most exchanges allow buying as little as $1–10 worth of BTC',
    quickFacts: [
      { label: 'Symbol', value: 'BTC' },
      { label: 'All-time high', value: '$109,000+ (2025)' },
      { label: 'Exchanges available', value: '12 (all tracked exchanges)' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx, Bitunix' },
      { label: 'Best bonus exchange', value: 'Bybit — up to 30,000 USDT' },
      { label: 'Best no-KYC option', value: 'MEXC — no ID required, up to 1,000 USDT bonus' },
    ],
    faq: [
      {
        question: 'Which exchange is best to buy Bitcoin with a bonus?',
        answer: 'Bybit offers the highest welcome bonus (up to 30,000 USDT) and fully supports Bitcoin spot trading. For a no-KYC option, MEXC allows BTC purchases without identity verification and offers up to 1,000 USDT in signup bonuses.',
      },
      {
        question: 'Can I buy Bitcoin without KYC verification?',
        answer: 'Yes. MEXC, KuCoin, CoinEx and Bitunix allow you to buy Bitcoin without completing full identity verification, though withdrawal limits may apply to unverified accounts.',
      },
      {
        question: 'What is the minimum amount of Bitcoin I can buy?',
        answer: 'Most exchanges allow fractional BTC purchases starting from as little as $1–10 (e.g. 0.00001 BTC). There is no minimum in terms of Bitcoin quantity — you buy in dollar/USDT value.',
      },
      {
        question: 'Which Bitcoin network should I use for deposits?',
        answer: 'Use the native Bitcoin (BTC) network for standard transfers — it is the most universally accepted. BEP-20 (Binance Smart Chain) is faster and cheaper but only works on compatible exchanges.',
      },
      {
        question: 'Is it safe to claim a bonus when buying Bitcoin?',
        answer: 'Yes, if you use a reputable exchange. All exchanges listed on CryptoBonusWorld are manually verified. Always read bonus terms — most require you to trade (not just hold) the deposited Bitcoin to unlock the full bonus.',
      },
    ],
    relatedGuideSlug: 'how-to-claim-crypto-bonus',
    relatedCategorySlug: 'deposit-bonuses',
    priority: 'high',
  },

  {
    slug: 'ethereum',
    symbol: 'ETH',
    label: 'Ethereum',
    seoTitle: 'Best Exchanges to Buy Ethereum (ETH) With Bonus 2026',
    metaDesc: 'Compare crypto exchanges to buy Ethereum (ETH) with the best signup bonuses. KYC and no-KYC options. Verified for 2026.',
    supportedBy: 'all',
    intro: 'Ethereum (ETH) is the second-largest cryptocurrency by market cap and the foundation of the DeFi and NFT ecosystems. It is supported on all major exchanges with competitive bonuses for new users.',
    useCase: 'Ethereum powers smart contracts, DeFi protocols, NFT marketplaces, and staking through Ethereum 2.0. Many traders hold ETH for both appreciation and yield through staking.',
    networks: [
      { name: 'ERC-20 (Ethereum)', note: 'Native network — highest fees but most universal' },
      { name: 'BEP-20 (BSC)', note: 'Wrapped ETH on Binance Smart Chain — lowest fees' },
      { name: 'Arbitrum / Optimism', note: 'Layer-2 networks — fast and cheap' },
    ],
    recommendedNetwork: 'ERC-20 (Ethereum)',
    minBuyNote: 'Buy as little as $5 worth of ETH on most exchanges',
    quickFacts: [
      { label: 'Symbol', value: 'ETH' },
      { label: 'Consensus', value: 'Proof-of-Stake (since 2022)' },
      { label: 'Exchanges available', value: '12 (all tracked exchanges)' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx, Bitunix' },
      { label: 'Best bonus exchange', value: 'Bybit — up to 30,000 USDT' },
      { label: 'Staking available', value: 'Yes — Binance, Bybit, OKX, KuCoin' },
    ],
    faq: [
      {
        question: 'Where can I buy Ethereum with the best bonus?',
        answer: 'Bybit, OKX, and Bitget offer the highest new-user bonuses and all support Ethereum spot trading. Bybit has the largest package at up to 30,000 USDT across multiple tiers.',
      },
      {
        question: 'Can I buy Ethereum without KYC?',
        answer: 'Yes. MEXC and KuCoin allow ETH purchases without identity verification. Unverified accounts typically have lower daily withdrawal limits.',
      },
      {
        question: 'Which Ethereum network should I use?',
        answer: 'For exchange deposits, ERC-20 (native Ethereum) is the safest choice. BEP-20 is cheaper but only transfer to exchanges that explicitly support it — sending native ETH to a BEP-20 address (or vice versa) results in permanent loss.',
      },
      {
        question: 'Can I stake Ethereum on these exchanges?',
        answer: 'Yes. Binance, Bybit, OKX and KuCoin all offer ETH staking with varying APY rates. Staking rewards are separate from signup bonuses.',
      },
    ],
    relatedGuideSlug: 'how-to-claim-crypto-bonus',
    relatedCategorySlug: 'deposit-bonuses',
    priority: 'high',
  },

  {
    slug: 'usdt',
    symbol: 'USDT',
    label: 'Tether (USDT)',
    seoTitle: 'Best Exchanges to Buy USDT (Tether) With Low Fees 2026',
    metaDesc: 'Compare exchanges to buy USDT (Tether) with the lowest fees. P2P, card and bank transfer options. No-KYC and bonus options included.',
    supportedBy: 'all',
    intro: 'USDT (Tether) is the world\'s most traded stablecoin, pegged 1:1 to the US dollar. It is the primary trading pair on most crypto exchanges and a popular way to hold value without crypto price exposure.',
    useCase: 'USDT is used to store value stably in crypto form, to trade other crypto assets, to send/receive international payments, and as collateral for DeFi protocols and futures trading.',
    networks: [
      { name: 'TRC-20 (TRON)', note: 'Lowest fees — recommended for transfers between exchanges' },
      { name: 'ERC-20 (Ethereum)', note: 'Highest compatibility — use for DeFi and wallets' },
      { name: 'BEP-20 (BSC)', note: 'Fast and cheap — widely supported on major exchanges' },
      { name: 'SOL (Solana)', note: 'Very fast, low fee — growing adoption' },
    ],
    recommendedNetwork: 'TRC-20 (TRON)',
    minBuyNote: 'USDT can be bought in any amount — even $1 worth is valid',
    geoNote: 'P2P USDT buying is popular in Turkey, Nigeria, Vietnam, Brazil and India where direct fiat on-ramps are limited.',
    quickFacts: [
      { label: 'Symbol', value: 'USDT' },
      { label: 'Type', value: 'USD-pegged stablecoin (Tether)' },
      { label: 'Best network (fees)', value: 'TRC-20 (~$0.00–$1 fee)' },
      { label: 'Exchanges available', value: '12 (all tracked exchanges)' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx, Bitunix' },
      { label: 'P2P available', value: 'Yes — Bybit, Binance, OKX, MEXC, HTX' },
    ],
    faq: [
      {
        question: 'What is the cheapest way to buy USDT?',
        answer: 'P2P trading on Bybit, Binance, or OKX typically has the lowest fees (0–1%) because you buy directly from other users. Bank transfer and card purchases carry higher fees (1–4%).',
      },
      {
        question: 'Which USDT network has the lowest fees?',
        answer: 'TRC-20 (TRON network) has the lowest fees — typically $0–1 per transfer. BEP-20 (Binance Smart Chain) is also cheap. Avoid ERC-20 for frequent transfers due to high Ethereum gas fees.',
      },
      {
        question: 'Can I buy USDT without KYC?',
        answer: 'Yes. MEXC, KuCoin, CoinEx and Bitunix allow USDT purchases without identity verification. P2P platforms on Bybit and Binance also offer limited no-KYC trading.',
      },
      {
        question: 'Is USDT safe?',
        answer: 'USDT is issued by Tether Limited and backed by cash reserves and equivalents. It is the most liquid stablecoin and has maintained its $1 peg consistently. However, stablecoin risk is real — always keep funds on reputable exchanges or hardware wallets.',
      },
      {
        question: 'Can I earn a bonus by depositing USDT?',
        answer: 'Yes. Most exchange signup bonuses are triggered by a USDT deposit. Bybit offers up to 30,000 USDT bonus, with the first tier starting at a $100 USDT deposit.',
      },
    ],
    relatedGuideSlug: 'how-to-buy-usdt',
    relatedCategorySlug: 'deposit-bonuses',
    priority: 'very-high',
  },

  {
    slug: 'bnb',
    symbol: 'BNB',
    label: 'BNB',
    seoTitle: 'Best Exchanges to Buy BNB (Binance Coin) in 2026',
    metaDesc: 'Compare where to buy BNB with the best rates and signup bonuses. KYC and no-KYC options. Verified exchange listings for 2026.',
    supportedBy: ['binance', 'bybit', 'mexc', 'okx', 'kucoin', 'gate-io', 'bitget', 'bingx', 'htx', 'coinex'],
    intro: 'BNB (Binance Coin) is the native token of the Binance ecosystem and Binance Smart Chain (BSC). It is the fourth-largest cryptocurrency by market cap and is used for fee discounts, staking, and DeFi participation.',
    useCase: 'BNB is used to pay trading fees on Binance (with a discount), for transaction fees on Binance Smart Chain (BSC), staking and launchpool participation, and as collateral in DeFi protocols.',
    networks: [
      { name: 'BEP-20 (BSC)', note: 'Most widely used — main BNB network for transfers' },
      { name: 'BEP-2 (BNB Chain)', note: 'Older network — still used on some exchanges' },
      { name: 'ERC-20', note: 'Wrapped BNB on Ethereum — higher fees, less common' },
    ],
    recommendedNetwork: 'BEP-20 (BSC)',
    quickFacts: [
      { label: 'Symbol', value: 'BNB' },
      { label: 'Primary use', value: 'Fee discounts on Binance + BSC gas token' },
      { label: 'Best exchange', value: 'Binance (native ecosystem)' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin' },
      { label: 'Staking available', value: 'Yes — Binance, KuCoin, MEXC' },
    ],
    faq: [
      {
        question: 'Where is the best place to buy BNB?',
        answer: 'Binance is the native home of BNB with the deepest liquidity and lowest spread. MEXC and KuCoin are good no-KYC alternatives.',
      },
      {
        question: 'Can I buy BNB without KYC?',
        answer: 'Yes. MEXC and KuCoin support BNB trading without full identity verification, with limited daily withdrawal amounts.',
      },
      {
        question: 'What is the difference between BEP-2 and BEP-20?',
        answer: 'BEP-2 is the older BNB Beacon Chain format. BEP-20 is the current Binance Smart Chain format and is far more widely used. When depositing BNB, always confirm which network the exchange accepts.',
      },
    ],
    relatedCategorySlug: 'deposit-bonuses',
    priority: 'high',
  },

  {
    slug: 'solana',
    symbol: 'SOL',
    label: 'Solana',
    seoTitle: 'Best Exchanges to Buy Solana (SOL) With Bonus 2026',
    metaDesc: 'Compare exchanges to buy Solana (SOL) with signup bonuses. No-KYC options included. Verified offers for 2026.',
    supportedBy: ['bybit', 'binance', 'mexc', 'okx', 'kucoin', 'gate-io', 'bitget', 'bingx', 'coinex', 'htx'],
    intro: 'Solana (SOL) is a high-performance blockchain known for fast transactions, low fees, and a thriving NFT and DeFi ecosystem. It is one of the most actively traded altcoins.',
    useCase: 'SOL is used for transaction fees on the Solana network, staking, participation in Solana-based DeFi and NFT platforms, and as a high-beta crypto asset for traders.',
    networks: [
      { name: 'Solana (Native)', note: 'The only network for SOL — use native when depositing' },
    ],
    recommendedNetwork: 'Solana (Native)',
    minBuyNote: 'Buy from as little as $5 worth of SOL',
    quickFacts: [
      { label: 'Symbol', value: 'SOL' },
      { label: 'TPS', value: '~65,000 (theoretical maximum)' },
      { label: 'Exchanges available', value: '10 of 12 tracked exchanges' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin' },
      { label: 'Best bonus exchange', value: 'Bybit — up to 30,000 USDT' },
      { label: 'Staking available', value: 'Yes — Binance, Bybit, OKX, KuCoin' },
    ],
    faq: [
      {
        question: 'Where can I buy Solana with the best bonus?',
        answer: 'Bybit, OKX and Bitget offer the highest new-user bonuses and all support Solana spot trading.',
      },
      {
        question: 'Can I buy Solana without KYC?',
        answer: 'Yes. MEXC and KuCoin support SOL trading without full identity verification.',
      },
      {
        question: 'What is the Solana deposit network?',
        answer: 'Solana only has one network — the Solana native network. Unlike ETH or USDT, there are no alternative networks for SOL. Always select "Solana" as the network when depositing.',
      },
      {
        question: 'Is Solana a good investment?',
        answer: 'This site does not provide investment advice. Solana is a high-volatility asset. Always research independently and only invest what you can afford to lose.',
      },
    ],
    relatedCategorySlug: 'deposit-bonuses',
    priority: 'high',
  },

  // ── Phase 4 additions ──────────────────────────────────────────────────────

  {
    slug: 'xrp',
    symbol: 'XRP',
    label: 'XRP (Ripple)',
    seoTitle: 'Best Exchanges to Buy XRP (Ripple) With Bonus 2026',
    metaDesc: 'Compare the best exchanges to buy XRP (Ripple) in 2026. No-KYC options, low fees, and signup bonuses. Verified for XRP availability.',
    supportedBy: ['bybit', 'binance', 'mexc', 'okx', 'kucoin', 'gate-io', 'bitget', 'bingx', 'htx', 'coinex', 'lbank', 'coinbase'],
    noKycExchanges: ['mexc', 'kucoin', 'coinex'],
    intro: 'XRP is the native digital asset of the XRP Ledger, developed by Ripple Labs. It is one of the fastest and cheapest cryptocurrencies to transfer — transactions settle in 3–5 seconds with fees under $0.001.',
    useCase: 'XRP is primarily used for fast cross-border value transfers, as a bridge currency for international remittances, and as a speculative trading asset. Ripple uses XRP to facilitate instant currency exchange between financial institutions.',
    networks: [
      { name: 'XRP Ledger (XRPL)', note: 'The only network for XRP — always use XRPL for deposits' },
      { name: 'BEP-20 (BSC)', note: 'Wrapped XRP on Binance Smart Chain — less common, confirm support' },
    ],
    recommendedNetwork: 'XRP Ledger (XRPL)',
    minBuyNote: 'Most exchanges allow buying from $1 worth of XRP',
    quickFacts: [
      { label: 'Symbol', value: 'XRP' },
      { label: 'Transaction speed', value: '3–5 seconds' },
      { label: 'Transaction fee', value: 'Under $0.001' },
      { label: 'Exchanges available', value: '12 of 14 tracked exchanges' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx' },
      { label: 'Best bonus exchange', value: 'Bybit — up to 30,000 USDT' },
    ],
    faq: [
      {
        question: 'Where can I buy XRP with the best bonus?',
        answer: 'Bybit, Binance, and OKX offer the highest signup bonuses and all support XRP spot trading. For a no-KYC option, MEXC supports XRP without identity verification.',
      },
      {
        question: 'Can I buy XRP without KYC?',
        answer: 'Yes. MEXC, KuCoin, and CoinEx support XRP trading without full identity verification. Daily withdrawal limits apply to unverified accounts.',
      },
      {
        question: 'What network do I use to deposit XRP?',
        answer: 'Always use the XRP Ledger (XRPL) when depositing XRP to an exchange. Most exchanges also require a destination tag — always include it or your funds may be lost.',
      },
      {
        question: 'What is a destination tag for XRP?',
        answer: 'A destination tag is a numeric identifier that exchanges use to identify which account should receive your XRP deposit. It is required when sending XRP to any major exchange. Without it, the exchange cannot assign your deposit to your account.',
      },
    ],
    relatedCategorySlug: 'deposit-bonuses',
    priority: 'high',
  },

  {
    slug: 'doge',
    symbol: 'DOGE',
    label: 'Dogecoin (DOGE)',
    seoTitle: 'Best Exchanges to Buy Dogecoin (DOGE) With Bonus 2026',
    metaDesc: 'Compare the best exchanges to buy Dogecoin (DOGE) in 2026. No-KYC options, low fees, and signup bonuses. Verified DOGE listings.',
    supportedBy: ['bybit', 'binance', 'mexc', 'okx', 'kucoin', 'gate-io', 'bitget', 'bingx', 'htx', 'coinex', 'lbank', 'coinbase'],
    noKycExchanges: ['mexc', 'kucoin', 'coinex'],
    intro: 'Dogecoin (DOGE) started as a meme cryptocurrency in 2013 but has become one of the most widely held and traded digital assets. Backed by a large community and endorsed by high-profile figures, DOGE remains a top-10 cryptocurrency by market cap.',
    useCase: 'DOGE is primarily used for tipping, small payments, and speculative trading. It has extremely low transaction fees and fast confirmation times, making it practical for micro-transactions.',
    networks: [
      { name: 'Dogecoin (Native)', note: 'The only network — use native DOGE for all transfers' },
      { name: 'BEP-20 (BSC)', note: 'Wrapped DOGE on Binance Smart Chain — check exchange support' },
    ],
    recommendedNetwork: 'Dogecoin (Native)',
    minBuyNote: 'Buy as little as $1 worth of DOGE on most exchanges',
    quickFacts: [
      { label: 'Symbol', value: 'DOGE' },
      { label: 'Transaction fee', value: '~1 DOGE (~$0.10 at typical prices)' },
      { label: 'Block time', value: '~1 minute' },
      { label: 'Exchanges available', value: '12 of 14 tracked exchanges' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx' },
      { label: 'Best bonus exchange', value: 'Bybit — up to 30,000 USDT' },
    ],
    faq: [
      {
        question: 'Where is the best exchange to buy Dogecoin?',
        answer: 'Bybit, Binance, and OKX all support DOGE with competitive fees. For no-KYC purchases, MEXC and KuCoin are the best options. Coinbase is the best regulated option for US/UK buyers.',
      },
      {
        question: 'Can I buy Dogecoin without ID verification?',
        answer: 'Yes. MEXC and KuCoin allow DOGE purchases without KYC. Both support withdrawal limits for unverified accounts.',
      },
      {
        question: 'What is the best network for Dogecoin transfers?',
        answer: 'Use the native Dogecoin network (DOGE) for all transfers. It has low fees (~1 DOGE per transfer) and fast confirmations. A few exchanges also accept BEP-20 wrapped DOGE, but always confirm before sending.',
      },
    ],
    relatedCategorySlug: 'signup-bonuses',
    priority: 'high',
  },

  {
    slug: 'ton',
    symbol: 'TON',
    label: 'Toncoin (TON)',
    seoTitle: 'Best Exchanges to Buy Toncoin (TON) With Bonus 2026',
    metaDesc: 'Compare the best exchanges to buy Toncoin (TON) in 2026. Telegram-based blockchain, no-KYC options, and welcome bonuses. Verified for 2026.',
    supportedBy: ['bybit', 'binance', 'mexc', 'okx', 'kucoin', 'gate-io', 'bitget', 'bingx', 'htx', 'coinex'],
    noKycExchanges: ['mexc', 'kucoin', 'coinex'],
    intro: 'Toncoin (TON) is the native cryptocurrency of The Open Network — originally developed by Telegram and now maintained by an independent foundation. With over 900 million Telegram users as a potential audience, TON has experienced rapid adoption as a blockchain for mini-apps, payments, and NFTs.',
    useCase: 'TON is used for gas fees on The Open Network, in-app payments within Telegram mini-apps, NFT trading on TON-based marketplaces, and staking through validators.',
    networks: [
      { name: 'TON (Native)', note: 'The only network — always use TON when depositing' },
    ],
    recommendedNetwork: 'TON (Native)',
    minBuyNote: 'Buy from $1 worth of TON on most exchanges',
    quickFacts: [
      { label: 'Symbol', value: 'TON' },
      { label: 'Ecosystem', value: 'Telegram-integrated blockchain' },
      { label: 'Exchanges available', value: '10 of 14 tracked exchanges' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx' },
      { label: 'Best bonus exchange', value: 'Bybit — up to 30,000 USDT' },
      { label: 'Staking available', value: 'Yes — native staking via TON validators' },
    ],
    faq: [
      {
        question: 'What is Toncoin and why is it popular?',
        answer: 'Toncoin is the native currency of The Open Network (TON), originally built by Telegram. Its popularity comes from deep Telegram integration — over 900 million Telegram users can access TON-based apps directly through the Telegram app.',
      },
      {
        question: 'Where can I buy TON with a bonus?',
        answer: 'Bybit, Binance, OKX, and MEXC all support TON spot trading. Bybit offers the highest new-user bonus (up to 30,000 USDT) for eligible users who deposit and trade.',
      },
      {
        question: 'Can I buy TON without KYC?',
        answer: 'Yes. MEXC and KuCoin support TON trading without full identity verification.',
      },
      {
        question: 'What network do I use to deposit TON?',
        answer: 'TON only has one network — the TON native blockchain. Always select "TON" as the deposit network. Some exchanges require a memo/comment for TON deposits — include it to ensure your funds are credited correctly.',
      },
    ],
    relatedCategorySlug: 'signup-bonuses',
    priority: 'high',
  },

  {
    slug: 'ada',
    symbol: 'ADA',
    label: 'Cardano (ADA)',
    seoTitle: 'Best Exchanges to Buy Cardano (ADA) With Bonus 2026',
    metaDesc: 'Compare the best exchanges to buy Cardano (ADA) in 2026. No-KYC options, staking support, and welcome bonuses. Verified listings for 2026.',
    supportedBy: ['bybit', 'binance', 'mexc', 'okx', 'kucoin', 'gate-io', 'bitget', 'bingx', 'htx', 'coinex', 'lbank', 'coinbase'],
    noKycExchanges: ['mexc', 'kucoin', 'coinex'],
    intro: 'Cardano (ADA) is a proof-of-stake blockchain platform designed with peer-reviewed academic research. It is known for its energy efficiency, formal verification, and multi-layer architecture separating settlement from computation.',
    useCase: 'ADA is used to pay transaction fees on Cardano, for staking to earn rewards (~4–5% APY), governance participation, and as a DeFi asset in the Cardano ecosystem.',
    networks: [
      { name: 'Cardano (Native)', note: 'The only network for ADA — always use native Cardano' },
    ],
    recommendedNetwork: 'Cardano (Native)',
    minBuyNote: 'Buy from $1 worth of ADA',
    quickFacts: [
      { label: 'Symbol', value: 'ADA' },
      { label: 'Consensus', value: 'Ouroboros Proof-of-Stake' },
      { label: 'Staking APY', value: '~4–5% (market-variable)' },
      { label: 'Exchanges available', value: '12 of 14 tracked exchanges' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx' },
      { label: 'Staking available', value: 'Yes — Binance, Bybit, Coinbase, KuCoin' },
    ],
    faq: [
      {
        question: 'Which exchange is best for buying Cardano?',
        answer: 'Binance, Bybit, and OKX offer the best liquidity for ADA. Coinbase is the best regulated option for US/UK users. MEXC and KuCoin are the best no-KYC alternatives.',
      },
      {
        question: 'Can I stake ADA on an exchange?',
        answer: 'Yes. Binance, Bybit, Coinbase, and KuCoin offer ADA staking with approximate APY of 4–5%. Note that exchange staking is custodial — you do not control the validator keys.',
      },
      {
        question: 'Can I buy ADA without KYC?',
        answer: 'Yes. MEXC and KuCoin support ADA trading without full identity verification.',
      },
    ],
    relatedCategorySlug: 'deposit-bonuses',
    priority: 'high',
  },

  {
    slug: 'avax',
    symbol: 'AVAX',
    label: 'Avalanche (AVAX)',
    seoTitle: 'Best Exchanges to Buy Avalanche (AVAX) With Bonus 2026',
    metaDesc: 'Compare exchanges to buy Avalanche (AVAX) in 2026. Fast EVM-compatible blockchain, no-KYC options, and signup bonuses. Verified for 2026.',
    supportedBy: ['bybit', 'binance', 'mexc', 'okx', 'kucoin', 'gate-io', 'bitget', 'bingx', 'htx', 'coinex', 'coinbase'],
    noKycExchanges: ['mexc', 'kucoin', 'coinex'],
    intro: 'Avalanche (AVAX) is a high-throughput Layer-1 blockchain with three built-in chains (X-Chain, C-Chain, P-Chain) and sub-second finality. Its EVM-compatible C-Chain supports Ethereum-based DeFi protocols, making it a popular alternative to Ethereum.',
    useCase: 'AVAX is used for transaction fees on the Avalanche network, staking (validators and delegators), subnet creation, and participation in Avalanche DeFi protocols.',
    networks: [
      { name: 'Avalanche C-Chain', note: 'EVM-compatible — most commonly used for exchange deposits' },
      { name: 'Avalanche X-Chain', note: 'Original Avalanche chain — used for some exchange withdrawals' },
    ],
    recommendedNetwork: 'Avalanche C-Chain',
    minBuyNote: 'Buy from $1 worth of AVAX',
    quickFacts: [
      { label: 'Symbol', value: 'AVAX' },
      { label: 'Finality', value: 'Under 2 seconds' },
      { label: 'EVM compatible', value: 'Yes (C-Chain)' },
      { label: 'Exchanges available', value: '11 of 14 tracked exchanges' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx' },
      { label: 'Best bonus exchange', value: 'Bybit — up to 30,000 USDT' },
    ],
    faq: [
      {
        question: 'What is the best exchange to buy Avalanche?',
        answer: 'Binance, Bybit, and OKX offer the best liquidity for AVAX with competitive fees. MEXC and KuCoin are the best no-KYC options.',
      },
      {
        question: 'Which Avalanche network should I use for deposits?',
        answer: 'Use the Avalanche C-Chain for most exchange deposits — it is EVM-compatible and the most widely accepted. Some exchanges use the X-Chain — always check the exchange\'s deposit instructions.',
      },
      {
        question: 'Can I buy AVAX without KYC?',
        answer: 'Yes. MEXC and KuCoin support AVAX trading without full identity verification.',
      },
    ],
    relatedCategorySlug: 'deposit-bonuses',
    priority: 'medium',
  },

  {
    slug: 'trx',
    symbol: 'TRX',
    label: 'TRON (TRX)',
    seoTitle: 'Best Exchanges to Buy TRON (TRX) With Bonus 2026',
    metaDesc: 'Compare the best exchanges to buy TRON (TRX) in 2026. The TRC-20 network token — low fees, no-KYC options, and welcome bonuses.',
    supportedBy: ['bybit', 'binance', 'mexc', 'okx', 'kucoin', 'gate-io', 'bitget', 'bingx', 'htx', 'coinex', 'lbank'],
    noKycExchanges: ['mexc', 'kucoin', 'coinex'],
    intro: 'TRON (TRX) is the native currency of the TRON blockchain — the network that powers TRC-20 tokens, including USDT-TRC20, the most popular low-fee stablecoin transfer method. TRON processes millions of transactions daily with near-zero fees.',
    useCase: 'TRX is used to pay for transaction fees on the TRON network, to earn bandwidth and energy for TRC-20 token transfers (including free USDT-TRC20 transfers when holding TRX), staking, and DeFi participation.',
    networks: [
      { name: 'TRON (TRC-20)', note: 'The native TRON network — use for all TRX transfers' },
    ],
    recommendedNetwork: 'TRON (TRC-20)',
    minBuyNote: 'Buy from $1 worth of TRX',
    geoNote: 'TRON is especially popular in Asia, particularly China, due to its low-cost stablecoin transfer infrastructure.',
    quickFacts: [
      { label: 'Symbol', value: 'TRX' },
      { label: 'Key use', value: 'Powers TRC-20 transfers (USDT-TRC20 gas)' },
      { label: 'Transaction fee', value: '~0 TRX for basic transfers (energy model)' },
      { label: 'Exchanges available', value: '11 of 14 tracked exchanges' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx' },
      { label: 'Staking available', value: 'Yes — stake TRX for energy/bandwidth' },
    ],
    faq: [
      {
        question: 'What is TRX and why do people buy it?',
        answer: 'TRX is the gas token for the TRON network. People buy TRX primarily to cover USDT-TRC20 transfer fees — staking TRX provides "energy" that makes USDT transfers on TRC-20 essentially free. It is also traded as a speculative asset.',
      },
      {
        question: 'Where can I buy TRX without KYC?',
        answer: 'MEXC, KuCoin, and CoinEx support TRX trading without full identity verification.',
      },
      {
        question: 'What is the best network for TRX?',
        answer: 'TRX only exists on the TRON network. Always select "TRC-20" or "TRON" as the deposit network when sending TRX to an exchange.',
      },
    ],
    relatedCategorySlug: 'deposit-bonuses',
    priority: 'medium',
  },

  {
    slug: 'link',
    symbol: 'LINK',
    label: 'Chainlink (LINK)',
    seoTitle: 'Best Exchanges to Buy Chainlink (LINK) With Bonus 2026',
    metaDesc: 'Compare exchanges to buy Chainlink (LINK) in 2026. The leading DeFi oracle token — no-KYC options, signup bonuses, and verified listings.',
    supportedBy: ['bybit', 'binance', 'mexc', 'okx', 'kucoin', 'gate-io', 'bitget', 'bingx', 'htx', 'coinex', 'coinbase'],
    noKycExchanges: ['mexc', 'kucoin', 'coinex'],
    intro: 'Chainlink (LINK) is the leading decentralised oracle network, providing real-world data to smart contracts across hundreds of blockchains. LINK is the token used to pay Chainlink node operators for fetching and validating off-chain data.',
    useCase: 'LINK is used to pay for Chainlink oracle services, staked by node operators as collateral, and held by DeFi projects and investors betting on the growth of the oracle economy.',
    networks: [
      { name: 'ERC-20 (Ethereum)', note: 'Native LINK network — most widely accepted' },
      { name: 'BEP-20 (BSC)', note: 'Wrapped LINK on Binance Smart Chain — lower fees' },
    ],
    recommendedNetwork: 'ERC-20 (Ethereum)',
    quickFacts: [
      { label: 'Symbol', value: 'LINK' },
      { label: 'Category', value: 'Decentralised oracle network token' },
      { label: 'Exchanges available', value: '11 of 14 tracked exchanges' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx' },
      { label: 'Best bonus exchange', value: 'Bybit — up to 30,000 USDT' },
      { label: 'Staking', value: 'LINK staking available via Chainlink Staking v0.2' },
    ],
    faq: [
      {
        question: 'Where is the best exchange to buy Chainlink?',
        answer: 'Binance, Bybit, and OKX offer the best LINK liquidity. Coinbase is the best regulated option. MEXC and KuCoin are the best no-KYC alternatives.',
      },
      {
        question: 'Can I buy LINK without KYC?',
        answer: 'Yes. MEXC and KuCoin support LINK trading without full identity verification.',
      },
      {
        question: 'What is Chainlink used for?',
        answer: 'Chainlink provides tamper-proof price feeds, random number generation, and other real-world data to smart contracts. It is the most widely used oracle solution in DeFi — over $20 trillion in value has been secured by Chainlink oracles.',
      },
    ],
    relatedCategorySlug: 'deposit-bonuses',
    priority: 'medium',
  },

  {
    slug: 'dot',
    symbol: 'DOT',
    label: 'Polkadot (DOT)',
    seoTitle: 'Best Exchanges to Buy Polkadot (DOT) With Bonus 2026',
    metaDesc: 'Compare exchanges to buy Polkadot (DOT) in 2026. Multi-chain interoperability token — no-KYC options, staking, and signup bonuses.',
    supportedBy: ['bybit', 'binance', 'mexc', 'okx', 'kucoin', 'gate-io', 'bitget', 'bingx', 'htx', 'coinex', 'coinbase'],
    noKycExchanges: ['mexc', 'kucoin', 'coinex'],
    intro: 'Polkadot (DOT) is a multi-chain network that connects different blockchains (parachains) enabling cross-chain communication and interoperability. DOT is the governance and staking token of the Polkadot relay chain.',
    useCase: 'DOT is used for staking (securing the network and earning rewards), parachain lease auctions (bonding DOT to support new parachain projects), governance voting, and as a speculative trading asset.',
    networks: [
      { name: 'Polkadot (Native)', note: 'The only network for DOT transfers — always use native Polkadot' },
    ],
    recommendedNetwork: 'Polkadot (Native)',
    quickFacts: [
      { label: 'Symbol', value: 'DOT' },
      { label: 'Staking APY', value: '~12–15% (unbonding period: 28 days)' },
      { label: 'Exchanges available', value: '11 of 14 tracked exchanges' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx' },
      { label: 'Best bonus exchange', value: 'Bybit — up to 30,000 USDT' },
    ],
    faq: [
      {
        question: 'Where can I buy DOT with the best bonus?',
        answer: 'Bybit, Binance, and OKX support DOT spot trading with competitive bonuses. MEXC and KuCoin are the best no-KYC options for buying Polkadot.',
      },
      {
        question: 'Can I stake DOT on an exchange?',
        answer: 'Yes. Binance and Kraken offer DOT staking. Note that native Polkadot staking has a 28-day unbonding period — exchange liquid staking products may offer faster withdrawal.',
      },
      {
        question: 'Can I buy Polkadot without KYC?',
        answer: 'Yes. MEXC and KuCoin support DOT trading without full identity verification.',
      },
    ],
    relatedCategorySlug: 'deposit-bonuses',
    priority: 'medium',
  },

  {
    slug: 'ltc',
    symbol: 'LTC',
    label: 'Litecoin (LTC)',
    seoTitle: 'Best Exchanges to Buy Litecoin (LTC) With Bonus 2026',
    metaDesc: 'Compare exchanges to buy Litecoin (LTC) in 2026. Fast, low-fee digital payments coin — no-KYC options and signup bonuses. Verified for 2026.',
    supportedBy: ['bybit', 'binance', 'mexc', 'okx', 'kucoin', 'gate-io', 'bitget', 'bingx', 'htx', 'coinex', 'lbank', 'coinbase'],
    noKycExchanges: ['mexc', 'kucoin', 'coinex'],
    intro: 'Litecoin (LTC) is one of the oldest cryptocurrencies, launched in 2011 as a faster and cheaper alternative to Bitcoin. It uses the Scrypt proof-of-work algorithm and processes blocks 4x faster than Bitcoin (2.5-minute block time).',
    useCase: 'LTC is used for fast, low-cost peer-to-peer payments, as a store of value, and as a testing ground for Bitcoin protocol upgrades (SegWit and Lightning Network both launched on Litecoin before Bitcoin).',
    networks: [
      { name: 'Litecoin (Native)', note: 'The primary and most widely supported LTC network' },
      { name: 'BEP-20 (BSC)', note: 'Wrapped LTC on Binance Smart Chain — confirm support before using' },
    ],
    recommendedNetwork: 'Litecoin (Native)',
    minBuyNote: 'Buy from $1 worth of LTC',
    quickFacts: [
      { label: 'Symbol', value: 'LTC' },
      { label: 'Block time', value: '~2.5 minutes' },
      { label: 'Transaction fee', value: '~$0.01–0.05 per transfer' },
      { label: 'Exchanges available', value: '12 of 14 tracked exchanges' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx' },
      { label: 'Best bonus exchange', value: 'Bybit — up to 30,000 USDT' },
    ],
    faq: [
      {
        question: 'Is Litecoin still a good buy in 2026?',
        answer: 'This site does not provide investment advice. Litecoin is a mature, widely-supported cryptocurrency with established infrastructure. Always research independently and only invest what you can afford to lose.',
      },
      {
        question: 'Which exchange is best for buying Litecoin?',
        answer: 'Binance, Bybit, and OKX offer the best LTC liquidity. Coinbase is the most regulated option. MEXC and KuCoin are the best no-KYC alternatives.',
      },
      {
        question: 'Can I buy Litecoin without KYC?',
        answer: 'Yes. MEXC and KuCoin support LTC trading without full identity verification.',
      },
    ],
    relatedCategorySlug: 'deposit-bonuses',
    priority: 'medium',
  },

  {
    slug: 'pepe',
    symbol: 'PEPE',
    label: 'Pepe (PEPE)',
    seoTitle: 'Best Exchanges to Buy PEPE Coin With Bonus 2026',
    metaDesc: 'Compare exchanges to buy PEPE coin in 2026. Top meme coin — find the best bonus offers, no-KYC options, and verified PEPE listings.',
    supportedBy: ['bybit', 'binance', 'mexc', 'okx', 'kucoin', 'gate-io', 'bitget', 'bingx', 'htx', 'coinex'],
    noKycExchanges: ['mexc', 'kucoin', 'coinex'],
    intro: 'PEPE is a meme cryptocurrency based on the Pepe the Frog internet meme. Launched in April 2023, it rapidly became one of the most traded meme coins, reaching a multi-billion dollar market cap within weeks of launch.',
    useCase: 'PEPE is a pure speculative and community-driven token with no utility beyond trading and collecting. It is popular among short-term traders looking for high-volatility opportunities.',
    networks: [
      { name: 'ERC-20 (Ethereum)', note: 'Primary PEPE network — most exchanges use ERC-20' },
    ],
    recommendedNetwork: 'ERC-20 (Ethereum)',
    minBuyNote: 'PEPE can be bought in any amount — the token has many zeros (e.g. 0.000001 USDT per token)',
    geoNote: 'PEPE trading is popular globally but check whether your country restricts meme coin trading.',
    quickFacts: [
      { label: 'Symbol', value: 'PEPE' },
      { label: 'Category', value: 'Meme coin (no utility)' },
      { label: 'Network', value: 'ERC-20 (Ethereum)' },
      { label: 'Exchanges available', value: '10 of 14 tracked exchanges' },
      { label: 'No-KYC available', value: 'Yes — MEXC, KuCoin, CoinEx' },
      { label: 'Risk level', value: 'Very high — extreme volatility' },
    ],
    faq: [
      {
        question: 'Where can I buy PEPE coin?',
        answer: 'PEPE is available on Bybit, Binance, OKX, MEXC, KuCoin, and several other major exchanges. MEXC and KuCoin are the best no-KYC options. Bybit, Binance, and OKX offer the best liquidity.',
      },
      {
        question: 'Is PEPE a good investment?',
        answer: 'PEPE is an extremely high-risk meme coin with no fundamental utility. It can gain or lose 50–80% of its value in days. This site does not provide investment advice — treat PEPE as pure speculation and only allocate what you can afford to lose entirely.',
      },
      {
        question: 'Can I buy PEPE without KYC?',
        answer: 'Yes. MEXC and KuCoin support PEPE trading without full identity verification, making them the easiest no-KYC options for buying PEPE.',
      },
      {
        question: 'What network does PEPE use?',
        answer: 'PEPE is an ERC-20 token on the Ethereum network. When depositing PEPE to an exchange, always select the ERC-20 (Ethereum) network. Note that ERC-20 gas fees can be $2–10 during high-congestion periods.',
      },
    ],
    relatedCategorySlug: 'signup-bonuses',
    priority: 'medium',
  },
];

export function getCoinBySlug(slug: string): CoinData | null {
  return COINS.find(c => c.slug === slug) ?? null;
}

export function getAllCoinSlugs(): string[] {
  return COINS.map(c => c.slug);
}
