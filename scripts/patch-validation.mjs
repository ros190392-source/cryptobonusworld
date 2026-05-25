/**
 * patch-validation.mjs
 * Adds offerConfidenceScore, realisticUserExpectation, verificationLastChecked,
 * bonusConditionSummary to all exchanges in exchanges.json.
 * Also updates bonusDisplayMode for OKX, Phemex, LBank → 'campaign'.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../src/data/exchanges.json');

const exchanges = JSON.parse(readFileSync(dataPath, 'utf8'));

const validationData = {
  bybit: {
    offerConfidenceScore: 72,
    realisticUserExpectation: 'Most users earn 200–600 USDT completing deposit + trading tasks; 30,000 USDT max requires very high trading volume over 30 days',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Complete KYC + deposit + trading volume tasks within 30 days',
    bonusNote: 'Up to 30,000 USDT across all tasks — typical first-week reward is 200–600 USDT for standard deposits',
  },
  mexc: {
    offerConfidenceScore: 84,
    realisticUserExpectation: 'Typical reward is 30–150 USDT; accessible without KYC for standard tiers; tasks are straightforward',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Register + complete trading tasks; most tiers available without KYC',
    bonusNote: 'Up to 8,000 USDT in task rewards — typical first-week earnings 30–150 USDT; no-KYC tiers available',
  },
  okx: {
    offerConfidenceScore: 68,
    realisticUserExpectation: 'Mystery box value varies; typical users receive 50–300 USDT equivalent; value depends on active campaigns',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Deposit required; mystery box rewards vary by campaign; check official site for current offer',
    bonusNote: 'Campaign-based mystery box rewards — typical value 50–300 USDT; verify current offer on OKX official website',
    bonusDisplayMode: 'campaign',
  },
  bitget: {
    offerConfidenceScore: 74,
    realisticUserExpectation: 'Typical new user earns 100–400 USDT completing KYC, deposit and futures trial tasks',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Complete KYC + deposit + futures trading task within 30 days',
    bonusNote: 'Up to 6,200 USDT across all bonus tasks — typical first-month reward is 100–400 USDT',
  },
  bingx: {
    offerConfidenceScore: 74,
    realisticUserExpectation: 'Most users earn 50–250 USDT through deposit bonuses and copy-trading trial rewards',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Deposit + enable copy-trading or complete trading volume tasks',
    bonusNote: 'Up to 5,125 USDT in combined bonuses — typical reward for standard deposit is 50–250 USDT',
  },
  'gate-io': {
    offerConfidenceScore: 75,
    realisticUserExpectation: 'Typical welcome reward is 50–200 USDT; accessible through standard deposit and spot trading',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Complete KYC + deposit + spot or futures trading task',
    bonusNote: 'Up to 10,000 USDT in task rewards — typical accessible reward is 50–200 USDT for standard activity',
  },
  kucoin: {
    offerConfidenceScore: 82,
    realisticUserExpectation: 'Typical no-KYC users earn 20–100 USDT; straightforward deposit tasks with no identity verification required',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Deposit + trade; no KYC required for lower tiers; higher tiers require identity verification',
    bonusNote: 'Up to 500 USDT — typical reward 20–100 USDT; no-KYC tiers are genuinely accessible',
  },
  htx: {
    offerConfidenceScore: 74,
    realisticUserExpectation: 'Most users earn 50–200 USDT through deposit and spot trading tasks; campaign availability varies by region',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Deposit + complete trading tasks within campaign period',
    bonusNote: 'Up to 6,800 USDT across tasks — typical first-month reward is 50–200 USDT',
  },
  coinex: {
    offerConfidenceScore: 87,
    realisticUserExpectation: 'Signup bonus is genuinely no-condition; typical users receive 10–60 USDT automatically upon registration and first trade',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Register + complete first trade; no deposit required for base reward',
    bonusNote: 'Signup + trading task rewards up to 300 USDT — base reward (10–60 USDT) genuinely no-deposit required',
  },
  phemex: {
    offerConfidenceScore: 66,
    realisticUserExpectation: 'Bonus availability changes frequently; current campaigns typically offer 50–200 USDT; verify on official site before signing up',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Campaign-based; deposit + trading volume required; terms change regularly',
    bonusNote: 'Campaign-based welcome offer — verify current bonus on Phemex official website before registering',
    bonusDisplayMode: 'campaign',
  },
  bitunix: {
    offerConfidenceScore: 78,
    realisticUserExpectation: 'Newer exchange; typical users earn 30–120 USDT through deposit and futures trading tasks; high-tier bonuses require significant volume',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Deposit + futures trading volume tasks; KYC required for higher tiers',
    bonusNote: 'Up to 8,000 USDT — typical accessible reward for new users is 30–120 USDT',
  },
  lbank: {
    offerConfidenceScore: 68,
    realisticUserExpectation: 'Smaller exchange with campaign-based offers; typical current promotions offer 20–100 USDT; verify on official site',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Campaign-based; deposit + trading task; terms vary by active promotion',
    bonusNote: 'Campaign-based welcome bonus — check current offer on LBank official website',
    bonusDisplayMode: 'campaign',
  },
  binance: {
    offerConfidenceScore: 88,
    realisticUserExpectation: '100 USDT max is achievable with standard KYC + deposit; straightforward conditions, widely accessible',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Complete KYC + make first deposit; standard trading activity required',
    bonusNote: 'Up to 100 USDT welcome reward — reliable, verifiable offer with standard KYC and deposit conditions',
  },
  coinbase: {
    offerConfidenceScore: 95,
    realisticUserExpectation: '$10 in BTC is received reliably upon completing first trade; no gimmicks, no volume requirements',
    verificationLastChecked: '2026-05-25',
    bonusConditionSummary: 'Buy or sell $100+ of crypto; $10 BTC credited automatically',
    bonusNote: '$10 BTC upon first qualifying trade — most reliable and straightforward bonus in the industry',
  },
};

let updated = 0;
for (const ex of exchanges) {
  const patch = validationData[ex.slug];
  if (!patch) {
    console.warn(`No validation data for slug: ${ex.slug}`);
    continue;
  }
  ex.offerConfidenceScore = patch.offerConfidenceScore;
  ex.realisticUserExpectation = patch.realisticUserExpectation;
  ex.verificationLastChecked = patch.verificationLastChecked;
  ex.bonusConditionSummary = patch.bonusConditionSummary;
  ex.bonusNote = patch.bonusNote;
  if (patch.bonusDisplayMode) {
    ex.bonusDisplayMode = patch.bonusDisplayMode;
  }
  updated++;
}

writeFileSync(dataPath, JSON.stringify(exchanges, null, 2) + '\n', 'utf8');
console.log(`Patched ${updated}/${exchanges.length} exchanges with validation data.`);
