#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-marketprofile-promotion-preflight-'));
const OUT = join(TMP, 'promotion-preflight.mjs');
const NOW_ISO = '2026-08-09T20:45:00Z';
const NOW = Date.parse(NOW_ISO);
let checks = 0;
const failures = [];
function check(name, ok, detail = '') { checks += 1; if (!ok) failures.push(detail ? `${name}: ${detail}` : name); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function throws(fn) { try { fn(); return false; } catch { return true; } }
function importsMarketProfileRegistry(source) {
  return /(?:from\s*['"][^'"]*marketProfileRegistry['"]|import\s*['"][^'"]*marketProfileRegistry['"])/.test(source);
}

try {
  await build({
    stdin: {
      contents: [
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfilePromotionPreflight.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfilePromotionPreflight.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfileReviewPreflight.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/candidates/plKzMarketProfileCandidateInventory.ts'))};`,
        `export { PUBLIC_MARKET_PROFILES } from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileRegistry.ts'))};`,
      ].join('\n'),
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'marketprofile-promotion-preflight-test-entry.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: OUT,
    logLevel: 'silent',
  });
  const m = await import(`${pathToFileURL(OUT).href}?v=${Date.now()}`);
  const inventory = m.createPlKzMarketProfileCandidateInventory(NOW);
  const reviewPreflight = m.createPlKzMarketProfileReviewPreflight(NOW);
  const sources = m.PL_KZ_MARKET_PROFILE_CANDIDATE_SOURCES;
  const promotion = m.createPlKzMarketProfilePromotionPreflight(NOW);
  const byPair = new Map(promotion.entries.map((entry) => [`${entry.exchangeId}:${entry.countryCode}`, entry]));

  check('promotion/1: canonical preflight validates', m.validateMarketProfilePromotionPreflight(promotion, { inventory, reviewPreflight, sources }).ok);
  check('promotion/2: exact review preflight digest bound', promotion.reviewPreflightDigest === reviewPreflight.preflightDigest);
  check('promotion/3: exact review time bound', promotion.reviewPreflightReviewedAt === NOW_ISO);
  check('promotion/4: exact evaluation time', promotion.evaluatedAt === NOW_ISO);
  check('promotion/5: exactly six entries', promotion.entries.length === 6);
  check('promotion/6: ready count hard zero', promotion.readyForSeparateImportCount === 0);
  check('promotion/7: owner receipt count hard zero', promotion.ownerReceiptCount === 0);
  check('promotion/8: digest format', /^fnv1a64:[a-f0-9]{16}$/.test(promotion.preflightDigest));
  const { preflightDigest, ...base } = promotion;
  check('promotion/9: digest recomputes', m.computeMarketProfilePromotionPreflightDigest(base) === preflightDigest);

  const expected = new Map([
    ['binance:PL', 'refresh_required'],
    ['bybit:PL', 'refresh_required'],
    ['okx:PL', 'review_not_ready'],
    ['binance:KZ', 'refresh_required'],
    ['bybit:KZ', 'review_not_ready'],
    ['okx:KZ', 'blocked'],
  ]);
  for (const [pair, state] of expected) {
    const entry = byPair.get(pair);
    check(`${pair}/state`, entry?.state === state, `actual=${entry?.state}`);
    check(`${pair}/owner receipt false`, entry?.ownerReceiptPresent === false);
    check(`${pair}/promotion ready false`, entry?.promotionReady === false);
    check(`${pair}/separate import false`, entry?.readyForSeparateImport === false);
    check(`${pair}/import false`, entry?.importAllowed === false);
    check(`${pair}/registry false`, entry?.registryMutation === false);
    check(`${pair}/public false`, entry?.publicAuthority === false);
    check(`${pair}/source ceiling incomplete`, entry?.sourceAuthorizationComplete === false);
  }

  check('summary/1: exactly two review_not_ready', promotion.entries.filter((x) => x.state === 'review_not_ready').length === 2);
  check('summary/2: exactly three refresh_required', promotion.entries.filter((x) => x.state === 'refresh_required').length === 3);
  check('summary/3: exactly one blocked', promotion.entries.filter((x) => x.state === 'blocked').length === 1);
  check('summary/4: zero invalid canonical entries', promotion.entries.every((x) => x.state !== 'invalid'));
  check('summary/5: zero promotion-ready entries', promotion.entries.every((x) => x.promotionReady === false));
  check('summary/6: zero ready-for-import entries', promotion.entries.every((x) => x.readyForSeparateImport === false));
  check('summary/7: every source ceiling incomplete', promotion.entries.every((x) => x.sourceAuthorizationComplete === false));

  for (const pair of ['okx:PL', 'bybit:KZ']) {
    const entry = byPair.get(pair);
    const reviewEntry = reviewPreflight.entries.find((x) => `${x.exchangeId}:${x.countryCode}` === pair);
    check(`${pair}/review digest exact`, entry.reviewDigest === reviewEntry.reviewDigest && entry.reviewDigest !== null);
    check(`${pair}/system review remains needs_research`, reviewEntry.reviewPacket?.decision === 'needs_research');
    check(`${pair}/system reviewer not owner`, reviewEntry.reviewPacket?.reviewerId === 'system:owner-loop-preflight' && reviewEntry.reviewPacket?.reviewerId !== 'owner');
    check(`${pair}/reason not ready`, entry.reasons.includes('REVIEW_DECISION_NOT_READY_FOR_PROMOTION'));
    check(`${pair}/reason no receipt`, entry.reasons.includes('OWNER_PROMOTION_RECEIPT_NOT_PRESENT_BY_DESIGN'));
    check(`${pair}/reason source ceiling`, entry.reasons.includes('SOURCE_AUTHORIZATION_CEILING_INCOMPLETE'));
  }

  check('stale/1: stale rows have no review digest', ['binance:PL','bybit:PL','binance:KZ'].every((pair) => byPair.get(pair)?.reviewDigest === null));
  check('blocked/1: OKX KZ has no review digest', byPair.get('okx:KZ')?.reviewDigest === null);
  check('blocked/2: OKX KZ retains blocked reason', byPair.get('okx:KZ')?.reasons.includes('REVIEW_PREFLIGHT_BLOCKED'));

  check('clock/1: wrapper rejects NaN', throws(() => m.createPlKzMarketProfilePromotionPreflight(Number.NaN)));
  check('clock/2: earlier evaluatedAt than review rejected', throws(() => m.buildMarketProfilePromotionPreflight({ preflightId: 'past', inventory, reviewPreflight, sources, evaluatedAt: '2026-08-09T20:44:59Z' })));
  check('clock/3: malformed evaluatedAt rejected', throws(() => m.buildMarketProfilePromotionPreflight({ preflightId: 'bad', inventory, reviewPreflight, sources, evaluatedAt: '2026-08-09' })));
  check('clock/4: same input deterministic', m.createPlKzMarketProfilePromotionPreflight(NOW).preflightDigest === promotion.preflightDigest);

  const reviewDecisionTamper = clone(reviewPreflight);
  const reviewReady = reviewDecisionTamper.entries.find((x) => x.reviewPacket);
  reviewReady.reviewPacket.decision = 'ready_for_promotion_review';
  check('mut/1: forged ready review makes build reject preflight', throws(() => m.buildMarketProfilePromotionPreflight({ preflightId: 'forged', inventory, reviewPreflight: reviewDecisionTamper, sources, evaluatedAt: NOW_ISO })));

  const reviewerTamper = clone(reviewPreflight);
  reviewerTamper.entries.find((x) => x.reviewPacket).reviewPacket.reviewerId = 'owner';
  check('mut/2: owner impersonation makes build reject preflight', throws(() => m.buildMarketProfilePromotionPreflight({ preflightId: 'owner', inventory, reviewPreflight: reviewerTamper, sources, evaluatedAt: NOW_ISO })));

  const sourceTamper = clone(sources);
  sourceTamper[2].candidate.source.taskId = 'CBW-TAMPERED-001';
  check('mut/3: source identity tamper rejected', throws(() => m.buildMarketProfilePromotionPreflight({ preflightId: 'source', inventory, reviewPreflight, sources: sourceTamper, evaluatedAt: NOW_ISO })));

  const candidateTamper = clone(sources);
  candidateTamper[4].candidate.candidateDigest = 'fnv1a64:0000000000000000';
  check('mut/4: candidate digest tamper rejected', throws(() => m.buildMarketProfilePromotionPreflight({ preflightId: 'candidate', inventory, reviewPreflight, sources: candidateTamper, evaluatedAt: NOW_ISO })));

  const outputReadyTamper = clone(promotion);
  outputReadyTamper.entries[2].promotionReady = true;
  check('mut/5: output promotion-ready leak invalid', !m.validateMarketProfilePromotionPreflight(outputReadyTamper, { inventory, reviewPreflight, sources }).ok);

  const outputReceiptTamper = clone(promotion);
  outputReceiptTamper.entries[2].ownerReceiptPresent = true;
  outputReceiptTamper.ownerReceiptCount = 1;
  check('mut/6: owner-receipt injection invalid', !m.validateMarketProfilePromotionPreflight(outputReceiptTamper, { inventory, reviewPreflight, sources }).ok);

  const extraReceipt = clone(promotion);
  extraReceipt.ownerReceipt = { issuer: 'owner', decision: 'approved' };
  check('mut/7: extra owner receipt object invalid via deterministic recompute', !m.validateMarketProfilePromotionPreflight(extraReceipt, { inventory, reviewPreflight, sources }).ok);

  const outputDigestTamper = clone(promotion);
  outputDigestTamper.preflightDigest = 'fnv1a64:0000000000000000';
  check('mut/8: preflight digest tamper invalid', !m.validateMarketProfilePromotionPreflight(outputDigestTamper, { inventory, reviewPreflight, sources }).ok);

  const reviewDigestTamper = clone(promotion);
  reviewDigestTamper.entries[2].reviewDigest = 'fnv1a64:0000000000000000';
  check('mut/9: review digest output tamper invalid', !m.validateMarketProfilePromotionPreflight(reviewDigestTamper, { inventory, reviewPreflight, sources }).ok);

  const sourceCeilingTamper = clone(sources);
  for (const key of Object.keys(sourceCeilingTamper[2].candidate.source.authorizations)) sourceCeilingTamper[2].candidate.source.authorizations[key] = true;
  check('mut/10: source authority mutation cannot silently produce ready', throws(() => m.buildMarketProfilePromotionPreflight({ preflightId: 'auth', inventory, reviewPreflight, sources: sourceCeilingTamper, evaluatedAt: NOW_ISO })));

  check('api/1: promotion preflight source contains no receipt input type', !/receipt\s*:\s*MarketProfilePromotionReceipt|ownerReceipt\s*:\s*/.test(readFileSync(join(ROOT, 'src/data/contracts/marketProfilePromotionPreflight.ts'), 'utf8')));
  check('api/2: real data module contains no owner receipt literal', !/MARKETPROFILE_SEPARATE_IMPORT_REVIEW|receiptId|issuer:\s*['"]owner['"]/.test(readFileSync(join(ROOT, 'src/data/candidates/plKzMarketProfilePromotionPreflight.ts'), 'utf8')));

  check('public/1: PUBLIC_MARKET_PROFILES frozen empty', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);
  const contractSource = readFileSync(join(ROOT, 'src/data/contracts/marketProfilePromotionPreflight.ts'), 'utf8');
  const dataSource = readFileSync(join(ROOT, 'src/data/candidates/plKzMarketProfilePromotionPreflight.ts'), 'utf8');
  check('public/2: contract never imports registry', !importsMarketProfileRegistry(contractSource));
  check('public/3: data module never imports registry', !importsMarketProfileRegistry(dataSource));
  check('public/4: no import executor', !/performImport|executeImport|mutateRegistry|registry\.push/i.test(`${contractSource}\n${dataSource}`));

  if (failures.length) {
    console.error(`CBW MARKETPROFILE PROMOTION PREFLIGHT: FAIL (${failures.length}/${checks})`);
    for (const f of failures) console.error(` - ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`CBW MARKETPROFILE PROMOTION PREFLIGHT: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW MARKETPROFILE PROMOTION PREFLIGHT: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
