/**
 * patch-trading-data.mjs
 * Adds trading metadata to all exchanges:
 *   - spotMakerFee / spotTakerFee (%)
 *   - futuresMakerFee / futuresTakerFee (%)
 *   - p2pAvailable (boolean)
 *   - maxFuturesLeverage (integer)
 *   - proofOfReserves (boolean)
 *   - tradingPairsCount (approximate number)
 *
 * Run: node scripts/patch-trading-data.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../src/data/exchanges.json');
const exchanges = JSON.parse(readFileSync(dataPath, 'utf8'));

const TRADING_DATA = {
  bybit: {
    spotMakerFee: 0.1, spotTakerFee: 0.1,
    futuresMakerFee: 0.01, futuresTakerFee: 0.06,
    p2pAvailable: true, maxFuturesLeverage: 100,
    proofOfReserves: true, tradingPairsCount: 1600,
  },
  binance: {
    spotMakerFee: 0.1, spotTakerFee: 0.1,
    futuresMakerFee: 0.02, futuresTakerFee: 0.05,
    p2pAvailable: true, maxFuturesLeverage: 125,
    proofOfReserves: true, tradingPairsCount: 1400,
  },
  okx: {
    spotMakerFee: 0.08, spotTakerFee: 0.1,
    futuresMakerFee: 0.02, futuresTakerFee: 0.05,
    p2pAvailable: true, maxFuturesLeverage: 100,
    proofOfReserves: true, tradingPairsCount: 600,
  },
  mexc: {
    spotMakerFee: 0.0, spotTakerFee: 0.2,
    futuresMakerFee: 0.0, futuresTakerFee: 0.01,
    p2pAvailable: true, maxFuturesLeverage: 200,
    proofOfReserves: false, tradingPairsCount: 1500,
  },
  kucoin: {
    spotMakerFee: 0.1, spotTakerFee: 0.1,
    futuresMakerFee: 0.02, futuresTakerFee: 0.06,
    p2pAvailable: true, maxFuturesLeverage: 100,
    proofOfReserves: true, tradingPairsCount: 700,
  },
  bitget: {
    spotMakerFee: 0.1, spotTakerFee: 0.1,
    futuresMakerFee: 0.02, futuresTakerFee: 0.06,
    p2pAvailable: false, maxFuturesLeverage: 125,
    proofOfReserves: true, tradingPairsCount: 800,
  },
  bingx: {
    spotMakerFee: 0.1, spotTakerFee: 0.1,
    futuresMakerFee: 0.02, futuresTakerFee: 0.05,
    p2pAvailable: false, maxFuturesLeverage: 150,
    proofOfReserves: false, tradingPairsCount: 500,
  },
  'gate-io': {
    spotMakerFee: 0.2, spotTakerFee: 0.2,
    futuresMakerFee: 0.015, futuresTakerFee: 0.05,
    p2pAvailable: true, maxFuturesLeverage: 100,
    proofOfReserves: true, tradingPairsCount: 2000,
  },
  htx: {
    spotMakerFee: 0.2, spotTakerFee: 0.2,
    futuresMakerFee: 0.02, futuresTakerFee: 0.05,
    p2pAvailable: true, maxFuturesLeverage: 100,
    proofOfReserves: false, tradingPairsCount: 600,
  },
  coinex: {
    spotMakerFee: 0.0, spotTakerFee: 0.1,
    futuresMakerFee: 0.03, futuresTakerFee: 0.05,
    p2pAvailable: false, maxFuturesLeverage: 100,
    proofOfReserves: false, tradingPairsCount: 800,
  },
  coinbase: {
    spotMakerFee: 0.4, spotTakerFee: 0.6,
    futuresMakerFee: 0.0, futuresTakerFee: 0.03,
    p2pAvailable: false, maxFuturesLeverage: 20,
    proofOfReserves: true, tradingPairsCount: 300,
  },
  phemex: {
    spotMakerFee: 0.1, spotTakerFee: 0.1,
    futuresMakerFee: 0.01, futuresTakerFee: 0.06,
    p2pAvailable: false, maxFuturesLeverage: 100,
    proofOfReserves: false, tradingPairsCount: 200,
  },
  bitunix: {
    spotMakerFee: 0.1, spotTakerFee: 0.1,
    futuresMakerFee: 0.02, futuresTakerFee: 0.06,
    p2pAvailable: false, maxFuturesLeverage: 100,
    proofOfReserves: false, tradingPairsCount: 200,
  },
  lbank: {
    spotMakerFee: 0.1, spotTakerFee: 0.1,
    futuresMakerFee: 0.02, futuresTakerFee: 0.05,
    p2pAvailable: true, maxFuturesLeverage: 100,
    proofOfReserves: false, tradingPairsCount: 600,
  },
};

let updated = 0;
for (const ex of exchanges) {
  const data = TRADING_DATA[ex.slug];
  if (data) {
    Object.assign(ex, data);
    updated++;
  }
}

writeFileSync(dataPath, JSON.stringify(exchanges, null, 2) + '\n', 'utf8');
console.log(`Updated ${updated} exchanges with trading data.`);
