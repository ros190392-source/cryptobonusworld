import { readFileSync, writeFileSync } from 'fs';

const path = 'src/data/content-overrides.json';
const data = JSON.parse(readFileSync(path, 'utf8'));

const experienceData = {
  bybit: {
    onboarding:       { rating: 'Medium', note: 'Email + phone + KYC required; takes 5–15 min with a clear document' },
    mobileApp:        { rating: 'Excellent', note: 'Full-featured iOS/Android app with derivatives, copy trading and P2P — matches desktop' },
    beginnerFriendly: { rating: 'With guidance', note: 'Unified trading account is powerful but complex; use the Learn section before trading futures' },
    withdrawalSpeed:  { rating: 'Fast', note: 'Crypto withdrawals typically confirmed within 10–30 min; fiat via P2P same day' },
    liquidityDepth:   { rating: 'Deep', note: 'Top-3 derivatives volume globally; tight spreads on BTC/ETH perpetuals even during volatility' },
    customerSupport:  { rating: 'Good', note: '24/7 live chat; typical first response under 3 min, complex issues may take 24–48 h' },
  },
  binance: {
    onboarding:       { rating: 'Medium', note: 'Multi-step KYC; some regions face extra checks — allow 30 min for full verification' },
    mobileApp:        { rating: 'Good', note: 'Polished app but occasionally laggy during peak volume; covers all major product lines' },
    beginnerFriendly: { rating: 'With guidance', note: 'Simple and Pro modes help; the full product suite is overwhelming for first-time users' },
    withdrawalSpeed:  { rating: 'Fast', note: 'On-chain withdrawals are fast; fiat withdrawals via SEPA/local methods typically same-day' },
    liquidityDepth:   { rating: 'Deep', note: 'Largest spot and futures liquidity globally; market impact minimal even on large orders' },
    customerSupport:  { rating: 'Good', note: '24/7 chat and ticket system; response quality varies but serious issues usually escalated quickly' },
  },
  okx: {
    onboarding:       { rating: 'Medium', note: 'Smooth KYC flow with liveness check; registration to first trade typically under 20 min' },
    mobileApp:        { rating: 'Excellent', note: 'Consistently rated among the best crypto apps; fast, stable, Web3 wallet built in' },
    beginnerFriendly: { rating: 'With guidance', note: 'Beginner mode available but advanced tools are always visible — take the onboarding tour' },
    withdrawalSpeed:  { rating: 'Fast', note: 'Withdrawals processed quickly; network fee estimates accurate; USDT-TRC20 is near-instant' },
    liquidityDepth:   { rating: 'Deep', note: 'Top-3 derivatives exchange; deep order books across 500+ pairs including low-cap altcoins' },
    customerSupport:  { rating: 'Good', note: 'Live chat responsive; knowledge base is thorough; community channels active on Telegram' },
  },
  mexc: {
    onboarding:       { rating: 'Easy', note: 'Spot trading available with email only; KYC only required for fiat or higher withdrawal limits' },
    mobileApp:        { rating: 'Good', note: 'Functional app; occasionally slow on new listing pages but reliable for standard trading' },
    beginnerFriendly: { rating: 'With guidance', note: 'Low barrier to entry, but the wide coin selection and futures interface can disorient newcomers' },
    withdrawalSpeed:  { rating: 'Fast', note: 'On-chain withdrawals are quick; some network options can be slow — always select optimal network' },
    liquidityDepth:   { rating: 'Good', note: 'Deep on major pairs; thinner on new listings which can show high slippage at launch' },
    customerSupport:  { rating: 'Fair', note: 'Live chat available but response times are inconsistent; complex cases can take 24–72 h' },
  },
  coinbase: {
    onboarding:       { rating: 'Involved', note: 'Most thorough KYC in the industry; government ID + facial scan + address verification required' },
    mobileApp:        { rating: 'Excellent', note: 'Best-in-class UX; clean design, instant buy/sell, Coinbase Card and DeFi integrations' },
    beginnerFriendly: { rating: 'Yes', note: 'Designed from the ground up for first-time crypto buyers; guided buy flows and educational rewards' },
    withdrawalSpeed:  { rating: 'Normal', note: 'ACH bank withdrawals take 1–3 days; crypto on-chain is fast; wire transfers same day for US' },
    liquidityDepth:   { rating: 'Good', note: 'Strong on major assets; Advanced Trade has competitive depth; thin on altcoin tail' },
    customerSupport:  { rating: 'Good', note: 'Phone and chat support available; identity-related issues resolved faster than most peers' },
  },
  bitget: {
    onboarding:       { rating: 'Medium', note: 'Standard KYC process; email + ID verification; usually complete within 10–20 min' },
    mobileApp:        { rating: 'Good', note: 'Well-designed app with copy trading prominently featured; stable during high-volume periods' },
    beginnerFriendly: { rating: 'With guidance', note: 'Copy trading lowers the entry barrier significantly; still requires understanding of risk' },
    withdrawalSpeed:  { rating: 'Fast', note: 'Withdrawals processed promptly; multiple network choices; EVM chains particularly fast' },
    liquidityDepth:   { rating: 'Good', note: 'Solid spot and futures depth on top 100 pairs; tighter spreads than mid-tier exchanges' },
    customerSupport:  { rating: 'Good', note: '24/7 live chat with reasonable wait times; proactive outreach during major market events' },
  },
  kucoin: {
    onboarding:       { rating: 'Easy', note: 'Email-only registration gives access to basic trading; KYC unlocks higher limits and fiat' },
    mobileApp:        { rating: 'Good', note: 'Feature-rich app; bot trading and lending accessible from mobile; occasional UI inconsistencies' },
    beginnerFriendly: { rating: 'With guidance', note: 'Huge product range can overwhelm; KuCoin Learn section helps but navigation is complex' },
    withdrawalSpeed:  { rating: 'Fast', note: 'Withdrawals generally fast; KCS-denominated fees are low; manual review rare but can delay' },
    liquidityDepth:   { rating: 'Good', note: 'Strong on altcoins — often first exchange for new projects; BTC/ETH depth is below top tier' },
    customerSupport:  { rating: 'Fair', note: 'Ticket system is the main channel; live chat queue can be long; complex issues take days' },
  },
  bingx: {
    onboarding:       { rating: 'Easy', note: 'Simple registration with quick KYC; most users verified within 10 min' },
    mobileApp:        { rating: 'Good', note: 'Clean app focused on copy trading and grid bots; less cluttered than competitors' },
    beginnerFriendly: { rating: 'Yes', note: 'Copy trading with one-tap follow, grid bots with templates — genuinely accessible for beginners' },
    withdrawalSpeed:  { rating: 'Fast', note: 'Withdrawals processed quickly; P2P fiat off-ramp available in many regions' },
    liquidityDepth:   { rating: 'Moderate', note: 'Good on popular pairs; thinner on altcoin perpetuals; not suitable for large block trades' },
    customerSupport:  { rating: 'Fair', note: 'Live chat available; response quality is acceptable but not industry-leading' },
  },
  'gate-io': {
    onboarding:       { rating: 'Involved', note: 'Detailed KYC with enhanced due diligence for high withdrawal tiers; full process takes 20–40 min' },
    mobileApp:        { rating: 'Good', note: 'Comprehensive app matching desktop feature set; 1,700+ trading pairs accessible; UI is dense' },
    beginnerFriendly: { rating: 'Not recommended', note: 'Overwhelming number of products, tokens and settings — best suited to experienced traders' },
    withdrawalSpeed:  { rating: 'Fast', note: 'On-chain withdrawals fast across most networks; fiat options depend on region and method' },
    liquidityDepth:   { rating: 'Good', note: 'Top 5 exchange by altcoin liquidity; deep on emerging tokens; futures depth is solid' },
    customerSupport:  { rating: 'Fair', note: 'Support covers many languages; response times variable; known issues with complex account disputes' },
  },
  htx: {
    onboarding:       { rating: 'Medium', note: 'KYC required; straightforward process but platform branding changes (Huobi→HTX) can confuse newcomers' },
    mobileApp:        { rating: 'Fair', note: 'Functional but dated UI; some features from the desktop platform are absent in the app' },
    beginnerFriendly: { rating: 'With guidance', note: 'Long-established platform with good educational content, but the interface shows its age' },
    withdrawalSpeed:  { rating: 'Fast', note: 'Withdrawals reliable for major networks; smaller chain support can be slower' },
    liquidityDepth:   { rating: 'Moderate', note: 'Formerly top-3; liquidity has declined since 2022; still adequate for most retail trades' },
    customerSupport:  { rating: 'Fair', note: 'Support available but quality reviews are mixed; better in Asian time zones' },
  },
  coinex: {
    onboarding:       { rating: 'Easy', note: 'Email registration; KYC optional for basic trading — one of the lowest barriers on the list' },
    mobileApp:        { rating: 'Fair', note: 'Basic but functional app; AMM trading and perpetuals accessible; lacking advanced charting' },
    beginnerFriendly: { rating: 'With guidance', note: 'Simple interface helps beginners; but thin liquidity on altcoins can create bad fills' },
    withdrawalSpeed:  { rating: 'Fast', note: 'Crypto withdrawals processed quickly; CET fee discounts lower the cost of moving funds' },
    liquidityDepth:   { rating: 'Limited', note: 'Adequate for small to medium trades; not suitable for large orders or institutional size' },
    customerSupport:  { rating: 'Limited', note: 'Email and ticket-based; no 24/7 live chat; response times can reach 48+ hours' },
  },
  phemex: {
    onboarding:       { rating: 'Easy', note: 'Fast registration; futures trading accessible with minimal friction; KYC tiers for higher limits' },
    mobileApp:        { rating: 'Good', note: 'Clean, fast app; Gold Membership zero-fee trading accessible from mobile; good for active traders' },
    beginnerFriendly: { rating: 'Not recommended', note: 'Futures-first platform with complex risk tools; not designed as an entry point for new traders' },
    withdrawalSpeed:  { rating: 'Fast', note: 'Withdrawals are fast and reliable; fee structure is transparent' },
    liquidityDepth:   { rating: 'Moderate', note: 'Solid on major perpetual pairs; spot liquidity is thinner; not suitable for very large orders' },
    customerSupport:  { rating: 'Fair', note: 'Live chat and ticket support; response quality is acceptable; complex issues take time to resolve' },
  },
  bitunix: {
    onboarding:       { rating: 'Easy', note: 'Streamlined registration; futures access with low friction — standard for newer derivatives exchanges' },
    mobileApp:        { rating: 'Fair', note: 'Basic mobile app covering core futures functionality; lacks the polish of established competitors' },
    beginnerFriendly: { rating: 'Not recommended', note: 'Derivatives-only focus with limited educational resources; significant counterparty risk for beginners' },
    withdrawalSpeed:  { rating: 'Fast', note: 'Withdrawals processed in a timely manner; standard for the exchange tier' },
    liquidityDepth:   { rating: 'Limited', note: 'Adequate for small futures positions; spreads widen significantly on less popular pairs' },
    customerSupport:  { rating: 'Limited', note: 'Basic support channels; response times and quality lag behind established exchanges' },
  },
  lbank: {
    onboarding:       { rating: 'Medium', note: 'Standard KYC process; interface is less polished but functional; 20–30 min to complete' },
    mobileApp:        { rating: 'Fair', note: 'Functional app; P2P and spot trading accessible; UI quality is below modern standards' },
    beginnerFriendly: { rating: 'With guidance', note: 'P2P fiat access is a genuine entry point in underserved markets; overall UX needs improvement' },
    withdrawalSpeed:  { rating: 'Normal', note: 'Withdrawals are reliable but not the fastest; P2P off-ramp adds flexibility in emerging markets' },
    liquidityDepth:   { rating: 'Limited', note: 'Focused on emerging market tokens; major pair depth is limited; early listings carry high risk' },
    customerSupport:  { rating: 'Limited', note: 'Support coverage is inconsistent; best experience is in regions where LBank is most active' },
  },
};

let updated = 0;
for (const [slug, exp] of Object.entries(experienceData)) {
  if (data.exchanges[slug]) {
    data.exchanges[slug].experience = exp;
    updated++;
  } else {
    console.warn(`WARNING: Exchange slug "${slug}" not found in content-overrides.json`);
  }
}

writeFileSync(path, JSON.stringify(data, null, 2));
console.log(`Done. Updated experience data for ${updated} exchanges.`);
