/**
 * CryptoBonusWorld — Evidence Registry Index
 *
 * Central registry mapping exchange slugs to their evidence data.
 * Import this to look up evidence for any exchange at build time.
 *
 * Usage:
 *   import { getExchangeEvidence } from '../data/evidence';
 *   const ev = getExchangeEvidence('bybit');
 */

import type { ExchangeEvidence } from './_schema';

import bybit    from './bybit.json'    assert { type: 'json' };
import binance  from './binance.json'  assert { type: 'json' };
import mexc     from './mexc.json'     assert { type: 'json' };
import okx      from './okx.json'      assert { type: 'json' };
import bitget   from './bitget.json'   assert { type: 'json' };
import bingx    from './bingx.json'    assert { type: 'json' };
import gateIo   from './gate-io.json'  assert { type: 'json' };
import kucoin   from './kucoin.json'   assert { type: 'json' };
import htx      from './htx.json'      assert { type: 'json' };
import coinex   from './coinex.json'   assert { type: 'json' };
import phemex   from './phemex.json'   assert { type: 'json' };
import bitunix  from './bitunix.json'  assert { type: 'json' };
import lbank    from './lbank.json'    assert { type: 'json' };
import coinbase from './coinbase.json' assert { type: 'json' };

const EVIDENCE_REGISTRY: Record<string, ExchangeEvidence> = {
  bybit:    bybit    as unknown as ExchangeEvidence,
  binance:  binance  as unknown as ExchangeEvidence,
  mexc:     mexc     as unknown as ExchangeEvidence,
  okx:      okx      as unknown as ExchangeEvidence,
  bitget:   bitget   as unknown as ExchangeEvidence,
  bingx:    bingx    as unknown as ExchangeEvidence,
  'gate-io': gateIo  as unknown as ExchangeEvidence,
  kucoin:   kucoin   as unknown as ExchangeEvidence,
  htx:      htx      as unknown as ExchangeEvidence,
  coinex:   coinex   as unknown as ExchangeEvidence,
  phemex:   phemex   as unknown as ExchangeEvidence,
  bitunix:  bitunix  as unknown as ExchangeEvidence,
  lbank:    lbank    as unknown as ExchangeEvidence,
  coinbase: coinbase as unknown as ExchangeEvidence,
};

/**
 * Get evidence data for a specific exchange by slug.
 * Returns undefined if the exchange has no evidence file yet.
 */
export function getExchangeEvidence(slug: string): ExchangeEvidence | undefined {
  return EVIDENCE_REGISTRY[slug];
}

/**
 * Get all exchanges that have evidence files.
 */
export function getAllEvidenceSlugs(): string[] {
  return Object.keys(EVIDENCE_REGISTRY);
}

/**
 * Get the full registry — used by the audit script.
 */
export function getEvidenceRegistry(): Record<string, ExchangeEvidence> {
  return EVIDENCE_REGISTRY;
}

export type { ExchangeEvidence };
