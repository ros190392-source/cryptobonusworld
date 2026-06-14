import { readFileSync, writeFileSync } from 'fs';

const path = './src/data/content-overrides.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
const bn = data.exchanges.binance;

const newFaqs = [
  {
    question: "How much can I earn by referring friends to Binance?",
    answer: "With Binance Referral Pro, you earn up to 30% of every trading fee your referred friends pay — paid in real time to your Referral Commission wallet. For example, if 20 friends each trade $5,000/month, you earn approximately $30/month. High-volume referrers (100+ active traders) can earn $150–$500+/month. Commission rates are higher with the Affiliate Program (up to 41%), which requires a separate application and volume minimums."
  },
  {
    question: "Does the Binance referral code work for Futures trading?",
    answer: "Yes — the same code CRYPTOBONW works for both Spot and Futures on Binance. There is no separate futures-specific referral code. Futures fees are different: 0.02% maker / 0.05% taker (vs 0.1% on spot), and the BNB discount is 10% on Futures (vs 25% on spot). The 20% fee rebate from the referral code applies to Futures fees as well."
  },
  {
    question: "What are Binance Futures fees with the referral code CRYPTOBONW?",
    answer: "With code CRYPTOBONW at VIP 0: base fee is 0.02% maker / 0.05% taker. With BNB discount (10% on Futures): 0.018% maker / 0.045% taker. After the 20% referral rebate: approximately 0.014% maker / 0.036% taker — making Binance one of the lowest-cost futures venues available without VIP status. Compare: Bybit Futures with their referral code is 0.02%/0.055% before discounts."
  },
  {
    question: "Can my Futures trading volume count toward the Stage 2 bonus tiers?",
    answer: "Yes. Stage 2 bonus tiers (Tiers 4 through 7) count both Spot and Futures trading volume toward their requirements. Futures traders using leverage can reach volume requirements significantly faster than spot-only traders. For example, Tier 4 requires $500,000 in cumulative trading volume over 14 days — a futures trader using 10x leverage would need to deploy only $50,000 in capital to hit this tier, compared to $500,000 in spot capital."
  },
  {
    question: "How do I switch from Binance Referral Lite to Referral Pro to share a 20% discount?",
    answer: "Go to Profile > Referral > My Referral Link > Edit. In the commission split settings, switch from Referral Lite (you keep 100% of commission) to Referral Pro (you keep 30%, your friends get 20% fee discount). You must enable Referral Pro mode before your friends register — it cannot be applied retroactively to already-registered referrals. Once enabled, every new user who signs up with your code receives the 20% fee kickback automatically."
  }
];

bn.faqAppend.push(...newFaqs);
writeFileSync(path, JSON.stringify(data, null, 2));

const check = JSON.parse(readFileSync(path, 'utf8'));
console.log('FAQ count after update:', check.exchanges.binance.faqAppend.length);
check.exchanges.binance.faqAppend.slice(-5).forEach((q,i) =>
  console.log(check.exchanges.binance.faqAppend.length - 5 + i, q.question.substring(0, 80))
);
